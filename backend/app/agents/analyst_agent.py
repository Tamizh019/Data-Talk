"""
Analyst Agent (Groq Llama-3.3-70b-versatile)
Produces a structured business summary from SQL results.
Output is raw material for the Formatter Agent.
"""
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

ANALYST_SYSTEM = """You are Data-Talk AI, a Senior Data Analyst.
Your job: read a data result set and produce a clear, factual business analysis.

RULES:
- DO NOT mention SQL, databases, arrays, or any technical terms
- Use plain business language suitable for a non-technical manager
- Always include specific numbers from the data
- Keep bullets concise (1–2 sentences each)
- Do NOT invent data that is not in the result set

OUTPUT FORMAT — use this structure:
[FINDINGS]
• Finding 1 with specific numbers
• Finding 2 with specific numbers  
• Finding 3 (trends, comparisons, outliers if present)

[RECOMMENDATION]
One clear, actionable recommendation starting with a verb.

[FOLLOWUPS]
• Follow-up question 1 relevant to the findings
• Follow-up question 2 exploring a different angle
• Follow-up question 3 suggesting a comparison or trend
"""


async def explain_results(question: str, rows: list, columns: list) -> str:
    """Produces structured raw analysis from a SQL result set."""
    preview = rows[:8] if rows else []
    prompt = (
        f"User asked: \"{question}\"\n"
        f"Data: {len(rows)} rows, columns: {columns}\n"
        f"Sample rows: {preview}\n\n"
        f"Produce your structured analysis:"
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.business_analyst_model,
            messages=[
                {"role": "system", "content": ANALYST_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=600
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"AnalystAgent explanation failed: {e}")
        return "Data retrieved successfully."


async def chat_fallback(history: list, user_query: str) -> str:
    """Handles general conversational queries using prior history."""
    CHAT_SYSTEM = """You are Data-Talk AI, a helpful and knowledgeable data assistant.
Answer questions clearly, concisely, and conversationally.
Use markdown formatting when helpful (bold, bullets, code blocks).
Do NOT pretend to have live data access unless a database is connected.
"""
    try:
        messages = [{"role": "system", "content": CHAT_SYSTEM}]
        if history:
            for msg in history:
                role = "assistant" if msg.get("role") == "model" else msg.get("role", "user")
                if isinstance(msg, dict):
                    content = msg.get("content") or (msg.get("parts", [""])[0] if msg.get("parts") else str(msg))
                else:
                    content = str(msg)
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_query})

        completion = await client.chat.completions.create(
            model=settings.business_analyst_model,
            messages=messages,
            temperature=0.5,
            max_tokens=500
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"AnalystAgent chat failed: {e}")
        return "I'm having trouble thinking right now. Could you rephrase your question?"
