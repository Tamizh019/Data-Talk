"""
SQL Developer Agent (Google Gemini)
Generates complex PostgreSQL statements based on the schema and question.
Handles very large schema contexts and history using Gemini's huge context window.
"""
import logging
import google.generativeai as genai
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.gemini_model)

SQL_SYSTEM = """You are an expert PostgreSQL SQL generator.
Your ONLY output is a single, valid, read-only SQL SELECT statement.
Do NOT include explanations, markdown code fences, or comments.
Only output the raw SQL query itself ending with a semicolon.

Rules:
- Use only SELECT or WITH statements.
- Always use proper table and column names from the schema provided.
- Never use DROP, DELETE, UPDATE, INSERT, or any mutation.
"""

async def generate_sql(schema_context: str, user_query: str, history: list = None, error_context: str = None) -> str:
    """Generates SQL using Gemini."""
    
    # 1. Format history context
    history_text = ""
    if history and not error_context:
        recent_history = history[-4:]
        lines = []
        for msg in recent_history:
            role = "User" if msg["role"] == "user" else "Assistant"
            content = msg.get("content", str(msg)) if isinstance(msg, dict) else str(msg)
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
        response = await _model.generate_content_async(prompt)
        sql = response.text.strip()
        # Clean output
        sql = sql.replace("```sql", "").replace("```", "").strip()
        if not sql.upper().startswith(("SELECT", "WITH", "EXPLAIN")):
            raise ValueError(f"Agent did not return a SELECT statement. Got: {sql[:50]}")
        return sql
    except Exception as e:
        logger.error(f"SQLAgent error: {e}")
        raise RuntimeError(f"SQL Developer Agent failed: {str(e)}")
