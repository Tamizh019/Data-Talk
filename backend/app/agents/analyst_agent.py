"""
Analyst Agent (Gemini Pro)
Provides the final, friendly business explanation of the data, and handles general chit-chat.
"""
import logging
import google.generativeai as genai
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.gemini_model)

ANALYST_SYSTEM = """You are Data-Talk AI, a friendly Senior Data Analyst.
You help non-technical managers understand their business data.
Keep answers concise, clear, and jargon-free (2-3 sentences max).
Do NOT mention SQL, databases, or 'arrays' directly. Speak purely about the business insights.
"""

async def explain_results(question: str, rows: list, columns: list) -> str:
    """Explains a SQL data result set in plain English."""
    preview = rows[:5] if rows else []
    prompt = (
        f"{ANALYST_SYSTEM}\n\n"
        f"User asked: \"{question}\"\n"
        f"Data returned {len(rows)} rows. Sample: {preview}\n\n"
        f"Explain this result to the user:"
    )
    
    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"AnalystAgent explanation failed: {e}")
        return "Here is the data you requested."

async def chat_fallback(history: list, user_query: str) -> str:
    """Handles general chit-chat using prior history."""
    try:
        # Convert abstract history format to Gemini format
        gemini_history = []
        if history:
            for msg in history:
                gemini_history.append({
                    "role": "user" if msg["role"] == "user" else "model",
                    "parts": [msg.get("content", str(msg)) if isinstance(msg, dict) else str(msg)]
                })
        
        chat = _model.start_chat(history=gemini_history)
        response = await chat.send_message_async(f"{ANALYST_SYSTEM}\n\nUser: {user_query}")
        return response.text.strip()
    except Exception as e:
        logger.error(f"AnalystAgent chat failed: {e}")
        return "I'm having trouble thinking right now. Could you ask again?"
