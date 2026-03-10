"""
POST /chat — SSE streaming chat endpoint with RAG + memory.
Each session_id maintains its own independent conversation history.
"""
import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.rag_engine import build_chat_engine, stream_rag_response

router = APIRouter(prefix="/api", tags=["chat"])

# In-memory session store. For production, use Redis.
_sessions: dict = {}


class ChatRequest(BaseModel):
    session_id: str
    message: str


@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    """
    SSE streaming endpoint. 
    - Maintains per-session chat history via LlamaIndex ChatMemoryBuffer.
    - Streams LLM tokens as they are generated.
    - Appends source citations at end of response.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Get or create chat engine for this session
    if request.session_id not in _sessions:
        _sessions[request.session_id] = build_chat_engine(request.session_id)

    chat_engine = _sessions[request.session_id]

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            async for chunk in stream_rag_response(chat_engine, request.message):
                # Parse sources if appended at end
                if chunk.startswith("\n\n__SOURCES__"):
                    sources_json = chunk.replace("\n\n__SOURCES__", "")
                    yield f"data: {json.dumps({'type': 'sources', 'data': json.loads(sources_json)})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'token', 'data': chunk})}\n\n"

            # Signal stream completion
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/chat/{session_id}")
async def clear_session(session_id: str) -> dict:
    """Clear chat history for a given session."""
    if session_id in _sessions:
        del _sessions[session_id]
        return {"message": f"Session '{session_id}' cleared."}
    return {"message": "Session not found."}


@router.get("/sessions")
async def list_sessions() -> dict:
    """List active sessions (for debugging)."""
    return {"active_sessions": list(_sessions.keys()), "count": len(_sessions)}
