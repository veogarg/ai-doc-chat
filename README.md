# DocuMind - AI-Powered Document Intelligence Chat

DocuMind is a full-stack RAG application where users upload documents and chat with AI using grounded retrieval.

The current codebase includes streaming responses, advanced chunking, reranking, cross-document synthesis, retries, caching, observability, and automated evaluation.

## Features

### Chat and UX
- Multi-session chat with persistent history
- Streaming AI responses (token-by-token)
- Auto-generated chat titles for new conversations
- Upload status and document-ready chat feedback

### RAG Pipeline
- PDF text extraction
- Section-aware chunking with overlap
- Embedding generation with retry handling
- Semantic retrieval via pgvector (`match_chunks` / `match_chunks_v2`)
- Hybrid reranking (semantic + lexical)
- Cross-document synthesis in prompt context

### Reliability and Performance
- Exponential backoff retries for Gemini and Supabase operations
- In-memory intelligent caching (embedding, retrieval, response)
- Cache invalidation after document reprocessing
- Stage-level latency and token/cost instrumentation

### Quality Evaluation
- Automated evaluation endpoint (`/api/evaluate`)
- CLI evaluation runner (`npm run evaluate`)
- Evaluation persistence in `rag_evaluations`

## Tech Stack

Frontend:
- Next.js App Router
- React + TypeScript
- Tailwind + shadcn/ui
- Sonner (Toast notifications)

Backend:
- Next.js Route Handlers
- Supabase (Auth, Postgres, Storage)

AI:
- Google Gemini (`gemini-embedding-001`, `gemini-flash-latest`)

## Project Structure

```text
app/
  api/
    chat/route.ts
    process-file/route.ts
    evaluate/route.ts
  (app)/
    layout.tsx
    chat/[id]/page.tsx

components/
  auth/
  chat/
  layout/
  ui/

contexts/
  UserContext.tsx
  DocumentsContext.tsx
  ChatSessionContext.tsx

hooks/
  useAuth.ts
  useUser.ts
  useChatSessions.ts
  useChatMessages.ts
  useDocuments.ts
  useFileUpload.ts
  useAutoScroll.ts

lib/
  ai/
    rag.ts
    rerank.ts
    cross-document.ts
    retry.ts
    cache.ts
    monitoring.ts
    evaluation.ts
    embeddings.ts
    gemini.client.ts
  api/
    schemas.ts
    responses.ts
  services/
  constants/config.ts
  supabase/
    client.ts
    server.ts
  types/
  utils/

scripts/
  evaluate-rag.mjs
  eval-dataset.json

supabase/
  rag_upgrade.sql
```

## Documentation

- [Architecture Overview](documentation/ARCHITECTURE.md)
- [Architecture Data Flow](documentation/ARCHITECTURE_DATA_FLOW.md)
- [Hooks and Utilities](documentation/HOOKS_AND_UTILITIES.md)
- [Quick Reference](documentation/QUICK_REFERENCE.md)
- [Network Optimization Analysis](documentation/NETWORK_OPTIMIZATION_ANALYSIS.md)
- [Documents Context Notes](documentation/DOCUMENTS_CONTEXT_IMPLEMENTATION.md)

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Optional cost estimation env vars:

```bash
GEMINI_INPUT_COST_PER_1K_TOKENS=
GEMINI_OUTPUT_COST_PER_1K_TOKENS=
GEMINI_EMBEDDING_COST_PER_1K_TOKENS=
```

### 3. Run

```bash
npm run dev
```

## Supabase Setup

### Base setup
Run your base project SQL for:
- `chat_sessions`
- `messages`
- `user_documents`
- `document_chunks`
- RLS policies
- `match_chunks` function

### Required upgrade for latest features
Run:

```bash
supabase/rag_upgrade.sql
```

This adds:
- `match_chunks_v2` function
- `ai_observability_events` table
- `rag_evaluations` table

## API Endpoints

- `POST /api/chat?stream=true|false`
  - Body: `{ userId, messages }`
  - Streaming plain text when `stream=true`

- `POST /api/process-file`
  - Body: `{ filePath, fileName, userId }`
  - Downloads file, parses PDF, chunks, embeds, stores vectors

- `POST /api/evaluate`
  - Body: `{ userId, cases }`
  - Returns summary and per-case scores

## Evaluation

Run evaluation against local app:

```bash
npm run evaluate -- --userId=<SUPABASE_USER_ID> --out=eval-report.json
```

Optional flags:
- `--dataset=scripts/eval-dataset.json`
- `--endpoint=http://localhost:3000/api/evaluate`

## Verification Commands

```bash
npm run lint
npx next typegen
npx tsc --noEmit
```

## Notes

- Build can fail in restricted environments if Google Fonts cannot be fetched by Next.js.
- Observability/evaluation persistence degrades gracefully if upgrade SQL is not applied.
