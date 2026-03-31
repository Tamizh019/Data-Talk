"""
Analyst Agent (Groq Llama-3.3-70b-versatile)
Provides the final, friendly business explanation of the data, and handles general chit-chat.
"""
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

ANALYST_SYSTEM = """You are Data-Talk AI, a friendly Senior Data Analyst.
You help non-technical managers understand their business data.
Keep answers concise, clear, and jargon-free (2-3 sentences max for the explanation).
Do NOT mention SQL, databases, or 'arrays' directly. Speak purely about the business insights.

IMPORTANT: You MUST ALWAYS end your response with exactly 3 highly relevant, interesting follow-up questions the user could ask next to dig deeper into the data or business context.
Format them exactly like this at the very end of your response, separated by a blank line:
🔍 **Follow-up Questions You Can Ask:**
• [Question 1]
• [Question 2]
• [Question 3]
"""

async def explain_results(question: str, rows: list, columns: list) -> str:
    """Explains a SQL data result set in plain English."""
    preview = rows[:5] if rows else []
    prompt = (
        f"User asked: \"{question}\"\n"
        f"Data returned {len(rows)} rows. Sample: {preview}\n\n"
        f"Explain this result to the user:"
    )
    
    try:
        completion = await client.chat.completions.create(
            model=settings.business_analyst_model,
            messages=[
                {"role": "system", "content": ANALYST_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"AnalystAgent explanation failed: {e}")
        return "Here is the data you requested."

async def chat_fallback(history: list, user_query: str) -> str:
    """Handles general chit-chat using prior history."""
    try:
        messages = [{"role": "system", "content": ANALYST_SYSTEM}]
        if history:
            for msg in history:
                role = "assistant" if msg.get("role") == "model" else msg.get("role", "user")
                
                if isinstance(msg, dict):
                    if "content" in msg:
                        content = msg["content"]
                    elif "parts" in msg and msg["parts"]:
                        content = msg["parts"][0]
                    else:
                        content = str(msg)
                else:
                    content = str(msg)
                    
                messages.append({
                    "role": role,
                    "content": content
                })
        messages.append({"role": "user", "content": user_query})
        
        completion = await client.chat.completions.create(
            model=settings.business_analyst_model,
            messages=messages,
            temperature=0.5
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"AnalystAgent chat failed: {e}")
        return "I'm having trouble thinking right now. Could you ask again?"
