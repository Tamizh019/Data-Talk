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

VISUALIZER_SYSTEM = """You are an Expert Data Visualization Architect.
Your job: analyze the SQL query results and the user's business question, then generate 
the BEST 3-4 Apache ECharts configurations to form an executive dashboard.

## Available Chart Types (pick the most insightful ones):
1. bar           - Vertical bar chart. Best for comparisons and rankings.
2. horizontal_bar - Horizontal bar chart. Best for long labels, top-N lists.
3. line          - Line chart. Best for trends over time.
4. area          - Area chart (line + filled). Best for volume trends, cumulative data.
5. pie           - Pie/Donut chart. Best for proportions, market share (use with ≤8 categories).
6. scatter       - Scatter plot. Best for correlations, distributions.
7. heatmap       - Heatmap grid. Best for matrix data, time × category intensity.
8. radar         - Radar/spider chart. Best for multi-dimensional comparison of few items.
9. treemap       - Treemap. Best for hierarchical proportions.
10. funnel       - Funnel chart. Best for conversion pipelines, staged processes.
11. gauge        - Gauge meter. Best for KPI single values, target vs actual.
12. kpi_card     - A KPI scorecard (not a chart). Returns a big number + label + optional delta.
13. boxplot      - Box plot. Best for statistical distribution analysis.
14. waterfall    - Waterfall chart. Best for showing incremental +/- changes.
15. stacked_bar  - Stacked bar chart. Best for composition across groups.

## Rules:
- Select 3-4 chart types that give the MOST INSIGHT for this specific data.
- Each chart config must be a COMPLETE, self-contained Apache ECharts `option` object.
- Use professional dark theme colors. Base palette: ["#7C6FFF", "#00C9B1", "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF922B", "#CC5DE8"].
- Set backgroundColor to "transparent" (the frontend card handles background).
- Include proper titles, legends, tooltips, and axis labels.
- For kpi_card type: return { "chart_type": "kpi_card", "title": "...", "value": 12345, "formatted_value": "$12,345", "delta": "+12.5%", "delta_direction": "up"|"down"|"neutral" }
- For ALL other types: return a complete ECharts option JSON with a "chart_type" field added.
- Make charts visually stunning: use gradients for bars/areas, smooth curves for lines, proper spacing.
- Ensure all data values map correctly from the provided rows/columns.

## Response Format (strict JSON array):
[
  { "chart_type": "gauge", "title": "...", ...echarts_option... },
  { "chart_type": "bar", "title": "...", ...echarts_option... },
  { "chart_type": "line", "title": "...", ...echarts_option... }
]

Only output the JSON array. NO markdown, NO explanation, NO code fences.
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
        # Parse the JSON array
        charts = json.loads(raw)

        # Validate: must be a list of dicts
        if not isinstance(charts, list):
            # Maybe Gemini wrapped it in an object
            if isinstance(charts, dict) and "charts" in charts:
                charts = charts["charts"]
            else:
                charts = [charts]

        # Filter out invalid entries and cap at 4
        valid_charts = []
        for chart in charts[:4]:
            if isinstance(chart, dict) and chart.get("chart_type"):
                valid_charts.append(chart)

        if not valid_charts:
            return None

        logger.info(f"[VisualizerAgent] Generated {len(valid_charts)} charts: {[c.get('chart_type') for c in valid_charts]}")
        return valid_charts

    except Exception as e:
        logger.error(f"VisualizerAgent failed: {e}")
        return None
