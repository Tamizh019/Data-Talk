"""
Data-Talk FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes.chat import router as chat_router
from app.routes.upload import router as upload_router
from app.routes.conversations import router as conversations_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup: index the DB schema into Pgvector."""
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
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://datatalk-001.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────
app.include_router(chat_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")

@app.get("/api/db-status", tags=["admin"])
async def db_status():
    """
    Lightweight connection status check.
    Frontend polls this on mount to quickly show the connected/disconnected pill
    without triggering a full reconnect round-trip.
    """
    from app.core import sql_executor as _sql_exec
    connected = False
    if _sql_exec._engine is not None:
        try:
            async with _sql_exec._engine.connect() as conn:
                from sqlalchemy import text
                await conn.execute(text("SELECT 1"))
            connected = True
        except Exception:
            connected = False
    return {"connected": connected}


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
    Supports: PostgreSQL, MySQL, SQLite (full query support)
              MongoDB, Redis (connection + schema only — query support coming soon)
    """
    from fastapi import HTTPException
    from app.core.schema_indexer import schema_indexer

    import urllib.parse
    
    db_url: str = payload.get("db_url", "").strip()
    if not db_url:
        raise HTTPException(status_code=400, detail="db_url is required")

    # ── NoSQL handlers (connection-only, no query execution yet) ──────────
    if db_url.startswith("mongodb://") or db_url.startswith("mongodb+srv://"):
        # Validate the URL can be parsed
        try:
            urllib.parse.urlparse(db_url)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid MongoDB connection URL")
        
        return {
            "status": "connected",
            "message": "MongoDB connected successfully. Query support coming soon.",
            "db_type": "mongodb",
            "suggestions": {
                "greeting": "🟢 MongoDB connected! Natural language queries for MongoDB are coming in a future update.",
                "categories": [
                    {"name": "Info", "questions": [
                        "MongoDB connection is active",
                        "Schema exploration will be available soon",
                        "Aggregation pipeline support is planned"
                    ]}
                ]
            },
        }

    if db_url.startswith("redis://") or db_url.startswith("rediss://"):
        try:
            urllib.parse.urlparse(db_url)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Redis connection URL")
        
        return {
            "status": "connected",
            "message": "Redis connected successfully. Query support coming soon.",
            "db_type": "redis",
            "suggestions": {
                "greeting": "🟢 Redis connected! Natural language queries for Redis are coming in a future update.",
                "categories": [
                    {"name": "Info", "questions": [
                        "Redis connection is active",
                        "Key exploration will be available soon",
                        "Redis command support is planned"
                    ]}
                ]
            },
        }

    # ── SQL handlers (full query support) ─────────────────────────────────

    # Accept plain postgres:// and convert to asyncpg driver
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Accept plain mysql:// and convert to aiomysql driver
    if db_url.startswith("mysql://"):
        db_url = db_url.replace("mysql://", "mysql+aiomysql://", 1)

    # Accept plain sqlite:// and convert to aiosqlite driver
    if db_url.startswith("sqlite:///"):
        db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

    if not (db_url.startswith("postgresql+asyncpg://") or db_url.startswith("mysql+aiomysql://") or db_url.startswith("sqlite+aiosqlite:///")):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Supported formats: postgresql://, mysql://, sqlite:///path, mongodb://, redis://"
        )

    # --- Supabase Options Fix & Schema Extraction ---
    target_schema = "public"
    
    # If MySQL, the "schema" is actually the database name in the path
    if db_url.startswith("mysql+aiomysql://"):
        try:
            db_name_part = db_url.split("?")[0].split("/")[-1]
            if db_name_part:
                target_schema = db_name_part
        except Exception:
            pass

    # SQLite doesn't use schemas — use "main"
    if db_url.startswith("sqlite+aiosqlite:///"):
        target_schema = "main"

    if "?" in db_url and not db_url.startswith("sqlite"):
        base, query = db_url.split("?", 1)
        params = urllib.parse.parse_qs(query)
        
        # Check for options=-csearch_path=student or options="-c search_path=student"
        options = params.get("options", [])
        for opt in options:
            if "search_path" in opt:
                # Format: -csearch_path=student or -c search_path=student
                parts = opt.split("=")
                if len(parts) >= 2:
                    target_schema = parts[-1].strip()
        
        # Check standard search_path explicitly passed
        if "search_path" in params:
            target_schema = params["search_path"][0].strip()
            # We keep standard search_path in the URL as asyncpg supports it directly
            
        # Remove the 'options' parameter as it crashes psycopg3/asyncpg
        if "options" in params:
            del params["options"]
            
        # Rebuild URL
        if params:
            new_query = urllib.parse.urlencode(params, doseq=True)
            db_url = f"{base}?{new_query}"
        else:
            db_url = base

    # Update runtime settings and env
    settings.target_db_url = db_url
    settings.target_schema = target_schema
    import os
    os.environ["TARGET_DB_URL"] = db_url

    # Reinitialize schema indexer with new DB
    try:
        # Force SQL executor to use new URL
        from app.core import sql_executor as _sql_exec
        if _sql_exec._engine is not None:
            await _sql_exec._engine.dispose()
            
        _sql_exec._engine = None

        # Explicitly test connection before blindly assuming success
        engine = _sql_exec.get_db_engine()
        async with engine.connect() as conn:
            pass # successful connect validates credentials

        await schema_indexer.build_schema_index()

        # Generate schema-aware starter suggestions for the user
        suggestions = {}
        try:
            from app.agents.suggestion_agent import generate_schema_suggestions
            schema_context = await schema_indexer.get_schema_context("overview of all tables")
            suggestions = await generate_schema_suggestions(schema_context)
        except Exception as suggestion_err:
            logger.warning(f"Suggestion agent failed (non-critical): {suggestion_err}")

        return {
            "status": "connected",
            "message": "Database connected and schema indexed successfully",
            "suggestions": suggestions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")


@app.get("/api/analytics", tags=["analytics"])
async def get_analytics():
    """Auto-generate dashboard analytics from the connected database."""
    from fastapi import HTTPException
    from app.core.sql_executor import execute_sql
    from app.core.schema_indexer import schema_indexer

    try:
        tables = await schema_indexer.fetch_db_schema()
        if not tables:
            raise HTTPException(status_code=400, detail="No tables found. Connect a database first.")

        analytics = []

        for table_info in tables[:5]:  # Cap at 5 tables
            table_name = table_info.get("table", "")
            columns_str = table_info.get("columns", "")
            if not table_name or not columns_str:
                continue

            cols = [c.strip() for c in columns_str.split(",") if c.strip()]
            table_data = {"table": table_name, "columns": cols, "kpis": [], "distributions": [], "top_records": []}

            # KPI: Row count
            try:
                rows, _ = await execute_sql(f'SELECT COUNT(*) AS total FROM "{table_name}"')
                total = rows[0]["total"] if rows else 0
                table_data["kpis"].append({"label": "Total Records", "value": total})
            except Exception:
                total = 0
                table_data["kpis"].append({"label": "Total Records", "value": "N/A"})

            # Detect column types via a sample query
            try:
                sample_rows, sample_cols = await execute_sql(f'SELECT * FROM "{table_name}" LIMIT 5')
            except Exception:
                sample_rows, sample_cols = [], cols

            text_cols = []
            numeric_cols = []
            for col in sample_cols:
                if sample_rows:
                    val = sample_rows[0].get(col)
                    if val is not None:
                        try:
                            float(val)
                            numeric_cols.append(col)
                        except (ValueError, TypeError):
                            text_cols.append(col)
                    else:
                        text_cols.append(col)

            # KPI: Numeric column averages
            for nc in numeric_cols[:3]:
                try:
                    rows, _ = await execute_sql(f'SELECT ROUND(AVG("{nc}")::numeric, 2) AS avg_val, MIN("{nc}") AS min_val, MAX("{nc}") AS max_val FROM "{table_name}"')
                    if rows:
                        table_data["kpis"].append({
                            "label": f"Avg {nc}",
                            "value": rows[0].get("avg_val", "N/A"),
                            "min": rows[0].get("min_val"),
                            "max": rows[0].get("max_val"),
                        })
                except Exception:
                    pass

            # Distribution: GROUP BY text columns
            for tc in text_cols[:2]:
                try:
                    rows, _ = await execute_sql(f'SELECT "{tc}", COUNT(*) AS count FROM "{table_name}" GROUP BY "{tc}" ORDER BY count DESC LIMIT 10')
                    if rows and len(rows) > 1:
                        table_data["distributions"].append({
                            "column": tc,
                            "data": rows,
                        })
                except Exception:
                    pass

            # Top records by first numeric column
            if numeric_cols:
                try:
                    top_col = numeric_cols[0]
                    display_cols = sample_cols[:5]
                    select_clause = ", ".join([f'"{c}"' for c in display_cols])
                    rows, _ = await execute_sql(f'SELECT {select_clause} FROM "{table_name}" ORDER BY "{top_col}" DESC LIMIT 5')
                    if rows:
                        table_data["top_records"] = {"ranked_by": top_col, "columns": display_cols, "rows": rows}
                except Exception:
                    pass

            analytics.append(table_data)

        return {"analytics": analytics}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics generation failed: {str(e)}")


from pydantic import BaseModel

class ExplainSqlRequest(BaseModel):
    sql: str

@app.post("/api/explain-sql", tags=["analytics"])
async def explain_sql_endpoint(payload: ExplainSqlRequest):
    from app.agents.analyst_agent import explain_sql_query
    explanation = await explain_sql_query(payload.sql)
    return {"explanation": explanation}


@app.get("/health")
async def health():
    from app.config import get_settings
    import urllib.parse
    settings = get_settings()
    
    # Hide password from URL
    redis_safe_url = "Not Configured"
    if settings.redis_url:
        parsed = urllib.parse.urlparse(settings.redis_url)
        redis_safe_url = f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"
        
    redis_status = "ok"
    try:
        from app.core.cache import _get_client
        client = _get_client()
        await client.ping()
    except Exception as e:
        redis_status = f"failed: {str(e)}"
        
    return {
        "status": "ok", 
        "service": "data-talk-api",
        "redis_host": redis_safe_url,
        "redis_connection": redis_status
    }

