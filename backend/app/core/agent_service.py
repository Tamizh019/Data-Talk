"""
Hybrid LLM Router:
  - SQL Generation  → SQLCoder-7B via Together AI
  - Conversation    → Google Gemini Pro
"""
import logging
from typing import Literal

import google.generativeai as genai

from app.config import get_settings
from app.core.security import guard_prompt

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Gemini setup ──────────────────────────────────────────────────────
genai.configure(api_key=settings.gemini_api_key)
_gemini_model = genai.GenerativeModel(settings.gemini_model)

# ── Conversational keywords (triggers Gemini) ─────────────────────────
CONVERSATIONAL_KEYWORDS = {
    "explain", "why", "what does", "what is", "tell me", "describe",
    "help", "hi", "hello", "thanks", "thank you", "how does", "what are",
    "who are", "can you", "could you explain",
}


INTENT_SYSTEM = """You are an intent classifier for a database assistant.
Your job: decide if the user wants to query data from a database, or just have a conversation.

Respond with exactly ONE word:
  sql   — if the user is asking for data, statistics, records, comparisons, or reports from a database
  chat  — if the user is greeting, asking how something works, or having a general conversation

Examples:
  'show me all students with cgpa above 8' → sql
  'can I know about students who are above cgpa 8.4' → sql
  'what is the average salary' → sql
  'list products below 100 in stock' → sql
  'hi' → chat
  'what does cgpa mean' → chat
  'how does this app work' → chat
  'yes' → chat
  'thanks' → chat
"""

async def classify_intent(query: str) -> Literal["sql", "chat"]:
    """
    Uses Gemini to classify whether query should generate SQL or go to conversation.
    """
    prompt = f"{INTENT_SYSTEM}\n\nUser message: {query}\nIntent:"
    response = await _gemini_model.generate_content_async(prompt)
    return response.text


# ── SQL Generation via Gemini ─────────────────────────────────────────
SQL_SYSTEM = """You are an expert PostgreSQL SQL generator.
Your ONLY output is a single, valid, read-only SQL SELECT statement.
Do NOT include explanations, markdown code fences, or comments.
Only output the raw SQL query itself ending with a semicolon.

Rules:
- Use only SELECT or WITH statements.
- Always use proper table and column names from the schema provided.
- Never use DROP, DELETE, UPDATE, INSERT, or any mutation.
"""


async def call_sql_generator(schema_context: str, user_query: str) -> str:
    """
    Calls Gemini to generate SQL from a natural language query.
    Returns a clean SQL SELECT string without markdown fences.
    """
    prompt = f"""{SQL_SYSTEM}

### Database Schema
{schema_context}

### User Question
{user_query}

### SQL Query (output only the SQL, nothing else):
"""
    response = await _gemini_model.generate_content_async(prompt)
    sql = response.text.strip()

    # Strip any accidental markdown fences Gemini may add
    sql = sql.replace("```sql", "").replace("```", "").strip()
    # Remove trailing semicolons for safety (added back by executor if needed)
    if not sql.upper().startswith(("SELECT", "WITH")):
        raise ValueError(f"SQL generator returned a non-SELECT query: {sql[:100]}")

    logger.info(f"Gemini SQL generated: {sql[:80]}...")
    return sql


# ── Gemini for conversation ───────────────────────────────────────────
GEMINI_SYSTEM = """You are Data-Talk AI, a friendly data analyst assistant.
You help non-technical managers understand their business data.
The PostgreSQL database IS ALREADY CONNECTED. Do NOT tell the user to connect their database.
Keep answers concise, clear, and jargon-free.
When asked about data results, explain them in plain business language."""

async def call_gemini_chat(history: list, user_query: str) -> str:
    """
    Sends a conversational query to Gemini.
    History format: [{"role": "user"|"model", "parts": ["text"]}]
    """
    chat = _gemini_model.start_chat(
        history=history or [],
    )
    response = await chat.send_message_async(
        f"{GEMINI_SYSTEM}\n\nUser: {user_query}"
    )
    return response.text


async def call_gemini_explain(question: str, rows: list, columns: list) -> str:
    """Ask Gemini to explain a SQL result in plain English."""
    preview = rows[:5] if rows else []
    prompt = (
        f"{GEMINI_SYSTEM}\n\n"
        f"The user asked: \"{question}\"\n"
        f"The database returned {len(rows)} rows with columns: {columns}.\n"
        f"Sample data: {preview}\n\n"
        f"Explain this result in 2-3 friendly sentences for a business manager."
    )
    response = await _gemini_model.generate_content_async(prompt)
    return response.text


# ── Main Router ───────────────────────────────────────────────────────
async def route_query(
    user_query: str,
    schema_context: str,
    history: list,
) -> dict:
    """
    Routes the query to the appropriate LLM.
    Returns: { intent, sql? }
    """
    guard_prompt(user_query)          # Raises if injection detected
    intent_raw = await classify_intent(user_query)
    intent: Literal["sql", "chat"] = "sql" if "sql" in intent_raw.lower() else "chat"
    logger.info(f"[Intent] '{user_query[:50]}' → {intent}")

    if intent == "sql":
        sql = await call_sql_generator(schema_context, user_query)
        return {"intent": "sql", "sql": sql}
    else:
        explanation = await call_gemini_chat(history, user_query)
        return {"intent": "chat", "explanation": explanation}
