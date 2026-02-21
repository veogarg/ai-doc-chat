import { createHash } from "crypto";

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class TTLCache<T> {
    private readonly store = new Map<string, CacheEntry<T>>();

    constructor(private readonly maxSize: number) {}

    get(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value;
    }

    set(key: string, value: T, ttlMs: number): void {
        if (this.store.size >= this.maxSize) {
            const first = this.store.keys().next().value;
            if (first) {
                this.store.delete(first);
            }
        }

        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    clearPrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
}

type CacheBundle = {
    embedding: TTLCache<number[]>;
    retrieval: TTLCache<unknown>;
    response: TTLCache<string>;
};

declare global {
    var __docuMindAICache: CacheBundle | undefined;
}

const bundle =
    globalThis.__docuMindAICache ??
    (globalThis.__docuMindAICache = {
        embedding: new TTLCache<number[]>(1500),
        retrieval: new TTLCache<unknown>(1500),
        response: new TTLCache<string>(1000),
    });

export const embeddingCache = bundle.embedding;
export const retrievalCache = bundle.retrieval;
export const responseCache = bundle.response;

export function hashText(text: string): string {
    return createHash("sha256").update(text).digest("hex");
}

export function userScopedCacheKey(userId: string, raw: string): string {
    return `${userId}:${hashText(raw)}`;
}

export function invalidateUserAICaches(userId: string): void {
    const prefix = `${userId}:`;
    embeddingCache.clearPrefix(prefix);
    retrievalCache.clearPrefix(prefix);
    responseCache.clearPrefix(prefix);
}
