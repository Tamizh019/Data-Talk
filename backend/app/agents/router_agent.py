"""
Router Agent (Groq Llama-3.1-8b-instant)
Responsible for instantly classifying a user query as 'sql' or 'chat'.
"""
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Groq client
client = AsyncGroq(api_key=settings.groq_api_key)

INTENT_SYSTEM = """You are an intent classifier for a database assistant.
Your job: decide if the user wants to query data from a database, or just have a conversation.

Respond with exactly ONE word:
  sql   - if the user is asking for data, statistics, records, comparisons, or reports from a database
  chat  - if the user is greeting, asking how something works, or having a general conversation

Examples:
  'show me all students with cgpa above 8' -> sql
  'can I know about students who are above cgpa 8.4' -> sql
  'what is the average salary' -> sql
  'list products below 100 in stock' -> sql
  'hi' -> chat
  'what does cgpa mean' -> chat
  'how does this app work' -> chat
  'yes' -> chat
  'thanks' -> chat
"""

async def classify_intent(query: str, history: list = None) -> str:
    """Uses Groq to instantly classify query intent."""
    history_text = ""
    if history:
        recent_history = history[-4:]
        lines = []
        for msg in recent_history:
            role = "User" if msg["role"] == "user" else "Assistant"
            content = msg.get("content", str(msg)) if isinstance(msg, dict) else str(msg)
            lines.append(f"{role}: {content[:150]}")
        if lines:
            history_text = "Recent context:\n" + "\n".join(lines) + "\n\n"

    prompt = f"{history_text}User message: {query}\nIntent:"
    
    try:
        completion = await client.chat.completions.create(
            model=settings.groq_router_model,
            messages=[
                {"role": "system", "content": INTENT_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=10,
        )
        intent = completion.choices[0].message.content.strip().lower()
        if "sql" in intent: return "sql"
        if "chat" in intent: return "chat"
        return "sql" # safe fallback
    except Exception as e:
        logger.error(f"RouterAgent error: {e}. Falling back to 'sql'.")
        return "sql"
