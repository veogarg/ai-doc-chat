export const APP_NAME = "DocuMind";

export const APP_CONFIG = {
    CHUNK_SIZE: 1100,
    MIN_CHUNK_SIZE: 360,
    CHUNK_OVERLAP: 140,
    MAX_MATCH_COUNT: 20,
    MAX_RERANKED_MATCH_COUNT: 8,
    MAX_MATCHES_PER_DOCUMENT: 3,
    CACHE_TTL_EMBEDDING_MS: 1000 * 60 * 60,
    CACHE_TTL_RETRIEVAL_MS: 1000 * 60 * 10,
    CACHE_TTL_RESPONSE_MS: 1000 * 60 * 10,
    DEFAULT_CHAT_TITLE: "New Chat",
    GEMINI_EMBEDDING_MODEL: "gemini-embedding-001",
    GEMINI_CHAT_MODEL: "gemini-flash-latest",
    RETRY_MAX_ATTEMPTS: 3,
} as const;

export const STORAGE_BUCKETS = {
    USER_FILES: "user-files",
} as const;

export const DATABASE_TABLES = {
    CHAT_SESSIONS: "chat_sessions",
    MESSAGES: "messages",
    USER_DOCUMENTS: "user_documents",
    DOCUMENT_CHUNKS: "document_chunks",
} as const;
