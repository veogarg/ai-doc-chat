import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "@/lib/constants/config";
import { genAI } from "@/lib/ai/gemini.client";
import { withRetry } from "@/lib/ai/retry";
import {
    addTokenUsage,
    estimateTokens,
    measureStage,
    type MetricsContext,
} from "@/lib/ai/monitoring";
import {
    embeddingCache,
    retrievalCache,
    responseCache,
    userScopedCacheKey,
    hashText,
} from "@/lib/ai/cache";
import { rerankChunks, type RetrievedChunk, type RankedChunk } from "@/lib/ai/rerank";
import { buildCrossDocumentContext } from "@/lib/ai/cross-document";

interface MatchChunkV2Row {
    id?: string;
    content: string;
    similarity: number;
    file_name?: string | null;
}

interface MatchChunkLegacyRow {
    content: string;
    similarity: number;
    file_name?: string | null;
}

export interface ChatLikeMessage {
    role: string;
    content: string;
}

export interface PreparedRAG {
    query: string;
    prompt: string;
    responseCacheKey: string;
    rankedChunks: RankedChunk[];
    sources: string[];
    cacheStats: {
        embeddingHit: boolean;
        retrievalHit: boolean;
        responseHit: boolean;
    };
}

function normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, " ");
}

async function fetchCandidates(
    supabase: SupabaseClient,
    queryEmbedding: number[],
    userId: string,
    matchCount = APP_CONFIG.MAX_MATCH_COUNT
): Promise<RetrievedChunk[]> {
    const v2 = await supabase.rpc("match_chunks_v2", {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        user_id: userId,
    });

    if (!v2.error && Array.isArray(v2.data) && v2.data.length > 0) {
        return (v2.data as MatchChunkV2Row[]).map((row) => ({
            id: row.id,
            content: row.content,
            similarity: row.similarity,
            file_name: row.file_name,
        }));
    }

    const legacy = await supabase.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        user_id: userId,
    });

    if (legacy.error) {
        throw legacy.error;
    }

    const rows = Array.isArray(legacy.data)
        ? (legacy.data as MatchChunkLegacyRow[])
        : [];

    return rows.map((row, index) => ({
        id: String(index + 1),
        content: row.content,
        similarity: row.similarity,
        file_name: row.file_name ?? "Unknown document",
    }));
}

function buildPrompt(
    messages: ChatLikeMessage[],
    contextText: string,
    synthesisNotes: string
): string {
    const conversation = messages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n");

    return `
You are a professional and versatile document analyst assistant.

Use the retrieved context and conversation to answer the user's questions accurately and comprehensively.

Rules:
- Format your response using clear structure (e.g., paragraphs, lists) but return plain text unless formatting is requested.
- Rely solely on the provided document context. Do not invent facts or include information not supported by the context.
- If the context is insufficient to answer the question, explicitly state that the information is missing from the provided documents.
- If multiple documents are involved, clearly synthesize agreements, differences, and relationships between the documents.
- End your response with a single line: Sources: <comma separated list of referenced file names>

Focus on extracting key information, summarizing complex topics, and directly addressing the user's inquiries based on the uploaded documents, regardless of their type (e.g., reports, contracts, manuals, research papers, resumes).

CROSS-DOCUMENT SYNTHESIS NOTES:
${synthesisNotes}

DOCUMENT CONTEXT:
${contextText}

CONVERSATION:
${conversation}
`.trim();
}

export async function prepareRAG(
    supabase: SupabaseClient,
    messages: ChatLikeMessage[],
    userId: string,
    metrics: MetricsContext
): Promise<PreparedRAG> {
    const lastMessage = messages[messages.length - 1]?.content ?? "";
    const query = lastMessage.trim();

    if (!query) {
        throw new Error("Question is required");
    }

    const normalized = normalizeQuery(query);
    const embeddingCacheKey = userScopedCacheKey(userId, `embedding:${normalized}`);
    const retrievalCacheKey = userScopedCacheKey(userId, `retrieval:${normalized}`);

    let embeddingHit = false;
    let retrievalHit = false;

    let queryEmbedding = embeddingCache.get(embeddingCacheKey);

    if (!queryEmbedding) {
        const embeddingModel = genAI.getGenerativeModel({
            model: APP_CONFIG.GEMINI_EMBEDDING_MODEL,
        });

        const embeddingResult = await measureStage(metrics, "embed_query", () =>
            withRetry(() => embeddingModel.embedContent(query), {
                maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS,
            })
        );

        queryEmbedding = embeddingResult.embedding.values;
        embeddingCache.set(
            embeddingCacheKey,
            queryEmbedding,
            APP_CONFIG.CACHE_TTL_EMBEDDING_MS
        );
    } else {
        embeddingHit = true;
    }

    addTokenUsage(metrics, {
        embeddingTokens: estimateTokens(query),
    });

    let candidates = retrievalCache.get(retrievalCacheKey) as RetrievedChunk[] | undefined;

    if (!candidates) {
        candidates = await measureStage(metrics, "retrieve_candidates", () =>
            withRetry(() => fetchCandidates(supabase, queryEmbedding, userId), {
                maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS,
            })
        );

        retrievalCache.set(
            retrievalCacheKey,
            candidates,
            APP_CONFIG.CACHE_TTL_RETRIEVAL_MS
        );
    } else {
        retrievalHit = true;
    }

    const rankedChunks = await measureStage(metrics, "rerank_chunks", async () =>
        rerankChunks(query, candidates ?? [], {
            topK: APP_CONFIG.MAX_RERANKED_MATCH_COUNT,
            maxPerDocument: APP_CONFIG.MAX_MATCHES_PER_DOCUMENT,
        })
    );

    const crossDocument = buildCrossDocumentContext(rankedChunks);
    const prompt = buildPrompt(messages, crossDocument.contextText, crossDocument.synthesisNotes);
    const responseCacheKey = userScopedCacheKey(userId, `response:${hashText(prompt)}`);

    addTokenUsage(metrics, {
        promptTokens: estimateTokens(prompt),
    });

    return {
        query,
        prompt,
        responseCacheKey,
        rankedChunks,
        sources: crossDocument.sources,
        cacheStats: {
            embeddingHit,
            retrievalHit,
            responseHit: Boolean(responseCache.get(responseCacheKey)),
        },
    };
}

export async function generateFromPrompt(
    prompt: string,
    metrics: MetricsContext
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: APP_CONFIG.GEMINI_CHAT_MODEL,
        generationConfig: {
            temperature: 0.7,
        }
    });

    const result = await measureStage(metrics, "generate_response", () =>
        withRetry(() => model.generateContent(prompt), {
            maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS,
        })
    );

    const text = result.response.text();
    addTokenUsage(metrics, {
        completionTokens: estimateTokens(text),
    });

    return text;
}

export async function streamFromPrompt(
    prompt: string,
    onChunk: (value: string) => void,
    metrics: MetricsContext
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: APP_CONFIG.GEMINI_CHAT_MODEL,
    });

    const streamResult = await measureStage(metrics, "generate_stream", () =>
        withRetry(() => model.generateContentStream(prompt), {
            maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS,
        })
    );

    let fullText = "";

    for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (!text) {
            continue;
        }

        fullText += text;
        onChunk(text);
    }

    addTokenUsage(metrics, {
        completionTokens: estimateTokens(fullText),
    });

    return fullText;
}

export function getCachedResponse(cacheKey: string): string | undefined {
    return responseCache.get(cacheKey);
}

export function setCachedResponse(cacheKey: string, value: string): void {
    responseCache.set(cacheKey, value, APP_CONFIG.CACHE_TTL_RESPONSE_MS);
}
