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
        from app.agents.orchestrator import run_pipeline
        
        async for event_dict in run_pipeline(req.message, req.history):
            yield emit(event_dict["event"], event_dict.get("data", {}))
            
    except Exception as e:
        logger.exception(f"Unexpected error routing stream: {e}")
        yield emit("error", {"message": f"Critical error: {str(e)}"})
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
