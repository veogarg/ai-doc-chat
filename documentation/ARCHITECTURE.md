# DocuMind Architecture Overview

## System Layers

```text
Presentation (app/, components/)
  -> Hooks and Contexts (hooks/, contexts/)
    -> Client Services (lib/services/)
      -> API Routes (app/api/*)
        -> AI + Data Core (lib/ai/, lib/api/, lib/supabase/server.ts)
          -> External Systems (Supabase, Gemini)
```

## Core Runtime Components

### Client
- `app/(app)/chat/[id]/page.tsx`
  - Orchestrates user send flow, streaming updates, and upload actions
- `app/(app)/layout.tsx`
  - App shell, auth gate, sidebar data wiring
- `contexts/UserContext.tsx`
  - Current authenticated user state
- `contexts/DocumentsContext.tsx`
  - Centralized document list state and mutation helpers
- `hooks/useChatMessages.ts`
  - Message loading and optimistic persistence
- `lib/services/ai.service.ts`
  - Client wrapper for `/api/chat` and `/api/process-file`

### Server Routes
- `app/api/chat/route.ts`
  - Input validation
  - RAG preparation
  - cache lookup
  - generation (streaming or non-streaming)
  - observability logging
- `app/api/process-file/route.ts`
  - Input validation
  - file download
  - PDF parse
  - advanced chunking
  - embedding with retries and cache
  - vector persistence
  - cache invalidation and metrics
- `app/api/evaluate/route.ts`
  - Input validation
  - automated evaluation pipeline

### Shared Server Infrastructure
- `lib/supabase/server.ts`
  - Singleton service-role Supabase client factory
- `lib/api/schemas.ts`
  - zod schemas for API request validation
- `lib/api/responses.ts`
  - standardized validation/internal error responses

### AI Pipeline Modules
- `lib/ai/rag.ts`
  - RAG orchestration, prompt assembly, retrieval fallback (`match_chunks_v2` -> `match_chunks`), caching integration
- `lib/ai/rerank.ts`
  - Hybrid reranking (semantic + lexical)
- `lib/ai/cross-document.ts`
  - Multi-document grouping and synthesis notes
- `lib/ai/cache.ts`
  - TTL caches for embeddings/retrieval/responses
- `lib/ai/retry.ts`
  - reusable retry with exponential backoff + jitter
- `lib/ai/monitoring.ts`
  - stage timing, token estimation, optional cost estimation, persistence to `ai_observability_events`
- `lib/ai/evaluation.ts`
  - automated quality scoring and persistence to `rag_evaluations`
- `lib/utils/chunk.ts`
  - section-aware chunking with overlap and fallback sentence splitting

## End-to-End Flows

### Chat Flow
1. User sends message from chat page.
2. User message is saved via `chatService.saveMessage`.
3. Client calls `/api/chat?stream=true`.
4. Route validates payload with `ChatRequestSchema`.
5. `prepareRAG(...)` performs:
   - query embedding
   - retrieval from Supabase RPC
   - reranking
   - cross-document synthesis context
   - prompt construction
6. Response cache is checked.
7. If cache miss, Gemini stream starts and chunks are returned incrementally.
8. Final response is cached and observability event is persisted.
9. Client saves final AI message to `messages` table.

### Document Processing Flow
1. User uploads file to Supabase Storage (`user-files` bucket).
2. Client calls `/api/process-file`.
3. Route validates payload with `ProcessFileRequestSchema`.
4. PDF is downloaded and parsed.
5. `chunkDocument` produces section-aware chunks.
6. Chunks are embedded with retries and cached where possible.
7. Old chunks for same file are deleted.
8. New chunk vectors are inserted in batches.
9. User-scoped AI caches are invalidated.
10. Metrics are persisted.

### Evaluation Flow
1. Client/script posts `{ userId, cases }` to `/api/evaluate`.
2. Route validates payload with `EvaluateRequestSchema`.
3. Each case runs through RAG + generation.
4. Scores computed:
   - retrieval coverage
   - answer coverage
   - groundedness
   - overall score
5. Summary/results returned and optionally persisted.

## Data Model

Main tables:
- `chat_sessions`
- `messages`
- `user_documents`
- `document_chunks`

Upgrade tables:
- `ai_observability_events`
- `rag_evaluations`

RPC functions:
- `match_chunks`
- `match_chunks_v2`

## Configuration

`lib/constants/config.ts` defines runtime knobs:
- chunk sizing and overlap
- retrieval limits
- cache TTLs
- retry attempts
- model names

## Reliability and Safety

- Strict server input validation with zod
- Standardized API error shape
- Retry strategy for transient failures
- RLS-based tenant isolation in Supabase
- Service-role usage restricted to server routes

## Current Architectural Strengths

- Clear client/server separation
- Composable AI pipeline modules
- Reusable route validation and response patterns
- Scalable retrieval/generation instrumentation
- Streaming UX integrated end-to-end
