"""
Conversation History API
Saves and loads conversation history for authenticated users via Supabase REST API.
Supports per-user isolation so each user only ever sees their own conversations.
"""
import logging
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

SUPABASE_URL = settings.supabase_url
SUPABASE_SERVICE_KEY = settings.supabase_service_role_key


def _admin_headers() -> dict:
    """Build headers for Supabase admin (service-role) REST calls."""
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


async def _get_user_id(auth_header: str) -> Optional[str]:
    """Validate the user's JWT and return their user_id from Supabase."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        return None
    data = resp.json()
    return data.get("id")


# ── Pydantic Models ────────────────────────────────────────────────────────────

class ConversationSave(BaseModel):
    id: str
    title: str
    messages: list
    updated_at: int  # epoch ms


class ConversationsBatch(BaseModel):
    conversations: list[ConversationSave]


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/conversations", tags=["conversations"])
async def get_conversations(authorization: str = Header(default="")):
    """
    Return all conversations for the authenticated user, ordered by most recent.
    The frontend calls this on mount to restore history from Supabase.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/chat_conversations",
            headers={**_admin_headers(), "Prefer": ""},
            params={
                "user_id": f"eq.{user_id}",
                "order": "updated_at.desc",
                "limit": "100",
                "select": "id,title,messages,updated_at",
            },
        )

    if resp.status_code != 200:
        logger.error(f"[Conversations] Supabase fetch failed: {resp.text}")
        raise HTTPException(status_code=500, detail="Failed to load conversations")

    return {"conversations": resp.json()}


@router.post("/conversations/sync", tags=["conversations"])
async def sync_conversations(
    payload: ConversationsBatch,
    authorization: str = Header(default=""),
):
    """
    Batch-upsert conversations for the authenticated user.
    Called by the frontend whenever a new message is sent or a chat is renamed.
    Uses Supabase upsert (on conflict id) so it safely updates existing rows.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    rows = [
        {
            "id": c.id,
            "user_id": user_id,
            "title": c.title,
            "messages": c.messages,
            "updated_at": c.updated_at,
        }
        for c in payload.conversations
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/chat_conversations",
            headers={**_admin_headers(), "Prefer": "resolution=merge-duplicates"},
            json=rows,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"[Conversations] Supabase upsert failed: {resp.text}")
        raise HTTPException(status_code=500, detail="Failed to save conversations")

    logger.info(f"[Conversations] Synced {len(rows)} conversations for user {user_id[:8]}...")
    return {"status": "synced", "count": len(rows)}


@router.delete("/conversations/{conversation_id}", tags=["conversations"])
async def delete_conversation(
    conversation_id: str,
    authorization: str = Header(default=""),
):
    """Delete a single conversation by id (only if it belongs to the user)."""
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/chat_conversations",
            headers={**_admin_headers(), "Prefer": ""},
            params={"id": f"eq.{conversation_id}", "user_id": f"eq.{user_id}"},
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to delete conversation")

    return {"status": "deleted"}
