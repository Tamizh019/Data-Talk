"""
Redis-based cache for query results.
Key format: query:<normalized_question>
"""
import json
import hashlib
import logging
from typing import Any, Optional

import redis.asyncio as redis
from app.config import get_settings

logger = logging.getLogger(__name__)
_redis_client: Optional[redis.Redis] = None


def _get_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


def _make_key(query: str) -> str:
    """Normalize and hash query to produce a stable cache key."""
    normalized = query.strip().lower()
    return "datatalk:query:" + hashlib.md5(normalized.encode()).hexdigest()


async def get_cached(query: str) -> Optional[dict]:
    """Returns cached result dict or None."""
    try:
        client = _get_client()
        value = await client.get(_make_key(query))
        if value:
            logger.info(f"Cache HIT for: {query[:60]}")
            return json.loads(value)
    except Exception as e:
        logger.warning(f"Redis get error: {e}")
    return None


async def set_cached(query: str, data: dict, ttl: Optional[int] = None) -> None:
    """Stores result in Redis with TTL (defaults to config value)."""
    try:
        settings = get_settings()
        client = _get_client()
        await client.set(
            _make_key(query),
            json.dumps(data, default=str),       # default=str handles dates/Decimals
            ex=ttl or settings.cache_ttl,
        )
        logger.info(f"Cache SET for: {query[:60]}")
    except Exception as e:
        logger.warning(f"Redis set error: {e}")


async def invalidate(query: str) -> None:
    """Removes a specific query from cache."""
    try:
        client = _get_client()
        await client.delete(_make_key(query))
    except Exception as e:
        logger.warning(f"Redis delete error: {e}")
