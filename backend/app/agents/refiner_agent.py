"""
Response Formatter Agent — Final Intelligence Layer
Compares the user's original question with the analyst's raw findings
and produces a beautifully formatted, title-first, question-answering response.

This is the ONLY layer the user sees in the UI.
It must:
  - Generate a clear, descriptive title that directly names what was found
  - Format the answer to actually solve what the user asked
  - Match the structure to the type of question (comparison, ranking, total, trend, etc.)
  - Never use generic headers like "Key Insight" or "Key Findings" unless relevant
"""
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

FORMATTER_SYSTEM = """You are a world-class data communication expert.

Your job: take a user's question + raw data analysis, then produce a PERFECTLY FORMATTED response
that directly and clearly answers what they asked.

## CRITICAL RULES

1. **Title First** — Always start with a `##` markdown title that captures THE KEY FINDING, not the question.
   - Bad title: "Analysis of Student CGPA"
   - Good title: "Average CGPA is 7.4 — Engineering leads at 8.1"
   - Good title: "Sales grew 23% in Q4 — Electronics drove the increase"

2. **Match format to the question type:**
   - Ranking/Top N → use a numbered list with values
   - Single aggregate (avg, total, count) → bold the number upfront, then explain
   - Comparison → use a small table or side-by-side bullets
   - Trend/Time series → describe direction + magnitude then bullets
   - Overview/Summary → short paragraph + key bullets
   - Yes/No question → answer directly first, then support with data

3. **Use real numbers** — always include the specific figures from the data.

4. **End with follow-ups** — exactly 3 concise follow-up questions formatted like:
   ---
   **Explore further:**
   - [question 1]
   - [question 2]
   - [question 3]

5. **Never use these as headers:** "Key Insight", "Key Findings", "Recommendation" — unless the question specifically asks for recommendations.

6. **Tone:** Direct, confident, data-driven. Like a brilliant analyst explaining to a smart colleague — not a corporate report.

7. **Length:** Concise. Do NOT pad. If the answer is simple, keep it short. If complex, use structure.

8. Remove any robotic language. No "As an AI", "Here is the analysis", "Based on the data provided".

OUTPUT: Clean markdown only. No JSON, no code blocks, no preamble.
"""


async def format_response(user_query: str, raw_analysis: str) -> str:
    """
    Final intelligence layer: compares the user question vs raw analysis
    and produces a contextually appropriate, beautifully formatted response.
    """
    prompt = (
        f"### User's Original Question\n{user_query}\n\n"
        f"### Raw Analyst Findings\n{raw_analysis}\n\n"
        f"### Your Task\n"
        f"Produce the final beautifully formatted response that directly answers the user's question. "
        f"Start with a ## title capturing the key finding, then format the answer to match the question type."
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.refiner_model,
            messages=[
                {"role": "system", "content": FORMATTER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=700
        )
        formatted = completion.choices[0].message.content.strip()
        logger.info("[FormatterAgent] Successfully formatted response.")
        return formatted

    except Exception as e:
        logger.warning(f"[FormatterAgent] Failed: {e}. Returning raw analysis.")
        return raw_analysis
