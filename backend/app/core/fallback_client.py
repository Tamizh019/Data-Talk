"""
Fallback LLM Client — GitHub Models (Azure AI Inference)
=========================================================
Provides an OpenAI-compatible async client pointing at GitHub's free model
inference endpoint. Used automatically when Groq rate-limits or fails.

Supported model tiers:
  - "light"  ->  microsoft/Phi-4       (fast, for router & refiner)
  - "heavy"  ->  openai/gpt-4o-mini    (powerful, for analyst, QA, python)

GitHub Models Free Tier: ~150 req/day per model.
Docs: https://docs.github.com/en/github-models
"""
import logging
from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# GitHub Models uses the OpenAI SDK with a custom base_url + GitHub PAT as API key
_github_client: AsyncOpenAI | None = None


def _get_github_client() -> AsyncOpenAI:
    """Lazily create and cache the GitHub Models client."""
    global _github_client
    if _github_client is None:
        if not settings.github_token:
            raise RuntimeError(
                "GITHUB_TOKEN is not set. Cannot use GitHub Models fallback. "
                "Add GITHUB_TOKEN=ghp_... to your .env file."
            )
        _github_client = AsyncOpenAI(
            base_url="https://models.inference.ai.azure.com",
            api_key=settings.github_token,
        )
    return _github_client


async def github_chat_completion(
    tier: str,
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 500,
    response_format: dict | None = None,
) -> str:
    """
    Call GitHub Models and return the assistant's text content.

    Args:
        tier:            "light" (Phi-4) or "heavy" (gpt-4o-mini)
        messages:        OpenAI-format message list
        temperature:     Sampling temperature
        max_tokens:      Maximum output tokens
        response_format: Optional dict, e.g. {"type": "json_object"}

    Returns:
        The model's response as a stripped string.
    """
    client = _get_github_client()
    model = (
        settings.github_fallback_model_light
        if tier == "light"
        else settings.github_fallback_model_heavy
    )

    logger.warning(
        f"[FallbackClient] Groq unavailable — using GitHub Models ({model})"
    )

    kwargs: dict = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format

    completion = await client.chat.completions.create(**kwargs)
    return completion.choices[0].message.content.strip()
