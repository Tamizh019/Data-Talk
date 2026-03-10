"""
POST /api/chat — Main SSE streaming endpoint.

Event stream format (newline-delimited JSON prefixed with 'data: '):
  data: {"event": "intent",         "intent": "sql"|"chat"}
  data: {"event": "sql_generated",  "sql": "SELECT ..."}
  data: {"event": "query_result",   "rows": [...], "columns": [...], "attempts": 1}
  data: {"event": "visualization",  "plotly_config": {...}}
  data: {"event": "explanation",    "text": "..."}
  data: {"event": "cached_result",  "sql": ..., "rows": ..., ...}
  data: {"event": "error",          "message": "..."}
  data: {"event": "done"}
"""
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.agent_service import route_query, call_gemini_explain
from app.core.self_correcting_agent import run_with_correction
from app.core.schema_indexer import schema_indexer
from app.core.visualizer import generate_plotly_config
from app.core.cache import get_cached, set_cached

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list = []


def emit(event: str, data: dict) -> str:
    payload = {"event": event, **data}
    return f"data: {json.dumps(payload, default=str)}\n\n"


async def stream_response(req: ChatRequest) -> AsyncGenerator[str, None]:
    try:
        # ── 1. Cache check ────────────────────────────────────────────
        cached = await get_cached(req.message)
        if cached:
            yield emit("cached_result", cached)
            yield emit("done", {})
            return

        # ── 2. Security + intent classification + LLM routing ────────
        # route_query now handles semantic schema retrieval internally via LlamaIndex
        routed = await route_query(req.message, req.history)
        yield emit("intent", {"intent": routed["intent"]})

        # ── 3. Conversational path (Gemini) ───────────────────────────
        if routed["intent"] == "chat":
            yield emit("explanation", {"text": routed.get("explanation", "")})
            yield emit("done", {})
            return

        # ── 4. SQL path ───────────────────────────────────────────────
        sql = routed.get("sql", "")
        # Get context for self-correction (fallback to full or relevant if needed)
        schema_context = await schema_indexer.get_schema_context(req.message)

        yield emit("sql_generated", {"sql": sql})

        # ── 5. Self-correcting execution ──────────────────────────────
        result = await run_with_correction(sql, schema_context, req.message)
        yield emit("query_result", {
            "rows": result["rows"],
            "columns": result["columns"],
            "sql_used": result["sql_used"],
            "attempts": result["attempts"],
            "row_count": len(result["rows"]),
        })

        # ── 6. Auto-visualization ─────────────────────────────────────
        chart_config = generate_plotly_config(result["columns"], result["rows"])
        if chart_config:
            yield emit("visualization", {"plotly_config": chart_config})

        # ── 7. Gemini explanation ─────────────────────────────────────
        explanation = await call_gemini_explain(
            req.message, result["rows"], result["columns"]
        )
        yield emit("explanation", {"text": explanation})

        # ── 8. Cache full result for future identical questions ────────
        await set_cached(req.message, {
            "sql": result["sql_used"],
            "rows": result["rows"],
            "columns": result["columns"],
            "plotly_config": chart_config,
            "explanation": explanation,
        })

        yield emit("done", {})

    except ValueError as e:
        logger.warning(f"Security/validation error: {e}")
        yield emit("error", {"message": str(e)})
    except RuntimeError as e:
        logger.error(f"Agent error: {e}")
        yield emit("error", {"message": str(e)})
    except Exception as e:
        logger.exception(f"Unexpected error in chat stream: {e}")
        yield emit("error", {"message": f"An unexpected error occurred: {str(e)}"})
    finally:
        yield emit("done", {})


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
