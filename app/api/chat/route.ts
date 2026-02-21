export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
    prepareRAG,
    streamFromPrompt,
    generateFromPrompt,
    getCachedResponse,
    setCachedResponse,
    type ChatLikeMessage,
} from "@/lib/ai/rag";
import {
    createMetricsContext,
    logAndPersistMetrics,
} from "@/lib/ai/monitoring";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ChatRequestSchema } from "@/lib/api/schemas";
import { internalErrorResponse, validationErrorResponse } from "@/lib/api/responses";

const supabase = createServiceRoleClient();

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    const url = new URL(req.url);
    const stream = url.searchParams.get("stream") !== "false";

    try {
        const payload = await req.json();
        const parsed = ChatRequestSchema.safeParse(payload);
        if (!parsed.success) {
            return validationErrorResponse(parsed.error);
        }

        const { messages, userId } = parsed.data;
        const chatMessages: ChatLikeMessage[] = messages;
        const metrics = createMetricsContext("/api/chat", userId);
        const prepared = await prepareRAG(supabase, chatMessages, userId, metrics);

        const cachedResponse = getCachedResponse(prepared.responseCacheKey);
        if (cachedResponse) {
            await logAndPersistMetrics(supabase, metrics, "chat_cached_response", {
                query: prepared.query,
                cache: prepared.cacheStats,
                sources: prepared.sources,
            });

            if (!stream) {
                return NextResponse.json({ reply: cachedResponse, cached: true });
            }

            return new NextResponse(cachedResponse, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Cache": "HIT",
                    "X-Request-Id": metrics.requestId,
                },
            });
        }

        if (!stream) {
            const reply = await generateFromPrompt(prepared.prompt, metrics);
            setCachedResponse(prepared.responseCacheKey, reply);

            await logAndPersistMetrics(supabase, metrics, "chat_complete", {
                query: prepared.query,
                cache: prepared.cacheStats,
                sources: prepared.sources,
            });

            return NextResponse.json({ reply, cached: false });
        }

        const streamBody = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    const reply = await streamFromPrompt(
                        prepared.prompt,
                        (chunk) => {
                            controller.enqueue(encoder.encode(chunk));
                        },
                        metrics
                    );

                    setCachedResponse(prepared.responseCacheKey, reply);

                    await logAndPersistMetrics(supabase, metrics, "chat_stream_complete", {
                        query: prepared.query,
                        cache: prepared.cacheStats,
                        sources: prepared.sources,
                    });

                    controller.close();
                } catch (error) {
                    await logAndPersistMetrics(supabase, metrics, "chat_stream_error", {
                        query: prepared.query,
                        error: error instanceof Error ? error.message : String(error),
                    });

                    controller.error(error);
                }
            },
        });

        return new NextResponse(streamBody, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Cache": "MISS",
                "X-Request-Id": metrics.requestId,
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return internalErrorResponse("AI failed to generate response", error);
    }
}
