"""
SQL Developer Agent
Generates complex PostgreSQL statements based on the schema and question.
"""
import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = genai.Client(api_key=settings.gemini_api_key)

SQL_SYSTEM = """You are an expert PostgreSQL SQL generator.
Your ONLY output is a single, valid, read-only SQL SELECT statement.
Do NOT include explanations, markdown code fences, or comments.
Only output the raw SQL query itself ending with a semicolon.

Rules:
- Use only SELECT or WITH statements.
- Always use the EXACT table and column names from the schema provided.
- CRITICAL: Do NOT guess or pluralize table names (e.g., do not use `students` if the schema says `student_database`). If you use a table that is not in the schema, the query will crash!
- Never use DROP, DELETE, UPDATE, INSERT, or any mutation.
- NEVER use JSON formatting functions like `json_agg`, `row_to_json`, or `array_agg` to build complex nested responses.
- Always return standard flat relational tables (rows and columns).
- If the user asks a multi-part question (e.g. "totals and a list"), write a query that returns the MOST DETAILED list of raw data. Do NOT try to return totals and lists in a single JSON row. The downstream visualizer will calculate totals from your raw data.
- Always cast date/timestamp columns to ISO-8601 string format using TO_CHAR(col, 'YYYY-MM-DD') for readability.
- Add a LIMIT clause (default LIMIT 500) if the query might return a large unbounded dataset, unless the user explicitly asks for all records.
"""

async def generate_sql(schema_context: str, user_query: str, history: list = None, error_context: str = None) -> str:
    """Generates SQL using Gemini."""
    
    # 1. Format history context
    history_text = ""
    if history and not error_context:
        recent_history = history[-4:]
        lines = []
        for msg in recent_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            
            if isinstance(msg, dict):
                if "content" in msg:
                    content = msg["content"]
                elif "parts" in msg and msg["parts"]:
                    content = msg["parts"][0]
                else:
                    content = str(msg)
            else:
                content = str(msg)
                
            lines.append(f"{role}: {content[:500]}")
        if lines:
            history_text = "### Recent Conversation Context (for reference)\n" + "\n".join(lines) + "\n\n"

    # 2. Build prompt based on regular vs correction mode
    if error_context:
        prompt = f"""
{SQL_SYSTEM}

### Database Schema
{schema_context}

### Original Question
{user_query}

{error_context}

### Corrected SQL Query (output only the raw SQL):
"""
    else:
        prompt = f"""
{SQL_SYSTEM}

### Database Schema
{schema_context}

{history_text}### User Question
{user_query}

### SQL Query (output only the raw SQL, nothing else):
"""

    try:
        response = await _client.aio.models.generate_content(
            model=settings.sql_generator_model,
            contents=prompt,
        )
        sql = response.text.strip()
        # Clean output
        sql = sql.replace("```sql", "").replace("```", "").strip()
        if not sql.upper().startswith(("SELECT", "WITH", "EXPLAIN")):
            raise ValueError(f"Agent did not return a SELECT statement. Got: {sql[:50]}")
        return sql
    except Exception as e:
        logger.error(f"SQLAgent error: {e}")
        raise RuntimeError(f"SQL Developer Agent failed: {str(e)}")
