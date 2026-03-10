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
    from app.core.schema_indexer import schema_indexer
    await schema_indexer.build_schema_index()
    return {"status": "Schema re-indexed successfully"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "data-talk-api"}
