# Network Optimization Analysis

## Current Network Profile

## 1. Initial authenticated app load
- `auth.getUser()` via `UserContext`
- `chat_sessions` fetch via `useChatSessions`
- `user_documents` fetch via `DocumentsContext`

Total: 3 primary calls.

## 2. Open a chat session
- `messages` fetch for selected session

Total: 1 call.

## 3. Send a message (streaming)
Client-side calls:
- save user message (`messages` insert)
- get chat session title (`chat_sessions` select single)
- update title only for `New Chat`
- `/api/chat?stream=true`
- save final AI message (`messages` insert)

Server-side upstream calls in `/api/chat` (cache miss):
- query embedding request to Gemini
- retrieval RPC (`match_chunks_v2` or fallback `match_chunks`)
- Gemini streaming generation
- observability insert

Cache-hit behavior:
- embedding/retrieval/response caches can skip expensive upstream steps.

## 4. Upload and process file
Client-side:
- storage upload
- insert `user_documents`
- `/api/process-file`

Server-side in `/api/process-file`:
- storage download
- embedding calls per chunk (with cache)
- delete existing chunks for file
- insert chunk batches
- observability insert

## Existing Optimization Mechanisms

### Client-level
- User state centralized in `UserContext`
- Documents centralized in `DocumentsContext`
- Optimistic message updates in `useChatMessages`
- Streaming UI avoids long perceived latency

### Server-level
- user-scoped TTL caches for embeddings/retrieval/responses
- reranking to reduce context noise before generation
- retry wrapper for transient upstream failures
- batched chunk insertion for vector writes
- observability to identify bottlenecks

## Net Result

The architecture is already optimized for its current scale:
- minimized duplicate client fetches via contexts
- reduced repeated AI compute through caching
- better UX through streaming
- measurable latency/token visibility via instrumentation

## Remaining Practical Opportunities

1. Add Redis-backed shared cache for multi-instance deployments.
2. Add background job queue for file processing to keep uploads responsive under heavy load.
3. Add chat session title caching to avoid select-before-update on every first message.
4. Add optional request coalescing for identical simultaneous queries.

These are optional enhancements, not blockers.
