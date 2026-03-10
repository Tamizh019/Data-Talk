# RAG Chatbot

A production-grade RAG (Retrieval-Augmented Generation) chatbot.

## Tech Stack
- **Frontend**: Next.js 14 (TypeScript, App Router)
- **Backend**: FastAPI (Python 3.11, async)
- **Orchestration**: LlamaIndex
- **Vector DB**: Qdrant
- **Embeddings**: `BAAI/bge-large-en-v1.5` (local, free)
- **LLM**: Groq → `llama-3.3-70b-versatile` (free, 300 tok/sec)

## Project Structure
```
RAG/
├── backend/          # FastAPI + LlamaIndex
├── frontend/         # Next.js 14
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 18+](https://nodejs.org/)
- [Groq API Key](https://console.groq.com) (free)

### 1. Setup environment
```bash
cp backend/.env.example backend/.env
# Add your GROQ_API_KEY to backend/.env
```

### 2. Start Qdrant + Backend
```bash
docker-compose up -d
```

### 3. Start Frontend (dev mode)
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
- **Frontend**: http://localhost:3000
- **Backend API docs**: http://localhost:8000/docs
- **Qdrant dashboard**: http://localhost:6333/dashboard

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ingest` | Upload PDF for ingestion |
| POST | `/api/chat` | Streaming chat (SSE) |
| DELETE | `/api/chat/{session_id}` | Clear chat history |
| GET | `/health` | Health check |
