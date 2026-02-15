# Current Architecture - Data Flow

## Component Tree & Network Calls

```
app/layout.tsx (Root)
├── UserProvider ← 🌐 1 API call: getCurrentUser()
    │
    └── app/(app)/layout.tsx
        ├── useChatSessions(userId) ← 🌐 1 API call: getChatSessions()
        ├── useDocuments(userId) ← 🌐 1 API call: getDocuments()
        │
        ├── ChatSessionProvider (Context - no API calls)
        │   │
        │   ├── Sidebar
        │   │   ├── sessions (prop) ← ✅ No API call (from parent)
        │   │   └── documents (prop) ← ✅ No API call (from parent)
        │   │
        │   └── app/(app)/chat/[id]/page.tsx
        │       └── useChatMessages(sessionId) ← 🌐 1 API call: getMessages()
        │
        └── Other pages...
```

## Total Network Calls Per User Session

1. **Initial Load** (visiting app for first time):
   - `getCurrentUser()` - 1 call
   - `getChatSessions()` - 1 call
   - `getDocuments()` - 1 call
   - **Total: 3 calls**

2. **Opening a Chat**:
   - `getMessages(sessionId)` - 1 call
   - **Total: 1 call**

3. **Creating New Chat**:
   - `createChatSession()` - 1 call
   - **Total: 1 call**

4. **Sending Message**:
   - `saveMessage()` - 2 calls (user + AI message)
   - `getChatSession()` - 1 call (to check title)
   - `updateChatTitle()` - 1 call (if new chat)
   - **Total: 3-4 calls**

## Network Call Efficiency Score: 9/10 ⭐

### What's Great:
- ✅ User data cached globally
- ✅ Sessions fetched once and shared
- ✅ Documents fetched once and shared
- ✅ Optimistic updates for messages
- ✅ No redundant calls

### What Could Be Better:
- 🟡 No caching on navigation (re-fetches on back/forward)
- 🟡 Documents could use context for better management
- 🟡 Could implement stale-while-revalidate pattern

## Comparison with Unoptimized Architecture

### ❌ Without Context Pattern (Bad):
```
Every component calls API independently:
- Header: getCurrentUser() ← 1 call
- Sidebar: getCurrentUser() ← 1 call (duplicate!)
- ChatPage: getCurrentUser() ← 1 call (duplicate!)
- Sidebar: getChatSessions() ← 1 call
- Sidebar: getDocuments() ← 1 call
Total: 5 calls (2 duplicates!)
```

### ✅ With Context Pattern (Current - Good):
```
Single source of truth:
- UserProvider: getCurrentUser() ← 1 call
- Layout: getChatSessions() ← 1 call
- Layout: getDocuments() ← 1 call
Total: 3 calls (no duplicates!)
```

**Savings: 40% fewer network calls!** 🎉
