export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/ai/gemini.client";
import { chunkDocument } from "@/lib/utils/chunk";
import {
    embeddingCache,
    userScopedCacheKey,
    hashText,
    invalidateUserAICaches,
} from "@/lib/ai/cache";
import {
    createMetricsContext,
    logAndPersistMetrics,
    measureStage,
    estimateTokens,
    addTokenUsage,
    type MetricsContext,
} from "@/lib/ai/monitoring";
import { withRetry } from "@/lib/ai/retry";
import { APP_CONFIG, DATABASE_TABLES, STORAGE_BUCKETS } from "@/lib/constants/config";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ProcessFileRequestSchema } from "@/lib/api/schemas";
import { internalErrorResponse, validationErrorResponse } from "@/lib/api/responses";
import path from "path";
import { PDFParse } from "pdf-parse";

// Set worker source for pdf-parse
PDFParse.setWorker(
    path.resolve("./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
);

const supabase = createServiceRoleClient();

export async function POST(req: NextRequest) {
    let userId = "";
    let fileName = "";
    let metrics: MetricsContext | undefined;

    try {
        const payload = await req.json();
        const parsed = ProcessFileRequestSchema.safeParse(payload);
        if (!parsed.success) {
            return validationErrorResponse(parsed.error);
        }

        const { filePath, fileName: parsedFileName, userId: parsedUserId } = parsed.data;
        fileName = parsedFileName;
        userId = parsedUserId;
        metrics = createMetricsContext("/api/process-file", userId);

        console.log("Downloading file:", filePath);
        const { data, error } = await measureStage(metrics, "download_file", () =>
            withRetry(
                () =>
                    supabase.storage
                        .from(STORAGE_BUCKETS.USER_FILES)
                        .download(filePath),
                {
                    maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS,
                }
            )
        );

        if (error || !data) {
            console.error("Download error:", error);
            return NextResponse.json(
                {
                    error: error?.message || "Failed to download file",
                    details: error,
                },
                { status: 500 }
            );
        }

        const buffer = Buffer.from(
            await measureStage(metrics, "read_array_buffer", () => data.arrayBuffer())
        );

        const parser = new PDFParse({ data: buffer });
        const docData = await measureStage(metrics, "parse_pdf", () =>
            withRetry(() => parser.getText(), { maxAttempts: 2 })
        );
        const text = docData.text;

        const segments = await measureStage(metrics, "chunk_document", async () =>
            chunkDocument(text, {
                maxChars: APP_CONFIG.CHUNK_SIZE,
                minChars: APP_CONFIG.MIN_CHUNK_SIZE,
                overlapChars: APP_CONFIG.CHUNK_OVERLAP,
            })
        );

        const embeddingModel = genAI.getGenerativeModel({
            model: APP_CONFIG.GEMINI_EMBEDDING_MODEL,
        });

        await measureStage(metrics, "delete_existing_file_chunks", async () => {
            const { error: deleteError } = await supabase
                .from(DATABASE_TABLES.DOCUMENT_CHUNKS)
                .delete()
                .eq("user_id", userId)
                .eq("file_name", fileName);

            if (deleteError) {
                throw deleteError;
            }
        });

        const rows: Array<{
            user_id: string;
            file_name: string;
            content: string;
            embedding: number[];
        }> = [];

        for (const segment of segments) {
            const cacheKey = userScopedCacheKey(
                userId,
                `file_chunk:${hashText(segment.content)}`
            );

            let embedding = embeddingCache.get(cacheKey);

            if (!embedding) {
                const result = await measureStage(metrics, "embed_chunk", () =>
                    withRetry(() => embeddingModel.embedContent(segment.content), {
                        maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS,
                    })
                );

                embedding = result.embedding.values;
                embeddingCache.set(cacheKey, embedding, APP_CONFIG.CACHE_TTL_EMBEDDING_MS);
            }

            addTokenUsage(metrics, {
                embeddingTokens: estimateTokens(segment.content),
            });

            rows.push({
                user_id: userId,
                file_name: fileName,
                content: `[Section: ${segment.heading}]\n${segment.content}`,
                embedding,
            });
        }

        await measureStage(metrics, "insert_chunk_rows", async () => {
            const batchSize = 50;

            for (let index = 0; index < rows.length; index += batchSize) {
                const batch = rows.slice(index, index + batchSize);
                const insertResult = await withRetry(
                    async () => await supabase.from(DATABASE_TABLES.DOCUMENT_CHUNKS).insert(batch),
                    { maxAttempts: APP_CONFIG.RETRY_MAX_ATTEMPTS }
                );

                if (insertResult.error) {
                    throw insertResult.error;
                }
            }
        });

        invalidateUserAICaches(userId);

        await logAndPersistMetrics(supabase, metrics, "document_processed", {
            fileName,
            chunksProcessed: segments.length,
        });

        return NextResponse.json({
            success: true,
            chunksProcessed: segments.length
        });
    } catch (error) {
        console.error("Processing error:", error);

        if (metrics) {
            await logAndPersistMetrics(supabase, metrics, "document_process_error", {
                fileName,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return internalErrorResponse("Processing failed", error);
    }
}
