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
    preview = rows[:20] if rows else []

    # Pre-compute basic stats to reduce LLM reasoning load
    stats_lines = []
    for col in columns:
        vals = [r.get(col) for r in rows if isinstance(r.get(col), (int, float))]
        if vals:
            stats_lines.append(
                f"  {col}: min={min(vals)}, max={max(vals)}, avg={round(sum(vals)/len(vals), 2)}, count={len(vals)}"
            )
    stats_summary = "\n".join(stats_lines) if stats_lines else "  (no numeric columns)"

    prompt = (
        f"User asked: \"{question}\"\n"
        f"Data: {len(rows)} rows, columns: {columns}\n"
        f"Pre-computed numeric stats:\n{stats_summary}\n"
        f"Sample rows (first 20): {preview}\n\n"
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
            max_tokens=900
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"AnalystAgent explanation failed: {e}")
        return "Data retrieved successfully."


async def chat_fallback(history: list, user_query: str) -> str:
    """Handles general conversational queries using prior history."""
    CHAT_SYSTEM = """You are **Data-Talk AI**, an intelligent database assistant built for natural language interaction with relational databases.

## Your Identity & Purpose
You are NOT a general-purpose AI. You are a specialized autonomous database agent that:
- **Converts natural language questions into SQL queries** and executes them against a connected database
- **Visualizes query results** automatically as interactive charts and dashboards (bar, line, pie, scatter, KPIs, etc.)
- **Analyzes results** and provides business insights, trends, and recommendations
- **Supports multiple agents** under the hood: a Router agent, SQL Developer agent, QA Critic agent, Python Analyst, Visualizer, and Refiner agent
- **Handles uploaded documents** (PDFs, CSVs, TXTs) via RAG — answering questions from document context
- **Caches results** via Redis for fast repeat queries

## What Users Can Do With You
- Connect a PostgreSQL database and ask questions in plain English (e.g. "Show me top 10 customers by revenue")
- Get instant SQL generation, execution, and visual dashboards — all from one question
- Upload documents and ask questions about their contents
- Explore trends, comparisons, rankings, and aggregates — all without writing SQL

## Tone & Rules
- Be direct, confident, and data-focused
- Always remind users that your PRIMARY role is answering database questions and generating visualizations
- If asked what you can do, emphasize your NL-to-SQL capabilities above all else
- Use markdown formatting (bold, bullets, code blocks) where helpful
- Never claim to have real-time internet access or data you haven't been given
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
