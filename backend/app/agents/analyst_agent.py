"""
Analyst Agent (Groq Llama-3.3-70b-versatile)
Produces a structured business summary from SQL results.
Output is raw material for the Formatter Agent.
Fallback: gpt-4o-mini via GitHub Models if Groq is unavailable.
"""
import logging
from groq import AsyncGroq
from app.config import get_settings
from app.core.fallback_client import github_chat_completion

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

ANALYST_SYSTEM = """You are Data-Talk AI, a Senior Data Analyst tasked with analyzing exactly the data rows provided.

╔══════════════════════════════════════════════════════╗
║  CRITICAL ANTI-HALLUCINATION RULES — READ CAREFULLY ║
╚══════════════════════════════════════════════════════╝
1. ONLY use names, numbers, and values that appear EXACTLY in the DATA ROWS below.
2. NEVER invent, guess, or approximate any name, value, or fact.
3. If a name is not in the data, DO NOT mention it. Period.
4. Copy names and numbers character-for-character from the data — do not paraphrase them.
5. DO NOT mention SQL, databases, arrays, or any technical terms.
6. Use plain business language suitable for a non-technical manager.

OUTPUT FORMAT — use this structure exactly:
[FINDINGS]
• Finding 1 with exact numbers from the data
• Finding 2 with exact numbers from the data
• Finding 3 (trends, comparisons, outliers — only if the data supports it)

[RECOMMENDATION]
One clear, actionable recommendation starting with a verb.

[FOLLOWUPS]
• Follow-up question 1 relevant to the findings
• Follow-up question 2 exploring a different angle
• Follow-up question 3 suggesting a comparison or trend
"""


async def explain_results(question: str, rows: list, columns: list) -> str:
    """Produces structured raw analysis from a SQL result set."""
    preview = rows[:50] if rows else []

    # Build an explicit numbered table string so the LLM can't confuse or hallucinate values
    table_lines = ["\nDATA ROWS (use ONLY these values — do not invent any):"]
    header = " | ".join(columns)
    table_lines.append(f"{'#':>3}  {header}")
    table_lines.append("-" * (len(header) + 6))
    for i, row in enumerate(preview, 1):
        row_str = " | ".join(str(row.get(c, "")) for c in columns)
        table_lines.append(f"{i:>3}. {row_str}")
    if len(rows) > len(preview):
        table_lines.append(f"  ... and {len(rows) - len(preview)} more rows (not shown, do not reference them by name)")
    data_table = "\n".join(table_lines)

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
        f"Total rows returned: {len(rows)} | Columns: {columns}\n"
        f"Pre-computed numeric stats (verified from data):\n{stats_summary}\n"
        f"{data_table}\n\n"
        f"IMPORTANT: Every name, number, and fact you write MUST come directly from the DATA ROWS above.\n"
        f"Produce your structured analysis:"
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.business_analyst_model,
            messages=[
                {"role": "system", "content": ANALYST_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0,   # Zero temperature = maximum factual fidelity, no creative guessing
            max_tokens=900
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"[AnalystAgent] Groq failed ({e}). Trying GitHub Models (gpt-4o-mini) fallback...")
        try:
            messages = [
                {"role": "system", "content": ANALYST_SYSTEM},
                {"role": "user", "content": prompt}
            ]
            return await github_chat_completion(
                tier="heavy", messages=messages, temperature=0, max_tokens=900
            )
        except Exception as fallback_err:
            logger.error(f"[AnalystAgent] Fallback also failed: {fallback_err}.")
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
        logger.warning(f"[AnalystAgent] Chat Groq failed ({e}). Trying GitHub Models (gpt-4o-mini) fallback...")
        try:
            return await github_chat_completion(
                tier="heavy", messages=messages, temperature=0.5, max_tokens=500
            )
        except Exception as fallback_err:
            logger.error(f"[AnalystAgent] Chat fallback also failed: {fallback_err}.")
            return "I'm having trouble thinking right now. Could you rephrase your question?"

async def explain_sql_query(sql: str) -> str:
    """Explains a SQL query in plain English, adapting depth to query complexity."""
    SYSTEM = """You are an expert Data Analyst explaining SQL queries to business users.

RULES:
- Explain in plain, clear English — no raw SQL terms like SELECT/FROM/WHERE unless you explain what they mean in plain English
- Adapt your explanation length to query complexity:
  • Simple query (1-2 clauses) → 2-3 sentences, concise
  • Medium query (joins, filters, grouping) → 4-6 bullet points covering each logical step
  • Complex query (subqueries, CTEs, multiple joins) → structured breakdown up to 8 lines
- Use a friendly, clear tone suitable for a non-technical business user
- Always state: what data is being fetched, from where, any filters/conditions applied, any aggregations or sorting
- Format your output using short bullet points (•) for each logical step — do NOT write a long paragraph
- Do NOT start with "This query..." — start directly with "• Fetches..." or similar
- Do NOT repeat the SQL back"""
    prompt = f"Explain this SQL query:\n\n{sql}"

    try:
        completion = await client.chat.completions.create(
            model=settings.business_analyst_model,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=600
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"[AnalystAgent] explain_sql Groq failed ({e}). Trying fallback...")
        try:
            return await github_chat_completion(
                tier="heavy",
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=400
            )
        except Exception:
            return "Unable to explain this query at the moment."
