"""
Data-Talk FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup: index the DB schema into Qdrant."""
    logger.info("Data-Talk starting up...")
    try:
        from app.core.schema_indexer import schema_indexer
        await schema_indexer.build_schema_index()
        logger.info("Schema indexing complete ✓")
    except Exception as e:
        logger.warning(
            f"Schema indexing failed (DB may not be connected yet): {e}\n"
            "Run POST /api/schema/reindex manually once DB is ready."
        )
    yield
    logger.info("Data-Talk shutting down.")


app = FastAPI(
    title="Data-Talk API",
    description="NL-to-SQL enterprise chatbot with Hybrid LLM routing",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────
app.include_router(chat_router, prefix="/api")


@app.get("/api/schema/reindex", tags=["admin"])
async def reindex_schema():
    """Manually trigger schema re-indexing (call after DB schema changes)."""
    from fastapi import HTTPException
    from app.core.schema_indexer import schema_indexer
    try:
        await schema_indexer.build_schema_index()
        return {"status": "Schema re-indexed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-indexing failed: {str(e)}")


@app.get("/api/schema", tags=["admin"])
async def get_schema():
    """Return the current database tables and columns."""
    from fastapi import HTTPException
    from app.core.schema_indexer import schema_indexer
    try:
        tables = await schema_indexer.fetch_db_schema()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {str(e)}")


@app.post("/api/connect", tags=["admin"])
async def connect_database(payload: dict):
    """
    Dynamically update the target database connection at runtime.
    Accepts: { "db_url": "postgresql+asyncpg://user:pass@host:port/dbname" }
    """
    from fastapi import HTTPException
    from app.core.schema_indexer import schema_indexer

    db_url: str = payload.get("db_url", "").strip()
    if not db_url:
        raise HTTPException(status_code=400, detail="db_url is required")

    # Accept plain postgres:// and convert to asyncpg driver
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    if not db_url.startswith("postgresql+asyncpg://"):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Use format: postgresql://user:pass@host:port/dbname"
        )

    # Update runtime settings and env
    settings.target_db_url = db_url
    import os
    os.environ["TARGET_DB_URL"] = db_url

    # Reinitialize schema indexer with new DB
    try:
        # Force SQL executor to use new URL
        from app.core import sql_executor as _sql_exec
        _sql_exec._engine = None

        # Explicitly test connection before blindly assuming success
        engine = _sql_exec.get_db_engine()
        async with engine.connect() as conn:
            pass # successful connect validates credentials

        await schema_indexer.build_schema_index()
        return {"status": "connected", "message": "Database connected and schema indexed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "data-talk-api"}
