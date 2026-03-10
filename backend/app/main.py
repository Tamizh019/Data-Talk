"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routes import ingest, chat
from app.core.embedder import get_embedder
from app.core.vectorstore import get_qdrant_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: Pre-load embedder and verify Qdrant connection.
    This ensures first request is fast (model already in memory).
    """
    settings = get_settings()
    print("\n🚀 RAG Chatbot Backend Starting...")
    print(f"   LLM     : Groq → {settings.groq_model}")
    print(f"   Embedder: {settings.embedding_model}")
    print(f"   VectorDB: Qdrant @ {settings.qdrant_host}:{settings.qdrant_port}")

    # Pre-warm embedder (downloads model on first run ~1.3GB)
    print("\n[Startup] Loading embedding model...")
    get_embedder()

    # Verify Qdrant connection
    print("[Startup] Connecting to Qdrant...")
    get_qdrant_client()

    print("\n✅ Backend ready! All systems online.\n")
    yield
    print("\n👋 Backend shutting down.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="RAG Chatbot API",
        description="Production-grade RAG chatbot — LlamaIndex + Qdrant + Groq",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS for Next.js frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(ingest.router)
    app.include_router(chat.router)

    @app.get("/")
    async def root():
        return {
            "status": "online",
            "message": "RAG Chatbot API is running",
            "docs": "/docs",
        }

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
