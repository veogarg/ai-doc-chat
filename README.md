# DocuMind — AI-Powered Document Intelligence Chat

DocuMind is a production-style AI chat application that allows users to upload documents and have contextual conversations powered by Retrieval-Augmented Generation (RAG).

It combines a modern full-stack architecture with real-world AI workflows such as embeddings, vector search, secure multi-tenant storage, and session-based conversational memory.

This project demonstrates how to build a scalable AI product from scratch using modern tools.

---

## 🚀 Features

### 🤖 AI Chat with Memory

* Multi-session chat (like ChatGPT)
* Persistent conversation history
* Context-aware AI responses

### 📄 Document Intelligence (RAG)

* Upload PDFs and files
* Automatic text extraction
* Chunking + embedding generation
* Vector search using pgvector
* AI answers grounded in user documents

### 🔐 Secure Multi-Tenant Architecture

* User authentication via Supabase
* Row-Level Security (RLS)
* Per-user document isolation
* Private storage buckets

### 🧠 Smart Context Injection

* Query → embedding → semantic search
* Top matching chunks fed to AI
* Reduced hallucinations
* Document-aware responses

### 💬 Polished Chat UX

* Sidebar with chat history
* Auto-titled conversations
* File upload indicator
* Fixed input like ChatGPT
* Document list panel

---

## 🏗️ Tech Stack

**Frontend**

* Next.js (App Router)
* TypeScript
* shadcn/ui
* TailwindCSS

**Backend**

* Next.js API Routes
* Supabase (Auth + DB + Storage)

**AI Layer**

* Google Gemini API
* Embeddings: gemini-embedding-001
* LLM: gemini-flash-latest

**Database**

* PostgreSQL
* pgvector extension

---

## 📂 Core Modules

### Chat Engine

* Session-based conversations
* Message persistence
* AI response streaming (planned)

### Document Pipeline

* File upload → Storage
* PDF parsing
* Chunking
* Embedding generation
* Vector indexing

### 📄 Document Memory Model

* Uploaded documents are **global per user**
* Once a file is uploaded and processed, it becomes part of the user's knowledge base
* AI can use these documents across all chat sessions


### Retrieval Layer

* Semantic search via pgvector
* Context injection into prompts

---

## 🧩 Architecture Overview

User Flow:

1. User logs in
2. If chats exist → open latest chat => Else → create new chat → open it
3. Uploads documents
4. System:

   * Extracts text from PDF
   * Splits into chunks
   * Generates embeddings
   * Stores vectors
5. User asks a question
6. System:

   * Converts query → embedding
   * Finds relevant chunks
   * Sends context + chat history to AI
7. AI responds with document-aware answers

This follows the RAG (Retrieval-Augmented Generation) pattern used in modern AI products.

---

## 🧠 Architecture Quality & Design Decisions

DocuMind was designed with production-oriented patterns commonly used in modern AI SaaS systems.

Key architectural considerations:

* Multi-tenant design using Supabase Auth + RLS
* Session-based chat model (ChatGPT-style)
* Retrieval-Augmented Generation (RAG) for grounded responses
* Embeddings + vector search via pgvector
* Secure per-user document storage
* Separation of concerns:
  * Storage → documents
  * Database → sessions/messages
  * AI layer → inference + retrieval
* Stateless API routes with server-side processing
* Service-role usage restricted to backend only

This project focuses on practical, scalable AI system design rather than experimental ML research.

---

## 🔒 Security Design

* Supabase Auth for identity
* RLS policies for data isolation
* Per-user storage paths
* Service role usage only on server

Each user can access only:

* Their chats
* Their documents
* Their embeddings

---

## 📊 Why This Project Matters

This project demonstrates practical experience in:

* Building AI-powered SaaS systems
* Designing RAG pipelines
* Working with embeddings + vector DB
* Secure multi-user architecture
* Prompt engineering
* Full-stack product thinking

It reflects real-world patterns used by:

* ChatGPT
* Notion AI
* Glean
* Perplexity

---

## 🛠️ Setup Instructions

### 1. Clone Repo

```bash
git clone <your-repo-url>
cd documind
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

### 4. Run App

```bash
npm run dev
```

---
## 🗄️ Supabase Setup Guide

DocuMind relies heavily on Supabase for authentication, database, vector storage, and file uploads. Follow these steps to configure it correctly.

---

### 1️⃣ Create a Supabase Project

1. Go to: [https://supabase.com](https://supabase.com)
2. Create a new project
3. Copy these from Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Add them to `.env.local`.

---

### 2️⃣ Enable pgvector Extension

Open Supabase → SQL Editor → Run:

```sql
create extension if not exists vector;
```

This enables vector embeddings storage.

---

### 3️⃣ Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Chat sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  title text,
  created_at timestamp default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions on delete cascade,
  role text,
  content text,
  created_at timestamp default now()
);

-- Uploaded documents
create table user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  file_name text,
  file_path text,
  created_at timestamp default now()
);

-- Vector chunks (RAG storage)
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  file_name text,
  content text,
  embedding vector(3072),
  created_at timestamp default now()
);
```

---

### 4️⃣ Enable Row Level Security (RLS)

Run:

```sql
alter table chat_sessions enable row level security;
alter table messages enable row level security;
alter table user_documents enable row level security;
alter table document_chunks enable row level security;
```

---

### 5️⃣ Add RLS Policies

```sql
-- Chat sessions
create policy "Users manage their chats"
on chat_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Messages
create policy "Users access their messages"
on messages
for all
using (
  session_id in (
    select id from chat_sessions where user_id = auth.uid()
  )
);

-- Documents
create policy "Users manage their documents"
on user_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Chunks
create policy "Users access their chunks"
on document_chunks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

### 6️⃣ Create Storage Bucket

Go to Supabase → Storage → Create bucket:

```
Name: user-files
Private: Yes
```

---

### 7️⃣ Storage Policies

Allow users to upload into their own folder:

**INSERT policy**

```sql
auth.uid()::text = (storage.foldername(name))[1]
```

**SELECT policy**

```sql
auth.uid()::text = (storage.foldername(name))[1]
```

This ensures each user can access only their own files.

---

### 8️⃣ Create Vector Search Function

This enables semantic search across document chunks.

Run:

```sql
create or replace function match_chunks (
  query_embedding vector(3072),
  match_count int,
  user_id uuid
)
returns table (
  content text,
  similarity float
)
language sql stable
as $$
  select
    content,
    1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.user_id = match_chunks.user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

After completing the above steps, the project will be fully functional with:

* Authentication
* File uploads
* Document processing
* Embeddings
* RAG-based AI responses

---

## ⚠️ Known Gaps & Future Enhancements

This project intentionally prioritizes core AI architecture over full production polish. Some improvements that can be added later:

### UX Improvements

* Streaming AI responses (token-by-token)
* Loading skeleton when opening a chat
* Empty-state UI for new conversations
* Toast-based error handling instead of console logs

### Product Features

* Delete chat sessions
* Delete uploaded documents
* Document preview support
* Editable chat titles
* Chat export functionality

### Performance Enhancements

* Background job queue for document processing
* Caching frequent embeddings/search results
* Pagination for large chat histories

### AI Enhancements

* Auto-summarization on document upload
* Multi-document context weighting
* Model switching (Gemini / OpenAI)

These are intentionally left out to keep the initial version focused, understandable, and easy to deploy.


---

## 👨‍💻 Author

Built as part of an AI-focused full-stack exploration to understand modern LLM product architecture and production patterns.

---
