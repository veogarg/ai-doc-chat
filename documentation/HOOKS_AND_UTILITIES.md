# Hooks and Utilities Reference

## Custom Hooks

### `useAuth` - `hooks/useAuth.ts`
Purpose: auth actions + auth loading state.

Returns:
- `user`
- `loading`
- `signIn(email, password)`
- `signUp(email, password)`
- `signOut()`
- `isAuthenticated`

### `useUser` - `hooks/useUser.ts`
Purpose: read user state from `UserContext`.

Returns:
- `user`
- `loading`
- `reload()`

### `useChatSessions(userId?)` - `hooks/useChatSessions.ts`
Purpose: session list lifecycle and mutations.

Returns:
- `sessions`
- `loading`
- `error`
- `reload()`
- `createSession(userId, title?)`
- `updateSessionTitle(sessionId, title)`

### `useChatMessages(sessionId)` - `hooks/useChatMessages.ts`
Purpose: message list for one session with optimistic insert.

Returns:
- `messages`
- `loading`
- `error`
- `reload()`
- `addMessage(role, content)`
- `addOptimisticMessage(role, content)`
- `setMessages(...)`

### `useDocuments()` - `hooks/useDocuments.ts`
Purpose: read/write document list from `DocumentsContext`.

Returns:
- `documents`
- `loading`
- `error`
- `reload()`
- `addDocument(document)`
- `removeDocument(documentId)`

### `useFileUpload()` - `hooks/useFileUpload.ts`
Purpose: upload + processing orchestration.

Returns:
- `status` (`uploading`, `processing`, `message`, `error`)
- `uploadFile(file, userId)`
- `reset()`
- `isUploading`

### `useAutoScroll(trigger)` - `hooks/useAutoScroll.ts`
Purpose: auto-scroll to bottom when trigger changes.

Usage:
```tsx
const bottomRef = useAutoScroll<HTMLDivElement>(messages);
```

## Contexts

### `UserContext` - `contexts/UserContext.tsx`
Provides global user state and `refreshUser`.

### `DocumentsContext` - `contexts/DocumentsContext.tsx`
Provides global documents state and mutation helpers.

### `ChatSessionContext` - `contexts/ChatSessionContext.tsx`
Provides `updateSessionTitle` to descendants.

## Services

### `authService` - `lib/services/auth.service.ts`
Auth CRUD against Supabase Auth.

### `chatService` - `lib/services/chat.service.ts`
Session and message DB operations.

### `documentService` - `lib/services/document.service.ts`
Storage upload/download and `user_documents` persistence.

### `aiService` - `lib/services/ai.service.ts`
Client-to-server AI API wrapper.

Methods:
- `generateResponse(config, stream?)`
- `generateResponseStream(config, onChunk)`
- `processDocument(filePath, fileName, userId)`

## AI Core Modules

### `lib/ai/rag.ts`
Main server-side RAG orchestration.

Primary exports:
- `prepareRAG(supabase, messages, userId, metrics)`
- `generateFromPrompt(prompt, metrics)`
- `streamFromPrompt(prompt, onChunk, metrics)`
- `getCachedResponse(cacheKey)`
- `setCachedResponse(cacheKey, value)`

### `lib/ai/rerank.ts`
- `rerankChunks(query, chunks, { topK, maxPerDocument })`

### `lib/ai/cross-document.ts`
- `buildCrossDocumentContext(rankedChunks)`

### `lib/ai/cache.ts`
- `embeddingCache`, `retrievalCache`, `responseCache`
- `userScopedCacheKey(userId, raw)`
- `invalidateUserAICaches(userId)`

### `lib/ai/retry.ts`
- `withRetry(operation, options)`
- `defaultShouldRetry(error)`

### `lib/ai/monitoring.ts`
- `createMetricsContext(route, userId?)`
- `measureStage(context, stage, fn, metadata?)`
- `addTokenUsage(context, usage)`
- `estimateTokens(text)`
- `logAndPersistMetrics(supabase, context, eventType, metadata?)`

### `lib/ai/evaluation.ts`
- `runAutomatedEvaluation(supabase, userId, cases)`

## API Validation and Response Helpers

### `lib/api/schemas.ts`
zod schemas:
- `ChatRequestSchema`
- `ProcessFileRequestSchema`
- `EvaluateRequestSchema`

### `lib/api/responses.ts`
- `validationErrorResponse(zodError)`
- `internalErrorResponse(message, error, status?)`

## Supabase Clients

### Browser client
- `lib/supabase/client.ts`
- used by client services

### Service-role server client
- `lib/supabase/server.ts`
- `createServiceRoleClient()`
- used by route handlers

## Utility Modules

### `lib/utils/chunk.ts`
Advanced chunking:
- `chunkDocument(text, { maxChars, minChars, overlapChars })`
- `chunkText(text, size?)` (compatibility helper)

### `lib/utils/file.ts`
Filename/path and file validation helpers.

### `lib/utils/cn.ts`
Tailwind class merge utility.

## Config Reference (`lib/constants/config.ts`)

`APP_CONFIG`:
- `CHUNK_SIZE = 1100`
- `MIN_CHUNK_SIZE = 360`
- `CHUNK_OVERLAP = 140`
- `MAX_MATCH_COUNT = 20`
- `MAX_RERANKED_MATCH_COUNT = 8`
- `MAX_MATCHES_PER_DOCUMENT = 3`
- `CACHE_TTL_EMBEDDING_MS = 3600000`
- `CACHE_TTL_RETRIEVAL_MS = 600000`
- `CACHE_TTL_RESPONSE_MS = 600000`
- `DEFAULT_CHAT_TITLE = "New Chat"`
- `GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"`
- `GEMINI_CHAT_MODEL = "gemini-flash-latest"`
- `RETRY_MAX_ATTEMPTS = 3`

`STORAGE_BUCKETS`:
- `USER_FILES = "user-files"`

`DATABASE_TABLES`:
- `CHAT_SESSIONS`
- `MESSAGES`
- `USER_DOCUMENTS`
- `DOCUMENT_CHUNKS`

## Type Notes

`ChatMessage` (`lib/types/chat.types.ts`) now includes optional:
- `streaming?: boolean`

Used by chat UI to render live stream state.
