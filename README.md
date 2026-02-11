# AI Resume Chat

This project is an AI-powered application that allows users to upload PDF resumes and chat with them using RAG (Retrieval-Augmented Generation). It uses Google's Gemini models for embedding and response generation, and Supabase for vector storage.

## Features

-   **PDF Upload**: Upload resume PDFs to parse and index their content.
-   **Intelligent Chat**: Ask questions about the uploaded resume (e.g., "What is this candidate's experience with React?").
-   **RAG Architecture**: Retrieves relevant context from the uploaded documents to provide accurate answers.
-   **Google Gemini Integration**: Uses `gemini-embedding-001` for embeddings and `gemini-flash-latest` for chat responses.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Database**: [Supabase](https://supabase.com/) (pgvector)
-   **AI**: [Google Generative AI](https://ai.google.dev/) (Gemini)
-   **PDF Parsing**: [pdf-parse](https://www.npmjs.com/package/pdf-parse)

## Prerequisites

Before getting started, ensure you have the following:

-   Node.js installed on your machine.
-   A [Supabase](https://supabase.com/) account and project.
-   A [Google AI Studio](https://aistudio.google.com/) API Key.

## Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

> **Note**: This project uses the Service Role Key for Supabase to allow bypassing Row Level Security (RLS) for simplicity in this demo. Be careful not to expose this key on the client side.

## Database Setup

Run the following SQL interface in your Supabase SQL Editor to set up the vector database:

```sql
-- Enable the pgvector extension to work with embedding vectors
create extension vector;

-- Create a table to store your documents
create table documents (
  id bigserial primary key,
  content text, -- corresponds to text chunk
  embedding vector(768), -- 768 dimensions for gemini-embedding-001
  doc_name text
);

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(768),
  match_count int
) returns table (
  id bigint,
  content text,
  doc_name text,
  similarity float
) language plpgsql stable as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.doc_name,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd ai-doc-chat
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the application**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1.  Navigate to `/upload` to upload a PDF resume.
2.  Once uploaded, the text will be extracted, chunked, and stored in Supabase with embeddings.
3.  Navigate to `/chat` (or the home page if configured) to start asking questions about the resume.
