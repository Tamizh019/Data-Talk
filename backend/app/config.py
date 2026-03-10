import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- LLM — Google Gemini (SQL generation + Conversation) ---
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-pro-preview"

    # --- Target PostgreSQL Database ---
    target_db_url: str = "postgresql+asyncpg://datatalk:datatalk_secret@localhost:5432/enterprise_data"

    # --- Qdrant (Schema vector store) ---
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "db_schema"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl: int = 3600  # 1 hour

    # --- Security ---
    max_query_rows: int = 1000
    allowed_sql_prefixes: str = "SELECT,WITH" 

    # --- CORS ---
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
