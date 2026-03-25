import logging
import urllib.parse
from llama_index.core import StorageContext
from llama_index.vector_stores.postgres import PGVectorStore
from sqlalchemy import make_url
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def _get_system_db_url() -> str:
    """Returns the SYSTEM_DB_URL, converting it to a psycopg2-compatible format."""
    url = settings.system_db_url or settings.target_db_url
    # Remove asyncpg driver prefix — psycopg2 (sync) is used by LlamaIndex PGVectorStore
    return url.replace("postgresql+asyncpg://", "postgresql://")

# NOTE: No lru_cache here — we must always read system_db_url fresh.
# A cached instance would keep a stale connection to whatever DB was used on first call,
# which could be the client's DB rather than the permanent system DB.
def get_vector_store(table_name: str = "data_talk_vectors") -> PGVectorStore:
    """
    Initializes and returns the LlamaIndex PGVectorStore.
    Always connects to the permanent SYSTEM_DB (Supabase) — never to the client's DB.
    """
    raw_url = _get_system_db_url()
    url = make_url(raw_url)

    conn_host = url.host
    conn_port = url.port
    conn_user = url.username
    # URL-encode password to safely handle special chars like @, #, $
    conn_password = urllib.parse.quote_plus(url.password) if url.password else None
    conn_database = url.database

    logger.info(f"[VectorStore] Connecting to SYSTEM_DB at {conn_host}:{conn_port}/{conn_database} → table '{table_name}'")

    vector_store = PGVectorStore.from_params(
        host=conn_host,
        port=conn_port,
        user=conn_user,
        password=conn_password,
        database=conn_database,
        table_name=table_name,
        embed_dim=3072,  # gemini-embedding-001 outputs 3072 dimensions
        perform_setup=True,  # Automatically creates pgvector extension + table
        debug=False
    )
    
    return vector_store

def get_storage_context(table_name: str = "data_talk_vectors") -> StorageContext:
    """Returns a LlamaIndex StorageContext backed by the permanent SYSTEM_DB vector store."""
    return StorageContext.from_defaults(vector_store=get_vector_store(table_name))

