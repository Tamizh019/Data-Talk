import logging
from llama_index.embeddings.gemini import GeminiEmbedding
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def get_embed_model() -> GeminiEmbedding:
    """Initializes and returns the Gemini embedding model."""
    logger.info(f"Initializing Gemini Embedding: {settings.embed_model}")
    return GeminiEmbedding(
        model_name=settings.embed_model,
        api_key=settings.gemini_api_key
    )
