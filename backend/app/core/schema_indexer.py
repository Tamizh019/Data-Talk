"""
Schema Indexer: reads the PostgreSQL schema and indexes it into Qdrant
using LlamaIndex so the chat agent can retrieve relevant schema context
for any natural language question.
"""
import logging
from typing import Optional

from llama_index.core import VectorStoreIndex, Document, StorageContext
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from qdrant_client import QdrantClient

from app.config import get_settings
from app.core.sql_executor import get_schema_info

logger = logging.getLogger(__name__)
settings = get_settings()

_embed_model: Optional[HuggingFaceEmbedding] = None
_index: Optional[VectorStoreIndex] = None


import os

def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        if os.getenv("USE_QDRANT", "false").lower() == "true":
            _embed_model = HuggingFaceEmbedding(
                model_name="BAAI/bge-large-en-v1.5",
                device="cpu",
            )
    return _embed_model


def _get_index() -> VectorStoreIndex:
    global _index
    if _index is None:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        vector_store = QdrantVectorStore(
            client=client,
            collection_name=settings.qdrant_collection,
        )
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        _index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            embed_model=_get_embed_model(),
            storage_context=storage_context,
        )
    return _index


async def build_schema_index() -> None:
    """
    Fetches schema from PostgreSQL, creates a LlamaIndex document per table,
    and stores embeddings in Qdrant.
    Call this once on startup (or when schema changes).
    """
    if os.getenv("USE_QDRANT", "false").lower() != "true":
        logger.info("[SchemaIndexer] USE_QDRANT is false. Skipping vector indexing and model download.")
        return

    logger.info("[SchemaIndexer] Fetching database schema...")
    try:
        schema_text = await get_schema_info()
    except Exception as e:
        logger.error(f"[SchemaIndexer] Failed to query PostgreSQL schema: {e}")
        return

    documents = [Document(text=schema_text, metadata={"source": "db_schema"})]

    try:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        vector_store = QdrantVectorStore(
            client=client,
            collection_name=settings.qdrant_collection,
        )
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            embed_model=_get_embed_model(),
            show_progress=True,
        )
        logger.info("[SchemaIndexer] Schema indexed into Qdrant ✓")
    except Exception as e:
        logger.warning(
            f"[SchemaIndexer] Could not connect to Qdrant at {settings.qdrant_host}:{settings.qdrant_port}. "
            f"Vector search will be disabled. Error: {e}"
        )


async def get_schema_context(question: str, top_k: int = 3) -> str:
    """
    Retrieves the most relevant schema sections for a given question.
    Returns a formatted string to be injected into the SQLCoder prompt.
    """
    if os.getenv("USE_QDRANT", "false").lower() != "true":
        # If Qdrant/Embeddings are disabled to save space, just return the full schema directly
        return await get_schema_info()

    try:
        index = _get_index()
        retriever = index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(question)
        if not nodes:
            logger.warning("[SchemaIndexer] No schema nodes retrieved, using fallback")
            return await get_schema_info()      # Fallback: full schema

        context = "\n\n".join(node.get_content() for node in nodes)
        logger.info(f"[SchemaIndexer] Retrieved {len(nodes)} schema chunks")
        return context
    except Exception as e:
        logger.error(f"[SchemaIndexer] Retrieval failed: {e}, falling back to full schema")
        return await get_schema_info()
