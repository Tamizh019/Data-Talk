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

INTENT_SYSTEM = """You are an expert intent classifier for a smart enterprise data assistant.
Your ONLY job is to route the user's message to the correct processing engine.

Respond with exactly ONE word from this list (no punctuation, no explanation):
sql      - For ANY direct OR indirect query regarding data, metrics, database records, analytics, statistics, counts, top/bottom lists, filters, or business logic implicitly reliant on a database. When in doubt between SQL and Chat, prefer SQL.
doc_rag  - If the user is specifically referring to or asking about an uploaded document, text file, PDF, guidebook, external knowledge, OR if the context clearly implies visualizing/summarizing/elaborating on a document discussed recently.
chat     - Strictly for general greetings, thanking the assistant, or asking how the system works. Do not use for anything data-related.

Examples:
- 'show me all students with cgpa above 8' -> sql
- 'is there any trend in student performance?' -> sql
- 'who had the top sales this month?' -> sql
- 'summarize the uploaded PDF' -> doc_rag
- 'according to the document, what is the policy?' -> doc_rag
- 'visualize it and tell me about details !!' (when context is about a document) -> doc_rag
- 'hi there' -> chat
- 'thanks for the info' -> chat
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
            temperature=0.1,
            max_tokens=10,
        )
        intent = completion.choices[0].message.content.strip().lower()
        if "sql" in intent: return "sql"
        if "doc" in intent or "rag" in intent: return "doc_rag"
        if "chat" in intent: return "chat"
        return "sql" # safe fallback
    except Exception as e:
        logger.error(f"RouterAgent error: {e}. Falling back to 'sql'.")
        return "sql"
