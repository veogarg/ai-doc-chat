# Architecture Data Flow

## High-Level Request Topology

```text
Client UI
  -> Client Hooks / Services
    -> Next.js Route Handler
      -> Shared API Validation + Error Utilities
        -> RAG / Processing Modules
          -> Supabase + Gemini
```

## Chat Data Flow (Streaming)

```text
ChatInput
  -> ChatPage.handleSendMessage
    -> chatService.saveMessage(user)
    -> aiService.generateResponseStream
      -> POST /api/chat?stream=true
        -> ChatRequestSchema validation
        -> prepareRAG(...)
          -> embed query
          -> retrieve chunks (match_chunks_v2 -> match_chunks)
          -> rerank chunks
          -> build cross-document context
          -> build prompt
        -> response cache lookup
        -> Gemini stream (if cache miss)
        -> metrics persist (ai_observability_events)
      -> stream chunks back to client
    -> client updates draft AI message incrementally
    -> chatService.saveMessage(ai final)
```

## Document Processing Data Flow

```text
File select
  -> useFileUpload.uploadFile
    -> documentService.uploadFile (Storage)
    -> documentService.saveDocumentRecord (user_documents)
    -> aiService.processDocument
      -> POST /api/process-file
        -> ProcessFileRequestSchema validation
        -> download file from Storage
        -> parse PDF text
        -> chunkDocument (section-aware)
        -> embed each chunk (retry + cache)
        -> delete old chunks for file
        -> insert new chunks in batches
        -> invalidate user AI caches
        -> metrics persist
```

## Evaluation Data Flow

```text
scripts/evaluate-rag.mjs or API client
  -> POST /api/evaluate
    -> EvaluateRequestSchema validation
    -> runAutomatedEvaluation
      -> per case: prepareRAG + generateFromPrompt
      -> score: retrievalCoverage, answerCoverage, groundedness, overallScore
      -> persist summary/results (rag_evaluations)
```

## Caching and Invalidation

- Cache scopes are per user (`userScopedCacheKey`):
  - embedding cache
  - retrieval cache
  - response cache
- Cache invalidation happens after successful document reprocessing.

## Observability Pipeline

Metrics captured per route/case:
- stage durations
- token estimates (prompt/completion/embedding)
- optional estimated USD cost

Metrics are logged to console and persisted when `ai_observability_events` exists.

## Failure Handling

- Request payload validation returns 400 with zod issues.
- Retry wrapper handles transient upstream failures.
- Processing and chat routes emit structured 500 responses with details.
- Missing upgrade tables degrade gracefully with warnings.
