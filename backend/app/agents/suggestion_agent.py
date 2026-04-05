"""
Schema-Aware Suggestion Agent (Gemini)
On database connection, analyses the schema and proactively suggests
the most useful and interesting questions the user can ask.
Called once after a successful DB connection — output is streamed to the frontend
as a 'suggestion' event.
"""
import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = genai.Client(api_key=settings.gemini_api_key)

SUGGESTION_SYSTEM = """You are an expert database analyst onboarding a new user.
You have been given a database schema. Your job is to generate helpful, specific,
and interesting questions the user can immediately ask about their data.

## Rules
- Generate exactly 6 questions grouped into 3 categories.
- Questions must be SPECIFIC to the actual table/column names in the schema — not generic.
- Make questions progressively more interesting: start with basics, then trends, then insights.
- Questions should be phrased naturally, exactly as a business user would type them.
- DO NOT mention SQL, databases, or technical terms in the questions.

## Categories
1. **Quick Overview** (2 questions) — simple counts, totals, or summaries
2. **Trends & Rankings** (2 questions) — top N, time trends, rankings
3. **Deep Insights** (2 questions) — correlations, anomalies, comparisons

## Output Format (strict JSON, no fences):
{
  "greeting": "One-sentence friendly intro about what this database contains.",
  "categories": [
    {
      "label": "Quick Overview",
      "icon": "📊",
      "questions": ["Question 1", "Question 2"]
    },
    {
      "label": "Trends & Rankings",
      "icon": "📈",
      "questions": ["Question 3", "Question 4"]
    },
    {
      "label": "Deep Insights",
      "icon": "🔍",
      "questions": ["Question 5", "Question 6"]
    }
  ]
}
"""


async def generate_schema_suggestions(schema_context: str) -> dict:
    """
    Analyses the connected database schema and returns categorized
    question suggestions to help the user get started quickly.
    """
    if not schema_context or schema_context.strip() == "":
        return {}

    prompt = f"""Database Schema:
{schema_context}

Generate 6 specific, interesting questions the user can ask about this database."""

    try:
        response = await _client.aio.models.generate_content(
            model=settings.visualizer_model,
            contents=f"{SUGGESTION_SYSTEM}\n\n{prompt}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        import json
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        logger.info(f"[SuggestionAgent] Generated {sum(len(c['questions']) for c in result.get('categories', []))} suggestions.")
        return result
    except Exception as e:
        logger.error(f"[SuggestionAgent] Failed to generate suggestions: {e}")
        return {}
