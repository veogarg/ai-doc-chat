import type { SupabaseClient } from "@supabase/supabase-js";

export interface StageMetric {
    stage: string;
    durationMs: number;
    metadata?: Record<string, unknown>;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    embeddingTokens: number;
    estimatedCostUsd: number;
}

export interface MetricsContext {
    requestId: string;
    route: string;
    userId?: string;
    startedAtMs: number;
    startedAtIso: string;
    stages: StageMetric[];
    usage: TokenUsage;
}

let warnedObservabilityMissing = false;

function envNumber(name: string): number {
    const raw = process.env[name];
    if (!raw) {
        return 0;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
}

const INPUT_COST_PER_1K = envNumber("GEMINI_INPUT_COST_PER_1K_TOKENS");
const OUTPUT_COST_PER_1K = envNumber("GEMINI_OUTPUT_COST_PER_1K_TOKENS");
const EMBEDDING_COST_PER_1K = envNumber("GEMINI_EMBEDDING_COST_PER_1K_TOKENS");

export function estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
}

export function createMetricsContext(route: string, userId?: string): MetricsContext {
    return {
        requestId: crypto.randomUUID(),
        route,
        userId,
        startedAtMs: Date.now(),
        startedAtIso: new Date().toISOString(),
        stages: [],
        usage: {
            promptTokens: 0,
            completionTokens: 0,
            embeddingTokens: 0,
            estimatedCostUsd: 0,
        },
    };
}

export function addTokenUsage(
    context: MetricsContext,
    usage: Partial<Omit<TokenUsage, "estimatedCostUsd">>
): void {
    context.usage.promptTokens += usage.promptTokens ?? 0;
    context.usage.completionTokens += usage.completionTokens ?? 0;
    context.usage.embeddingTokens += usage.embeddingTokens ?? 0;

    context.usage.estimatedCostUsd =
        (context.usage.promptTokens / 1000) * INPUT_COST_PER_1K +
        (context.usage.completionTokens / 1000) * OUTPUT_COST_PER_1K +
        (context.usage.embeddingTokens / 1000) * EMBEDDING_COST_PER_1K;
}

export async function measureStage<T>(
    context: MetricsContext,
    stage: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
): Promise<T> {
    const started = performance.now();
    try {
        const result = await fn();
        context.stages.push({
            stage,
            durationMs: Number((performance.now() - started).toFixed(2)),
            metadata,
        });
        return result;
    } catch (error) {
        context.stages.push({
            stage,
            durationMs: Number((performance.now() - started).toFixed(2)),
            metadata: {
                ...(metadata ?? {}),
                status: "error",
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
}

function finalize(context: MetricsContext) {
    return {
        requestId: context.requestId,
        route: context.route,
        userId: context.userId,
        startedAtIso: context.startedAtIso,
        finishedAtIso: new Date().toISOString(),
        totalMs: Date.now() - context.startedAtMs,
        stages: context.stages,
        usage: context.usage,
    };
}

export async function logAndPersistMetrics(
    supabase: SupabaseClient,
    context: MetricsContext,
    eventType: string,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    const summary = finalize(context);

    console.info("[ai-metrics]", {
        eventType,
        requestId: summary.requestId,
        route: summary.route,
        totalMs: summary.totalMs,
        stages: summary.stages,
        usage: summary.usage,
        metadata,
    });

    const { error } = await supabase.from("ai_observability_events").insert({
        request_id: summary.requestId,
        route: summary.route,
        user_id: summary.userId,
        event_type: eventType,
        total_ms: summary.totalMs,
        stage_metrics: summary.stages,
        token_usage: summary.usage,
        metadata,
    });

    if (error && !warnedObservabilityMissing) {
        warnedObservabilityMissing = true;
        console.warn(
            "Observability persistence unavailable. Run Supabase migration for ai_observability_events.",
            error.message
        );
    }
}
