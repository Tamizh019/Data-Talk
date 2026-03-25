"""
Visualizer Agent (Gemini Pro)
Analyzes query results and generates multiple ECharts dashboard configs.
Selects the best 3-4 visualizations from 15 available chart types.
"""
import json
import logging
import google.generativeai as genai
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.gemini_model)

VISUALIZER_SYSTEM = """You are an Enterprise Data Visualization Architect.
Your job: analyze the SQL query results and the user's business question, then generate 
the BEST 3-4 visual representations to form an executive dashboard.

## Available Render Libraries & Chart Types
You MUST return an array of JSON objects. Each object MUST have a `library` and `config` field.

1. ECharts (`"library": "echarts"`)
   Best for visualizations. Choose one of:
   - bar, horizontal_bar, line, area, pie (≤8 categories), scatter, heatmap, radar, treemap, funnel, waterfall, stacked_bar
   - Format: `{ "library": "echarts", "chart_type": "line", "title": "...", "config": { ...echarts_option... } }`
   - Use professional dark theme colors: ["#7C6FFF", "#00C9B1", "#FF6B6B", "#FFD93D", "#6BCB77"]

2. Data Table (`"library": "table"`)
   Best for showing exact lists, unaggregated thousands of rows, or detailed leaderboards that don't fit in a chart.
   - Format: `{ "library": "table", "title": "Raw Data Breakdown", "config": { "columns": ["Col1", "Col2"], "data": [["Val1", "Val2"], ...] } }`

3. KPI Scorecard (`"library": "kpi"`)
   Best for a single big number to highlight the primary finding.
   - Format: `{ "library": "kpi", "title": "Total Revenue", "config": { "value": 12345, "formatted_value": "$12,345", "delta": "+12%", "delta_direction": "up" } }`

## Rules:
- If the user explicitly asks for a specific chart type (like a pie chart, scatter plot, or table), prioritize creating exactly what they asked for!
- If the user asks an open-ended question, pick a mix of libraries! Include a KPI if there is a main metric, an EChart for trends/distribution, and a Data Table if the raw rows are interesting.
- ECharts configs must be self-contained `option` objects. Set backgroundColor to "transparent".
- ALL data values must directly come from the provided rows. NEVER make up data.

## Response Format (strict JSON array):
[
  { "library": "kpi", "title": "Total Profit", "config": { "value": 150, "formatted_value": "$150" } },
  { "library": "echarts", "chart_type": "bar", "title": "Revenue by Region", "config": { "xAxis": {...}, "series": [...] } },
  { "library": "table", "title": "Store List", "config": { "columns": ["Store", "Rev"], "data": [["A", 50]] } }
]

Output ONLY valid JSON. NO markdown fences or explanation.
"""


async def generate_charts(
    columns: list,
    rows: list,
    user_question: str,
    row_count: int
) -> list[dict] | None:
    """
    Uses Gemini Pro to analyze query results and generate 3-4 ECharts configs
    forming a dashboard panel.
    """
    if not rows or len(rows) == 0:
        return None

    # Send a meaningful sample (up to 20 rows for better context)
    sample_rows = rows[:20]

    # Compute basic column statistics for numeric columns
    col_stats = {}
    for col in columns:
        values = [r.get(col) for r in rows if r.get(col) is not None]
        numeric_vals = [v for v in values if isinstance(v, (int, float))]
        if numeric_vals:
            col_stats[col] = {
                "type": "numeric",
                "min": min(numeric_vals),
                "max": max(numeric_vals),
                "avg": round(sum(numeric_vals) / len(numeric_vals), 2),
                "unique_count": len(set(numeric_vals)),
            }
        else:
            unique_vals = list(set(str(v) for v in values[:50]))
            col_stats[col] = {
                "type": "categorical",
                "unique_count": len(unique_vals),
                "sample_values": unique_vals[:8],
            }

    prompt = f"""### User's Business Question
"{user_question}"

### Query Results Summary
- Total rows returned: {row_count}
- Columns: {columns}

### Column Analysis
{json.dumps(col_stats, indent=2, default=str)}

### Sample Data (first {len(sample_rows)} rows)
{json.dumps(sample_rows, indent=2, default=str)}

Generate the best 3-4 ECharts dashboard configurations for this data:"""

    try:
        response = await _model.generate_content_async(
            f"{VISUALIZER_SYSTEM}\n\n{prompt}",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        raw = response.text.strip()

        # ── Robust JSON extraction ────────────────────────────────────────────
        # Gemini sometimes appends explanation text after the JSON array.
        # We find the first '[' and track brackets to locate the closing ']'.
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
                    pass  # fall through to full parse attempt

        # Fallback: try parsing the whole raw string (strip markdown fences)
        if charts is None:
            cleaned = raw.replace("```json", "").replace("```", "").strip()
            charts = json.loads(cleaned)

        # Validate: must be a list of dicts
        if not isinstance(charts, list):
            if isinstance(charts, dict) and "charts" in charts:
                charts = charts["charts"]
            else:
                charts = [charts]

        # Filter out invalid entries and cap at 4
        # Perform schema validation
        valid_charts = []
        for chart in charts[:4]:
            if not isinstance(chart, dict):
                continue
                
            # Legacy format support (just ECharts)
            if "library" not in chart and "chart_type" in chart:
                if chart["chart_type"] == "kpi_card":
                    valid_charts.append({
                        "library": "kpi",
                        "title": chart.get("title", "KPI"),
                        "config": chart
                    })
                else:
                    valid_charts.append({
                        "library": "echarts",
                        "chart_type": chart["chart_type"],
                        "title": chart.get("title", "Chart"),
                        "config": {k: v for k, v in chart.items() if k not in ("chart_type", "title", "library")}
                    })
            # New format validation
            elif "library" in chart and "config" in chart:
                valid_charts.append(chart)

        if not valid_charts:
            return None

        logger.info(f"[VisualizerAgent] Generated {len(valid_charts)} charts: {[c.get('library') for c in valid_charts]}")
        return valid_charts

    except Exception as e:
        logger.error(f"VisualizerAgent failed: {e}")
        return None

