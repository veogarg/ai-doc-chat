export const APP_NAME = "DocuMind";

export const APP_CONFIG = {
    CHUNK_SIZE: 800,
    MAX_MATCH_COUNT: 5,
    DEFAULT_CHAT_TITLE: "New Chat",
    GEMINI_EMBEDDING_MODEL: "gemini-embedding-001",
    GEMINI_CHAT_MODEL: "gemini-flash-latest",
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
