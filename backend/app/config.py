import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Groq LLM ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- Qdrant Vector DB ---
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "rag_knowledge_base"

    # --- Embedding ---
    embedding_model: str = "BAAI/bge-large-en-v1.5"
    embedding_device: str = "cpu"  # change to "cuda" if GPU available

    # --- Chunking ---
    chunk_size: int = 512
    chunk_overlap: int = 64

    # --- Retrieval ---
    top_k_results: int = 5
    similarity_threshold: float = 0.4

    # --- Storage ---
    data_dir: str = "data"

    # --- CORS ---
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
