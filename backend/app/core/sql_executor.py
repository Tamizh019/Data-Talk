"""
Safe, read-only SQL execution against the target PostgreSQL database.
Uses SQLAlchemy async engine with row limits enforced server-side.
"""
from typing import Any

import sqlalchemy
from sqlalchemy.ext.asyncio import create_async_engine, AsyncConnection
from app.config import get_settings

_engine = None


def get_db_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        is_postgres = settings.target_db_url.startswith("postgresql")

        connect_args = {}
        execution_options = {}

        if is_postgres:
            connect_args = {
                "command_timeout": 10,
                "server_settings": {"search_path": settings.target_schema}
            }
            execution_options = {"postgresql_readonly": True}
        # For MySQL, we omit these Postgres-specific args

        _engine = create_async_engine(
            settings.target_db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args=connect_args,
            execution_options=execution_options,
        )
    return _engine


async def execute_sql(sql: str) -> tuple[list[dict], list[str]]:
    """
    Executes a SELECT query and returns (rows as list-of-dicts, column names).
    Automatically injects a LIMIT clause if not present.
    Raises RuntimeError on execution failure.
    """
    settings = get_settings()

    # Inject LIMIT if not already present to prevent massive result sets
    upper_sql = sql.upper()
    if "LIMIT" not in upper_sql:
        sql = sql.rstrip(";") + f" LIMIT {settings.max_query_rows}"

    engine = get_db_engine()

    try:
        async with engine.connect() as conn:
            result = await conn.execute(sqlalchemy.text(sql))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
            return rows, columns
    except Exception as e:
        raise RuntimeError(f"SQL execution failed: {str(e)}")


async def get_schema_info() -> str:
    """
    Fetches table names and column definitions from PostgreSQL information_schema.
    Returns a human-readable schema string for LlamaIndex indexing.
    """
    schema_query = sqlalchemy.text("""
    SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE t.table_schema = :schema
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.ordinal_position;
    """)
    # For schema discovery we use a regular (non-read-only) connection
    settings = get_settings()
    is_postgres = settings.target_db_url.startswith("postgresql")
    
    connect_args = {}
    if is_postgres:
        connect_args = {"server_settings": {"search_path": settings.target_schema}}

    engine = create_async_engine(
        settings.target_db_url, 
        pool_pre_ping=True,
        connect_args=connect_args
    )

    try:
        async with engine.connect() as conn:
            result = await conn.execute(schema_query, {"schema": settings.target_schema})
            rows = result.fetchall()

        if not rows:
            return "No tables found in the public schema."

        # Format as readable schema
        schema_lines = ["# Database Schema\n"]
        current_table = None
        for table, col, dtype, nullable, default in rows:
            if table != current_table:
                schema_lines.append(f"\n## Table: {table}")
                current_table = table
            null_str = "NULL" if nullable == "YES" else "NOT NULL"
            schema_lines.append(f"  - {col}: {dtype} {null_str}")

        return "\n".join(schema_lines)
    finally:
        await engine.dispose()
