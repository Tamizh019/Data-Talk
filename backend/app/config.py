import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- LLM — Google Gemini (SQL generation + Conversation) ---
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-pro-preview"

    # --- Multi-Agent Setup (Groq & OpenRouter) ---
    groq_api_key: str = ""
    groq_router_model: str = "llama-3.1-8b-instant"
    groq_qa_model: str = "llama-3.3-70b-versatile"
    openrouter_api_key: str = ""
    openrouter_sql_model: str = "anthropic/claude-3.5-sonnet"

    # --- Target PostgreSQL Database (Client's DB - for SQL queries only) ---
    target_db_url: str = ""
    target_schema: str = "public"

    # --- System PostgreSQL Database (Permanent Supabase - for all pgvector storage) ---
    system_db_url: str = ""

    # --- Vector Store (LlamaIndex + pgvector) ---
    use_pgvector: bool = True
    embed_model: str = "models/text-embedding-004"
    pgvector_collection: str = "data_talk_vectors"

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
