"""
Document Visualizer Agent (Gemini)
2-phase approach:
  Phase 1: Extract structured, chart-ready data from raw document text.
  Phase 2: Use structured data to generate 3-4 ECharts dashboard configs.
"""
import json
import logging
import google.generativeai as genai
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.visualizer_model)

# ── Phase 1: Extract structured data from document ──────────────────────────

EXTRACT_SYSTEM = """You are an expert document analyst. Your job is to read a document and extract
the most important information into a clean, structured JSON object that can be used to power charts.

Rules:
1. Detect the document type (resume, report, policy, research, invoice, etc.)
2. Extract ONLY the most chart-worthy data — not all prose.
3. Structure data as named arrays or key-value pairs.
4. Quantities, counts, and ratings are more useful than long sentences.
5. Always include a "doc_type" field and a "person_or_entity" field if applicable.

Common extractions:
- Resume/CV:
  {
    "doc_type": "resume",
    "person_or_entity": "Full Name",
    "role": "Job Title / Objective",
    "skills_by_category": { "Languages": ["Python", "Java"], "AI/ML": ["LangChain", "FAISS"] },
    "projects": [{ "name": "Project A", "tech": ["React", "FastAPI"], "year": 2025 }],
    "education": [{ "degree": "B.E. CSE", "institution": "XYZ Univ", "cgpa": 8.2, "year": 2027 }],
    "experience": [{ "role": "Intern", "company": "TechCorp", "duration_months": 2 }],
    "certifications": ["Python for DS", "Java Full Stack"],
    "languages_spoken": [{ "language": "English", "level": "Proficient" }]
  }
- Financial Report:
  {
    "doc_type": "financial",
    "kpis": [{ "label": "Revenue", "value": 1200000, "unit": "USD" }],
    "monthly_trend": [{ "month": "Jan", "revenue": 100000, "expenses": 80000 }],
    "segment_breakdown": [{ "segment": "Retail", "share_pct": 45 }]
  }
- Research Paper:
  {
    "doc_type": "research",
    "title": "...",
    "findings": [{ "metric": "Accuracy", "value": 94.5, "unit": "%" }],
    "methodology_steps": ["Data Collection", "Preprocessing", "Model Training"],
    "comparison": [{ "model": "BERT", "accuracy": 91.2 }, { "model": "GPT-2", "accuracy": 93.1 }]
  }

ONLY output valid JSON. No explanation, no markdown fences."""


VISUALIZER_SYSTEM = """You are an Enterprise Data Visualization Architect for documents.
Given structured data extracted from a document, generate the BEST 3-4 visual representations.

## Available Render Libraries & Types
You MUST return an array of JSON objects. Each object MUST have a `library` and `config` field.

1. ECharts (`"library": "echarts"`)
   Best for graphs, comparison, timelines.
   - Types: bar, horizontal_bar, line, area, pie, radar (for skills/stats), treemap (for hierarchies like tech stacks), timeline
   - Format: `{ "library": "echarts", "chart_type": "radar", "title": "...", "config": { ...echarts_option... } }`
   - Palette: ["#7C6FFF", "#00C9B1", "#FF6B6B", "#FFD93D", "#6BCB77"]

2. Data Table (`"library": "table"`)
   Best for a dense list of facts (e.g. chronological work experience, detailed findings).
   - Format: `{ "library": "table", "title": "Job History", "config": { "columns": ["Role", "Company", "Duration"], "data": [["Intern", "Google", "3 Months"], ...] } }`

3. KPI Scorecard (`"library": "kpi"`)
   Best for a single big metric (e.g. total years experience, overall rating, policy count).
   - Format: `{ "library": "kpi", "title": "Total Exp", "config": { "value": 5, "formatted_value": "5 Years" } }`

## Rules:
- Mix your libraries! Try to provide 1 KPI, 1 Table, and 2 ECharts.
- ECharts configs must be self-contained `option` objects (no functions). Background transparent.
- ALL data must come strictly from the structured payload.

## Response Format (strict JSON array, no fences, no explanation):
[
  { "library": "kpi", "title": "Total Projects", "config": { "value": 12, "formatted_value": "12" } },
  { "library": "echarts", "chart_type": "treemap", "title": "Tech Stack", "config": { ... } },
  { "library": "table", "title": "Experience", "config": { "columns": [...], "data": [...] } }
]"""


async def generate_doc_charts(user_query: str, doc_content: str) -> list[dict]:
    """2-phase: extract structured data → generate 3-4 ECharts configs."""
    try:
        # ── Phase 1: Extract structured data ────────────────────────────────
        extract_prompt = f"""User request: "{user_query}"

Document content:
{doc_content[:6000]}

Extract the most chart-worthy structured data as JSON:"""

        extract_response = await _model.generate_content_async(
            f"{EXTRACT_SYSTEM}\n\n{extract_prompt}",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        structured_text = extract_response.text.strip()
        structured_text = structured_text.replace("```json", "").replace("```", "").strip()

        try:
            structured_data = json.loads(structured_text)
        except json.JSONDecodeError:
            logger.warning("[DocVisualizer] Phase 1 JSON parse failed, using raw text as fallback")
            structured_data = {"doc_type": "unknown", "raw_summary": doc_content[:2000]}

        logger.info(f"[DocVisualizer] Phase 1 extracted doc_type: {structured_data.get('doc_type', 'unknown')}")

        # ── Phase 2: Generate ECharts from structured data ───────────────────
        viz_prompt = f"""User request: "{user_query}"

Structured document data:
{json.dumps(structured_data, indent=2)}

Generate the best 3-4 ECharts dashboard configs for this data:"""

        viz_response = await _model.generate_content_async(
            f"{VISUALIZER_SYSTEM}\n\n{viz_prompt}",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        raw = viz_response.text.strip()

        # ── Robust JSON array extraction (mirrors sql visualizer_agent) ──────
        charts = None
        start = raw.find("[")
        if start != -1:
            depth = 0
            end = -1
            in_string = False
            escape_next = False
            for i, ch in enumerate(raw[start:], start=start):
                if escape_next:
                    escape_next = False
                    continue
                if ch == "\\" and in_string:
                    escape_next = True
                    continue
                if ch == '"':
                    in_string = not in_string
                if not in_string:
                    if ch == "[":
                        depth += 1
                    elif ch == "]":
                        depth -= 1
                        if depth == 0:
                            end = i + 1
                            break
            if end != -1:
                try:
                    charts = json.loads(raw[start:end])
                except json.JSONDecodeError:
                    pass

        if charts is None:
            cleaned = raw.replace("```json", "").replace("```", "").strip()
            charts = json.loads(cleaned)

        if not isinstance(charts, list):
            charts = [charts] if isinstance(charts, dict) else []

        # Filter out invalid entries and enforce schema
        valid_charts = []
        for c in charts[:4]:
            if not isinstance(c, dict): continue
            
            # Legacy fallback
            if "library" not in c and "chart_type" in c:
                if c["chart_type"] == "kpi_card":
                    valid_charts.append({ "library": "kpi", "title": c.get("title", "KPI"), "config": c })
                else:
                    valid_charts.append({ "library": "echarts", "chart_type": c["chart_type"], "title": c.get("title", "Chart"), "config": {k:v for k,v in c.items() if k not in ("chart_type", "title", "library")} })
            elif "library" in c and "config" in c:
                valid_charts.append(c)

        if not valid_charts:
            logger.warning("[DocVisualizer] No valid charts produced in Phase 2")
            return []

        logger.info(f"[DocVisualizer] Generated {len(valid_charts)} visual components: {[c.get('library') for c in valid_charts]}")
        return valid_charts

    except Exception as e:
        logger.error(f"[DocVisualizer] Agent Error: {e}", exc_info=True)
        return []
