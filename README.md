# AI Document Chat

An intelligent document chat application powered by AI that allows users to upload PDF documents and have natural conversations about their content using Retrieval-Augmented Generation (RAG). Built with Next.js, Supabase, and Google's Gemini AI.

## ✨ Features

-   **🔐 User Authentication**: Secure email/password authentication with Supabase Auth
-   **📄 PDF Upload & Processing**: Upload PDF documents with automatic text extraction and chunking
-   **🤖 Intelligent Chat**: Ask questions about uploaded documents and get contextual AI-powered answers
-   **🔍 RAG Architecture**: Semantic search using vector embeddings for accurate context retrieval
-   **💾 Vector Storage**: Efficient document storage and similarity search with Supabase pgvector
-   **🎨 Modern UI**: Beautiful, responsive interface built with shadcn/ui components
-   **⚡ Real-time Processing**: Asynchronous document processing with status updates
-   **💬 Chat Sessions**: Persistent chat sessions with message history
-   **📁 File Management**: Upload and manage multiple PDF documents per user

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript 5](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI primitives
-   **Database**: [Supabase](https://supabase.com/) (PostgreSQL + pgvector)
-   **Storage**: [Supabase Storage](https://supabase.com/storage) for PDF files
-   **Authentication**: [Supabase Auth](https://supabase.com/auth)
-   **AI Models**: 
    -   [Google Gemini](https://ai.google.dev/) (`gemini-embedding-001` for embeddings)
    -   `gemini-flash-latest` for chat responses
-   **PDF Parsing**: [pdf-parse](https://www.npmjs.com/package/pdf-parse) with pdfjs-dist
-   **Form Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## 📁 Project Structure

```
ai-doc-chat/
├── app/
│   ├── (app)/                    # Protected routes (requires auth)
│   │   ├── chat/                 # Chat interface
│   │   │   └── page.tsx
│   │   ├── files/                # File upload and management
│   │   │   └── page.tsx
│   │   └── layout.tsx            # App layout with sidebar and auth check
│   ├── api/
│   │   ├── chat/                 # Chat API endpoint (RAG)
│   │   │   └── route.ts
│   │   └── process-file/         # PDF processing endpoint
│   │       └── route.ts
│   ├── auth/                     # Authentication page
│   │   └── page.tsx
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── separator.tsx
│       └── spinner.tsx
├── lib/
│   ├── chunk.ts                  # Text chunking utility
│   ├── gemini.ts                 # Gemini AI client
│   ├── supabase/
│   │   └── client.ts             # Supabase client (browser)
│   ├── supabase.ts               # Supabase client (server)
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── scripts/
│   └── list-models.ts            # Script to list available Gemini models
├── .env                          # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Prerequisites

Before getting started, ensure you have the following:

-   **Node.js** (v18 or higher)
-   A [Supabase](https://supabase.com/) account and project
-   A [Google AI Studio](https://aistudio.google.com/) API Key

## ⚙️ Environment Variables

Create a `.env` file in the root directory and add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### How to get these values:

1. **NEXT_PUBLIC_SUPABASE_URL**: Found in your Supabase project settings under "API"
2. **SUPABASE_SERVICE_ROLE_KEY**: Found in your Supabase project settings under "API" → "Project API keys" → "service_role"
3. **GEMINI_API_KEY**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)

> **⚠️ Security Note**: The Service Role Key bypasses Row Level Security (RLS). In production, implement proper RLS policies and use the anon key on the client side.

## 🗄️ Database Setup

Run the following SQL in your Supabase SQL Editor to set up the complete database schema:

```sql
-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create user_documents table to track uploaded files
create table if not exists user_documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create document_chunks table to store text chunks with embeddings
create table if not exists document_chunks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  content text not null,
  embedding vector(768), -- 768 dimensions for gemini-embedding-001
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create chat_sessions table to store chat sessions
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table to store chat messages
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index on the embedding column for faster similarity search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create a function to search for similar document chunks
create or replace function match_chunks (
  query_embedding vector(768),
  match_count int,
  user_id uuid
) returns table (
  id uuid,
  content text,
  file_name text,
  similarity float
) language plpgsql stable as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.file_name,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.user_id = match_chunks.user_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## 📦 Storage Setup

Create a storage bucket in Supabase for file uploads:

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket named `user-files`
3. Set the bucket to **Private** (recommended for user documents)
4. Optionally, configure RLS policies for the bucket

## 🏁 Getting Started

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd ai-doc-chat
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    - Copy `.env.example` to `.env` (if available) or create a new `.env` file
    - Fill in your Supabase and Gemini API credentials

4.  **Set up the database**:
    - Run the SQL scripts provided above in your Supabase SQL Editor
    - Create the `user-files` storage bucket

5.  **Run the development server**:
    ```bash
    npm run dev
    ```

6.  **Open the application**:
    - Navigate to [http://localhost:3000](http://localhost:3000)
    - You'll see the landing page

## 📖 Usage

### 1. **Authentication**
- Navigate to `/auth` to sign up or sign in
- Create an account with email and password
- You'll be redirected to the chat page after successful login

### 2. **Upload Documents**
- Click on **📁 Files** in the sidebar
- Select a PDF file to upload
- The file will be uploaded to Supabase Storage
- The system will automatically:
  - Extract text from the PDF
  - Split it into chunks (800 characters each)
  - Generate embeddings using Gemini
  - Store chunks with embeddings in the database

### 3. **Chat with Documents**
- Click on **💬 Chat** in the sidebar
- Type your question in the input field
- The system will:
  - Convert your question to an embedding
  - Search for the most relevant document chunks (top 5)
  - Send the context to Gemini along with your question
  - Display the AI-generated response
- Chat history is automatically saved

### 4. **Example Questions**
For a resume document, you can ask:
- "What is this candidate's experience with React?"
- "Summarize the professional background"
- "What are the key technical skills?"
- "List the work experience"

## 🔧 API Routes

### `POST /api/process-file`
Processes uploaded PDF files and stores embeddings.

**Request Body:**
```json
{
  "filePath": "user-id/timestamp_filename.pdf",
  "fileName": "filename.pdf",
  "userId": "user-uuid"
}
```

**Process:**
1. Downloads file from Supabase Storage
2. Extracts text using pdf-parse
3. Chunks text into 800-character segments
4. Generates embeddings for each chunk
5. Stores chunks with embeddings in database

### `POST /api/chat`
Handles chat requests using RAG (Retrieval-Augmented Generation).

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "What is this about?" }
  ],
  "userId": "user-uuid"
}
```

**Process:**
1. Converts the latest message to an embedding
2. Searches for top 5 similar document chunks
3. Builds a prompt with document context and conversation history
4. Sends to Gemini for response generation
5. Returns AI-generated answer

**Response:**
```json
{
  "reply": "AI-generated response based on document context"
}
```

## 🎨 UI Components

The application uses **shadcn/ui** components for a consistent, modern interface:

- **Button**: Primary actions and navigation
- **Card**: Container for auth forms
- **Input**: Text input fields
- **Label**: Form labels
- **Spinner**: Loading indicator
- **Form**: Form validation with React Hook Form

## 🔐 Authentication Flow

1. User visits `/auth`
2. Can sign up (creates account, sends confirmation email) or sign in
3. On successful login, redirected to `/chat`
4. Protected routes (`/chat`, `/files`) check for authentication
5. If not authenticated, redirected back to `/auth`
6. Logout clears session and redirects to `/auth`

## 🧩 Key Features Explained

### RAG (Retrieval-Augmented Generation)
The application uses RAG to provide accurate, context-aware responses:
1. **Indexing**: Documents are chunked and embedded
2. **Retrieval**: User questions are embedded and matched against document chunks
3. **Generation**: Relevant chunks are provided as context to the LLM for answer generation

### Vector Similarity Search
Uses pgvector's cosine similarity (`<=>` operator) to find the most relevant document chunks based on semantic meaning, not just keyword matching.

### Text Chunking
Documents are split into 800-character chunks with no overlap. This balances:
- Context preservation (chunks aren't too small)
- Embedding quality (chunks aren't too large)
- Search precision (more granular results)

## 🛠️ Development Scripts

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# List available Gemini models (custom script)
npx tsx scripts/list-models.ts
```

## 📝 Notes

- **Embedding Model**: Uses `gemini-embedding-001` (768 dimensions)
- **Chat Model**: Uses `gemini-flash-latest` for fast responses
- **Chunk Size**: 800 characters (configurable in `lib/chunk.ts`)
- **Match Count**: Retrieves top 5 most similar chunks per query
- **PDF Worker**: Uses pdfjs-dist legacy build for compatibility

## 🚧 Future Enhancements

- [ ] Add support for more document formats (DOCX, TXT, etc.)
- [ ] Implement chat session management (view, delete, rename)
- [ ] Add file management (view uploaded files, delete files)
- [ ] Implement streaming responses for better UX
- [ ] Add support for multiple chat sessions
- [ ] Implement proper RLS policies for production
- [ ] Add document preview functionality
- [ ] Support for larger documents with progress indicators
- [ ] Add export chat history feature

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js, Supabase, and Google Gemini AI
