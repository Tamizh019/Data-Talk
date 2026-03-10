import logging
from typing import Optional
from llama_index.core import StorageContext
from llama_index.vector_stores.postgres import PGVectorStore
from sqlalchemy import make_url
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

@lru_cache()
def get_vector_store() -> PGVectorStore:
    """
    Initializes and returns the LlamaIndex PGVectorStore.
    Uses the TARGET_DB_URL from settings.
    """
    url = make_url(settings.target_db_url)
    
    # LlamaIndex PGVectorStore expects separate params
    # We strip the asyncpg prefix if present for the sync driver used by pgvector extension
    conn_host = url.host
    conn_port = url.port
    conn_user = url.username
    conn_password = url.password
    conn_database = url.database

    logger.info(f"Initializing PGVectorStore on {conn_host}:{conn_port}/{conn_database}")

    vector_store = PGVectorStore.from_params(
        host=conn_host,
        port=conn_port,
        user=conn_user,
        password=conn_password,
        database=conn_database,
        table_name="data_talk_vectors",
        embed_dim=768,  # Default for models/text-embedding-004
        perform_setup=True, # Automatically creates extension and table
        debug=False
    )
    
    return vector_store

def get_storage_context() -> StorageContext:
    """Returns a LlamaIndex StorageContext with the PGVectorStore."""
    return StorageContext.from_defaults(vector_store=get_vector_store())
