"""
Self-Correcting SQL Agent.
Executes SQL and, on failure, feeds the error back to Gemini for auto-fix.
Max 3 retry attempts before raising.
"""
import logging

from app.core.agent_service import call_sql_generator
from app.core.sql_executor import execute_sql
from app.core.security import guard_sql

logger = logging.getLogger(__name__)
MAX_RETRIES = 3


async def run_with_correction(
    sql: str,
    schema_context: str,
    original_question: str,
    max_retries: int = MAX_RETRIES,
) -> dict:
    """
    Attempts to execute SQL up to max_retries times.
    On each failure, asks SQLCoder to fix the SQL by describing the error.

    Returns:
        {
            rows: list[dict],
            columns: list[str],
            sql_used: str,
            attempts: int,
        }
    """
    current_sql = sql

    for attempt in range(1, max_retries + 1):
        logger.info(f"[Agent] Attempt {attempt}/{max_retries}: {current_sql[:80]}...")

        try:
            # 1. Security gate
            guard_sql(current_sql)

            # 2. Execute
            rows, columns = await execute_sql(current_sql)
            logger.info(f"[Agent] ✓ Success on attempt {attempt} — {len(rows)} rows")
            return {
                "rows": rows,
                "columns": columns,
                "sql_used": current_sql,
                "attempts": attempt,
            }

        except Exception as e:
            error_message = str(e)
            logger.warning(f"[Agent] ✗ Attempt {attempt} failed: {error_message}")

            if attempt == max_retries:
                raise RuntimeError(
                    f"Query failed after {max_retries} attempts.\n"
                    f"Last SQL: {current_sql}\n"
                    f"Last error: {error_message}"
                )

            # 3. Build a correction prompt and ask Gemini to fix it
            correction_prompt = (
                f"Original Question: {original_question}\n\n"
                f"[CORRECTION NEEDED]\n"
                f"The previous SQL query failed:\n"
                f"SQL: {current_sql}\n"
                f"Error: {error_message}\n\n"
                f"Please write a corrected PostgreSQL SQL query that avoids this error. "
                f"Only output the raw SQL query."
            )
            logger.info(f"[Agent] Asking Gemini to self-correct...")
            current_sql = await call_sql_generator(schema_context, correction_prompt)
