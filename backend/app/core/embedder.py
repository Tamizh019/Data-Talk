"""
Embedder — BAAI/bge-large-en-v1.5 via HuggingFace (runs locally, zero cost)
This is the embedding backbone used for both ingestion and query time.
"""
from functools import lru_cache
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from app.config import get_settings


@lru_cache(maxsize=1)
def get_embedder() -> HuggingFaceEmbedding:
    """
    Singleton pattern — embedder is loaded once and reused.
    First call will download the model (~1.3GB). Subsequent calls are instant.
    """
    settings = get_settings()
    print(f"[Embedder] Loading model: {settings.embedding_model}")
    embedder = HuggingFaceEmbedding(
        model_name=settings.embedding_model,
        device=settings.embedding_device,
        trust_remote_code=False,
    )
    print("[Embedder] Model ready ✓")
    return embedder
