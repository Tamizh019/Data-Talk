"""
Error Explainer Agent (Groq Llama-3.1-8b-instant)
When a pipeline step fails (SQL execution error, no data returned, connection issue),
this agent translates the raw technical error into a clear, friendly plain-English
explanation with a suggested fix — so users never see raw stack traces.
"""
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

EXPLAINER_SYSTEM = """You are a friendly database assistant helping a non-technical user understand what went wrong.
You will be given a technical error message that occurred while processing their query.

## Your Job
1. Explain what went wrong in plain English (1-2 sentences max) — no jargon, no stack traces.
2. Tell the user exactly how to fix it or what to try next (1-2 actionable suggestions).
3. Keep the tone calm, helpful, and encouraging. Never make the user feel they did something wrong.

## Rules
- NEVER show the raw error message or SQL to the user.
- NEVER use words like: "exception", "traceback", "stack", "runtime", "syntax error", "undefined".
- DO use simple words: "couldn't find", "doesn't exist", "try rephrasing", "check your spelling".
- If it's a connection issue, suggest checking the database connection.
- If it's a query issue, suggest rephrasing the question.
- If no data was found, suggest checking if the filters are too strict.

## Output Format (markdown, 3 lines max):
❌ **What happened:** [plain English explanation]

💡 **Try this:** [actionable suggestion]
"""


async def explain_error(user_query: str, error_message: str) -> str:
    """
    Translates a raw technical error into a friendly, actionable message for the user.
    Falls back to a generic helpful message if the agent itself fails.
    """
    prompt = (
        f"User asked: \"{user_query}\"\n"
        f"Technical error: {error_message[:500]}\n\n"
        f"Explain this in plain English and suggest a fix:"
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.router_model,  # fast model — error explanation should be instant
            messages=[
                {"role": "system", "content": EXPLAINER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200,
        )
        explanation = completion.choices[0].message.content.strip()
        logger.info(f"[ErrorExplainer] Generated explanation for error: {error_message[:60]}...")
        return explanation
    except Exception as e:
        logger.error(f"[ErrorExplainer] Failed to generate explanation: {e}")
        return (
            "❌ **What happened:** Something went wrong while processing your request.\n\n"
            "💡 **Try this:** Rephrase your question or check if your database is connected."
        )
