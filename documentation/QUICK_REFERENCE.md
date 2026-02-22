# Quick Reference

## Key Paths

```text
app/api/chat/route.ts
app/api/process-file/route.ts
app/api/evaluate/route.ts

lib/ai/rag.ts
lib/ai/rerank.ts
lib/ai/cross-document.ts
lib/ai/cache.ts
lib/ai/retry.ts
lib/ai/monitoring.ts
lib/ai/evaluation.ts

lib/api/schemas.ts
lib/api/responses.ts
lib/supabase/server.ts
lib/utils/chunk.ts

scripts/evaluate-rag.mjs
scripts/eval-dataset.json
supabase/rag_upgrade.sql
```

## Most Used Commands

```bash
npm run dev
npm run lint
npx next typegen
npx tsc --noEmit
npm run evaluate -- --userId=<SUPABASE_USER_ID> --out=eval-report.json
```

## API Contracts

### `POST /api/chat?stream=true|false`
Request:
```json
{
  "userId": "uuid",
  "messages": [{ "role": "user", "content": "..." }]
}
```

Response:
- `stream=true`: plain text streaming body
- `stream=false`: `{ "reply": "...", "cached": boolean }`

### `POST /api/process-file`
Request:
```json
{
  "filePath": "user_id/ts_name.pdf",
  "fileName": "resume.pdf",
  "userId": "uuid"
}
```

Response:
```json
{
  "success": true,
  "chunksProcessed": 12
}
```

### `POST /api/evaluate`
Request:
```json
{
  "userId": "uuid",
  "cases": [
    {
      "question": "What are the key skills?",
      "expectedKeywords": ["python", "sql"]
    }
  ]
}
```

Response:
```json
{
  "summary": {
    "caseCount": 1,
    "averageRetrievalCoverage": 0.8,
    "averageAnswerCoverage": 0.7,
    "averageGroundedness": 0.9,
    "averageOverallScore": 0.79
  },
  "results": []
}
```

## Streaming Client Snippet

```ts
const finalReply = await aiService.generateResponseStream(
  { messages: updatedMessages, userId: user.id },
  (_, aggregate) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === draftId ? { ...m, content: aggregate, streaming: true } : m
      )
    );
  }
);
```

## Chunking Snippet

```ts
const segments = chunkDocument(text, {
  maxChars: APP_CONFIG.CHUNK_SIZE,
  minChars: APP_CONFIG.MIN_CHUNK_SIZE,
  overlapChars: APP_CONFIG.CHUNK_OVERLAP,
});
```

## Supabase Upgrade Checklist

Run `supabase/rag_upgrade.sql` and verify:
- function: `match_chunks_v2`
- table: `ai_observability_events`
- table: `rag_evaluations`

## Common Debug Checks

- Chat returns 400:
  - validate payload shape against `ChatRequestSchema`
- No observability rows:
  - check `ai_observability_events` table exists
- Evaluation not persisted:
  - check `rag_evaluations` table and policies
- Poor retrieval quality:
  - verify `match_chunks_v2` exists
  - inspect reranked chunks in server logs
- Toast notifications not showing:
  - make sure `<Toaster />` from `sonner` is in `app/layout.tsx`

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

Optional cost estimation:
- `GEMINI_INPUT_COST_PER_1K_TOKENS`
- `GEMINI_OUTPUT_COST_PER_1K_TOKENS`
- `GEMINI_EMBEDDING_COST_PER_1K_TOKENS`
