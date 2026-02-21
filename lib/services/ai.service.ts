import type { ChatMessage } from "@/lib/types/chat.types";

export interface AIServiceConfig {
    messages: ChatMessage[];
    userId: string;
}

export interface AIResponse {
    reply: string;
}

export class AIService {
    async generateResponse(config: AIServiceConfig, stream = false): Promise<string> {
        const endpoint = stream ? "/api/chat?stream=true" : "/api/chat?stream=false";
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: config.messages,
                userId: config.userId,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to generate AI response");
        }

        const data: AIResponse = await response.json();
        return data.reply;
    }

    async generateResponseStream(
        config: AIServiceConfig,
        onChunk: (chunk: string, aggregate: string) => void
    ): Promise<string> {
        const response = await fetch("/api/chat?stream=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: config.messages,
                userId: config.userId,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to generate AI response");
        }

        if (!response.body) {
            const fallback = (await response.json()) as AIResponse;
            const reply = fallback.reply ?? "";
            onChunk(reply, reply);
            return reply;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aggregate = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            if (!chunk) {
                continue;
            }

            aggregate += chunk;
            onChunk(chunk, aggregate);
        }

        aggregate += decoder.decode();
        return aggregate;
    }

    async processDocument(filePath: string, fileName: string, userId: string): Promise<void> {
        const response = await fetch("/api/process-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filePath,
                fileName,
                userId,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to process document");
        }
    }
}

// Singleton instance
export const aiService = new AIService();
