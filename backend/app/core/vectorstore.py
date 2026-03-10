"""
Qdrant Vector Store Setup — connects LlamaIndex to Qdrant.
"""
from functools import lru_cache
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
from llama_index.vector_stores.qdrant import QdrantVectorStore
from app.config import get_settings


# bge-large-en-v1.5 produces 1024-dimensional vectors
BGE_LARGE_DIMENSION = 1024


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    client = QdrantClient(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
    )
    print(f"[Qdrant] Connected to {settings.qdrant_host}:{settings.qdrant_port} ✓")
    return client


def ensure_collection_exists(client: QdrantClient, collection_name: str) -> None:
    """Create the Qdrant collection if it doesn't exist yet."""
    existing = [c.name for c in client.get_collections().collections]
    if collection_name not in existing:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=BGE_LARGE_DIMENSION,
                distance=Distance.COSINE,
            ),
        )
        print(f"[Qdrant] Created collection: '{collection_name}' ✓")
    else:
        print(f"[Qdrant] Collection '{collection_name}' already exists ✓")


@lru_cache(maxsize=1)
def get_async_qdrant_client() -> AsyncQdrantClient:
    settings = get_settings()
    return AsyncQdrantClient(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
    )

def get_vector_store() -> QdrantVectorStore:
    settings = get_settings()
    client = get_qdrant_client()
    aclient = get_async_qdrant_client()
    ensure_collection_exists(client, settings.qdrant_collection)
    return QdrantVectorStore(
        client=client,
        aclient=aclient,
        collection_name=settings.qdrant_collection,
    )
