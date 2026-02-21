import { z } from "zod";

export const ChatMessageSchema = z.object({
    role: z.string().min(1),
    content: z.string().min(1),
});

export const ChatRequestSchema = z.object({
    userId: z.string().min(1),
    messages: z.array(ChatMessageSchema).min(1),
});

export const ProcessFileRequestSchema = z.object({
    filePath: z.string().min(1),
    fileName: z.string().min(1),
    userId: z.string().min(1),
});

export const EvaluationCaseSchema = z.object({
    question: z.string().min(1),
    expectedKeywords: z.array(z.string()).default([]),
});

export const EvaluateRequestSchema = z.object({
    userId: z.string().min(1),
    cases: z.array(EvaluationCaseSchema).min(1),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ProcessFileRequest = z.infer<typeof ProcessFileRequestSchema>;
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
