import { genAI } from "./gemini.client";
import { generateEmbedding } from "./embeddings";
import { APP_CONFIG } from "@/lib/constants/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RAGContext {
    content: string;
    similarity?: number;
}

/**
 * Retrieves relevant document chunks using RAG
 * @param query - The user's query
 * @param userId - The user's ID
 * @param matchCount - Number of matches to return
 * @returns Array of relevant document chunks
 */
export async function retrieveRelevantChunks(
    query: string,
    userId: string,
    matchCount = APP_CONFIG.MAX_MATCH_COUNT
): Promise<RAGContext[]> {
    const queryEmbedding = await generateEmbedding(query);

    const { data: docs } = await supabase.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        user_id: userId,
    });

    return docs || [];
}

/**
 * Generates AI response using RAG context
 * @param messages - Conversation messages
 * @param context - Retrieved document context
 * @returns AI generated response
 */
export async function generateRAGResponse(
    messages: Array<{ role: string; content: string }>,
    context: string
): Promise<string> {
    const conversation = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

    const prompt = buildRAGPrompt(context, conversation);

    const model = genAI.getGenerativeModel({
        model: APP_CONFIG.GEMINI_CHAT_MODEL,
        generationConfig: {
            temperature: 0.7
        }
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Builds the RAG prompt with context and conversation
 */
function buildRAGPrompt(context: string, conversation: string): string {
    return `
You are a professional resume analyst and career assistant.

Use the DOCUMENT CONTEXT and CONVERSATION to generate a clear, natural, and human-like response.

Rules:
    - Use plain text
    - Do not use markdown symbols
    - Do not use placeholders
    - Always extract real information from the resume

Formatting behavior:
    - If the user asks for a professional summary, provide:
        - A 3–4 sentence summary
        - A list of key skills
        - 2–4 strong experience highlights
    - For all other questions, respond naturally without forcing a rigid structure.

DOCUMENT CONTEXT:
${context}

CONVERSATION:
${conversation}
  `.trim();
}