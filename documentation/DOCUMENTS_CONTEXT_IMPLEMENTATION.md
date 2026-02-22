# DocumentsContext Implementation Notes

## Status

`DocumentsContext` is active and is the source of truth for user document state in the app shell.

## What It Solves

Before context-based sharing, each consumer could fetch `user_documents` independently.
Now:
- `DocumentsProvider` fetches once for the current user
- child components read document state through `useDocuments()`
- uploads can update context immediately via `addDocument(...)`

## Current Design

### Provider
- File: `contexts/DocumentsContext.tsx`
- Inputs: `userId`
- State: `documents`, `loading`, `error`
- Actions:
  - `refreshDocuments()`
  - `addDocument(document)`
  - `removeDocument(documentId)`

### Hook
- File: `hooks/useDocuments.ts`
- Returns context values and actions
- No `userId` parameter needed in consumers

### Integration Points
- `app/(app)/layout.tsx`
  - wraps app content with `<DocumentsProvider userId={user?.id}>`
- `hooks/useFileUpload.ts`
  - calls `addDocument(documentRecord)` immediately after DB insert

## Behavioral Impact

- Sidebar document list updates without manual refresh after upload.
- Fewer duplicate document-list network calls.
- Consistent document state for all nested app components.

## Constraints and Follow-up Options

- `removeDocument` currently updates local context only; a full delete workflow can later include:
  - Storage file deletion
  - `user_documents` row deletion
  - `document_chunks` cleanup
  - context update via `removeDocument`

- For very large document lists, pagination can be introduced in `documentService.getDocuments` and `DocumentsContext`.

## Verification Checklist

- Upload a file and confirm it appears in sidebar without route refresh.
- Confirm only one primary documents fetch on app load.
- Confirm switching users resets document list state based on `userId`.
