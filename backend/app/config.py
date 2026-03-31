import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- API Keys ---
    gemini_api_key: str = ""
    groq_api_key: str = ""
    github_token: str = ""
    hf_token: str = ""

    # --- Multi-Agent Setup (The 9-Agent Workflow) ---
    router_model: str = "llama-3.1-8b-instant"
    doc_rag_model: str = "llama-3.3-70b-versatile"
    visualizer_model: str = "gemini-3.1-pro-preview"
    sql_generator_model: str = "gemini-3.1-pro-preview"
    qa_critic_model: str = "llama-3.3-70b-versatile"
    python_agent_model: str = "llama-3.3-70b-versatile"
    business_analyst_model: str = "llama-3.3-70b-versatile"
    refiner_model: str = "llama-3.1-8b-instant"

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
