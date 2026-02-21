export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitter?: boolean;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, waitMs: number) => void;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusFromError(error: unknown): number | null {
    if (!error || typeof error !== "object") {
        return null;
    }

    const record = error as Record<string, unknown>;
    const statusCandidates = [record.status, record.statusCode, record.code];

    for (const candidate of statusCandidates) {
        if (typeof candidate === "number" && Number.isFinite(candidate)) {
            return candidate;
        }
    }

    return null;
}

export function defaultShouldRetry(error: unknown): boolean {
    const status = statusFromError(error);
    if (status !== null) {
        if (status === 408 || status === 409 || status === 425 || status === 429) {
            return true;
        }

        if (status >= 500) {
            return true;
        }
    }

    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return (
        message.includes("timeout") ||
        message.includes("timed out") ||
        message.includes("network") ||
        message.includes("rate") ||
        message.includes("unavailable") ||
        message.includes("connection") ||
        message.includes("fetch failed")
    );
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        baseDelayMs = 200,
        maxDelayMs = 3000,
        jitter = true,
        shouldRetry = defaultShouldRetry,
        onRetry,
    } = options;

    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
        attempt += 1;

        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
                throw error;
            }

            const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
            const waitMs = jitter
                ? Math.round(exponential * (0.8 + Math.random() * 0.4))
                : exponential;

            onRetry?.(error, attempt, waitMs);
            await sleep(waitMs);
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error("Retry failed after maximum attempts");
}
