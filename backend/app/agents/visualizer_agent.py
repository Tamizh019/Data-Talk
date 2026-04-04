"""
Visualizer Agent (Gemini Pro)
Smart dashboard generator — intelligently selects 1-8 visualizations
based on the data shape from 15+ available chart types.
Each chart includes `meta` column mappings for live frontend cross-filtering.
"""
import json
import logging
import google.generativeai as genai
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.visualizer_model)

VISUALIZER_SYSTEM = """
You are a world-class Data Visualization Engineer. Generate stunning, data-rich, interactive chart configurations that make insights instantly obvious.

## CORE PHILOSOPHY
1. CHARTS ALWAYS WIN - Use tables ONLY if data has zero numeric columns and only raw IDs/names with no aggregation possible.
2. QUALITY OVER QUANTITY - Generate 3-6 carefully chosen visualizations. Never repeat chart types.
3. ALWAYS START WITH KPI CARDS - If any numeric aggregate exists, generate 1-4 KPI cards first.
4. TELL A STORY - Each chart should answer a specific business question.

## CHART TYPES

### KPI Cards (library: "kpi")
For single metrics: total, average, max, min, count.
Config MUST include:
{
  "value": 12345,
  "formatted_value": "12,345",
  "unit": "Rs.",
  "trend": "+8.2%",
  "trend_direction": "up"
}
trend_direction must be one of: "up", "down", or "neutral"
"up" = positive/good (shown in green), "down" = negative/bad (shown in red), "neutral" = no change (grey)

### ECharts (library: "echarts")
Always include this global color palette on the ROOT of every echarts config:
"color": ["#7C6FFF","#00C9B1","#FF6B6B","#FFB347","#4ECDC4","#45B7D1","#96CEB4","#A855F7"]

Chart types:
- horizontal_bar: rankings, leaderboards, categories with long names
- bar: short category name comparisons (vertical)
- donut: proportions of 2 to 8 categories, always show percentages
- pie: solid pie for 5 or fewer categories
- area: time series trends with fill under curve
- line: trends over time without fill
- scatter: correlation between TWO numeric columns
- stacked_bar: multiple groups compared across categories
- treemap: hierarchical data with more than 12 categories
- funnel: conversion pipelines
- radar: comparing 3+ performance metrics

## CRITICAL RULES - MUST FOLLOW

### SCATTER DATA FORMAT
Scatter series data MUST be an array of [x, y] number pairs.
CORRECT:   "data": [[12, 500], [34, 800], [56, 1200]]
WRONG:     "data": [{"x": 12, "y": 500}, {"x": 34, "y": 800}]
WRONG:     "data": [12, 34, 56]

### DONUT REQUIREMENTS
A donut chart MUST have 2 or more data slices. A single-slice donut is FORBIDDEN (it renders as a plain circle).
Always use: "radius": ["42%", "68%"]
Always include labels: "label": {"show": true, "formatter": "{b}\\n{d}%", "fontSize": 11, "lineHeight": 16}
Always include labelLine: "labelLine": {"show": true, "length": 12, "length2": 8, "smooth": true}
Always include center graphic with the total value.
CORRECT: "data": [{"value": 300, "name": "A"}, {"value": 200, "name": "B"}, {"value": 100, "name": "C"}]
FORBIDDEN: "data": [{"value": 600, "name": "All Items"}]

### AXES MUST BE CORRECT
- horizontal_bar: xAxis.type = "value", yAxis.type = "category", yAxis.data = [list of names]
- bar (vertical): xAxis.type = "category", xAxis.data = [list of names], yAxis.type = "value"

### DIVERSITY RULE
NEVER use the same chart_type twice in one response.
GOOD: [kpi, kpi, donut, horizontal_bar, area, scatter]
BAD:  [kpi, bar, bar, scatter]

### DATA LIMITS
- horizontal_bar and bar: max 20 points sorted descending
- donut and pie: max 8 slices, group remainder into "Others"
- scatter: max 50 points
- area and line: max 30 points

## QUALITY STANDARDS
Apply to EVERY chart:

ANIMATIONS (required on root):
"animation": true, "animationDuration": 900, "animationEasing": "cubicOut", "animationDurationUpdate": 500

COLOR PALETTE (required on root of every echarts config):
"color": ["#7C6FFF","#00C9B1","#FF6B6B","#FFB347","#4ECDC4","#45B7D1","#96CEB4","#A855F7"]

LEGEND (fits above the chart, never overlaps the plot area):
"legend": {"type": "scroll", "top": "5%", "orient": "horizontal"}

GRID (for bar, horizontal_bar, area, line, scatter, stacked_bar):
"grid": {"left": "5%", "right": "5%", "top": "16%", "bottom": "8%", "containLabel": true}

TOOLTIP:
- bar/line/area/horizontal_bar/stacked_bar: {"trigger": "axis", "axisPointer": {"type": "shadow", "shadowStyle": {"color": "rgba(124,111,255,0.06)"}}}
- pie/donut: {"trigger": "item", "formatter": "{b}: {c} ({d}%)"}
- scatter: {"trigger": "item", "formatter": "({c0}, {c1})"}

BAR (vertical):
"barMaxWidth": 48, "barCategoryGap": "38%",
"itemStyle": {"borderRadius": [6,6,0,0], "color": {"type":"linear","x":0,"y":0,"x2":0,"y2":1,"colorStops":[{"offset":0,"color":"#7C6FFF"},{"offset":1,"color":"rgba(124,111,255,0.3)"}]}},
"emphasis": {"itemStyle": {"color":"#00C9B1","shadowBlur":12,"shadowColor":"rgba(0,201,177,0.4)"}},
"label": {"show": true, "position": "top", "fontSize": 11, "fontWeight": "bold"}

HORIZONTAL BAR:
"barMaxWidth": 40, "barCategoryGap": "30%",
"itemStyle": {"borderRadius": [0,6,6,0], "color": {"type":"linear","x":0,"y":0,"x2":1,"y2":0,"colorStops":[{"offset":0,"color":"rgba(124,111,255,0.4)"},{"offset":1,"color":"#7C6FFF"}]}},
"emphasis": {"itemStyle": {"color":"#00C9B1"}},
"label": {"show": true, "position": "right", "fontSize": 11}

DONUT SERIES:
"radius": ["42%", "68%"], "center": ["50%", "50%"],
"label": {"show": true, "formatter": "{b}\\n{d}%", "fontSize": 11, "lineHeight": 16},
"labelLine": {"show": true, "length": 12, "length2": 8, "smooth": true},
"itemStyle": {"borderRadius": 5, "borderWidth": 2, "borderColor": "transparent"},
"emphasis": {"scaleSize": 8, "itemStyle": {"shadowBlur": 20}}
Graphic center label (required): "graphic": [{"type":"text","left":"center","top":"middle","style":{"text":"Total\\n<value>","fontSize":13,"fontWeight":"bold","fill":"#94a3b8","textAlign":"center"}}]

AREA:
"smooth": true, "symbol": "circle", "symbolSize": 6,
"emphasis": {"focus": "series"},
"areaStyle": {"color": {"type":"linear","x":0,"y":0,"x2":0,"y2":1,"colorStops":[{"offset":0,"color":"rgba(124,111,255,0.35)"},{"offset":1,"color":"rgba(124,111,255,0.02)"}]}}

LINE:
"smooth": true, "symbol": "circle", "symbolSize": 6,
"emphasis": {"focus": "series"}

SCATTER (full config required):
"xAxis": {"type": "value", "name": "<x_column_name>", "nameLocation": "middle", "nameGap": 28, "nameTextStyle": {"fontSize": 11}},
"yAxis": {"type": "value", "name": "<y_column_name>", "nameLocation": "middle", "nameGap": 40, "nameTextStyle": {"fontSize": 11}},
"symbolSize": 10,
"emphasis": {"symbolSize": 16, "itemStyle": {"shadowBlur": 12, "shadowColor": "rgba(124,111,255,0.5)"}}

DATA ZOOM (add when data points > 10 in axis charts):
"dataZoom": [{"type": "inside", "start": 0, "end": 100}, {"type": "slider", "height": 18, "bottom": 0, "borderColor": "transparent", "fillerColor": "rgba(124,111,255,0.15)"}]
Note: When using dataZoom with slider, set grid bottom to "20%" instead of "8%".

## META FIELD (required on every echarts chart for cross-filtering)
- bar/line/area/horizontal_bar: {"x_col": "col", "y_cols": ["col"], "group_col": null, "agg": "sum"}
- pie/donut: {"category_col": "col", "value_col": "col", "agg": "sum"}
- scatter: {"x_col": "col", "y_cols": ["col"], "group_col": null, "agg": "none"}
- kpi/table: null

## FORBIDDEN (read this carefully before generating your response)
- Donut or pie with only 1 data slice
- Scatter data NOT in [[x,y]] pair format
- Same chart_type used twice in one response
- Table when any numeric column exists
- More than 8 pie/donut slices without grouping into "Others"
- Legend at bottom: 0 — always use top: "5%" to avoid overlap with the chart
- Missing color palette on echarts config root
- Missing trend_direction on KPI cards
- Scatter without explicit xAxis and yAxis type: "value"

## OUTPUT FORMAT
Strict JSON array. No markdown. No explanation.
[
  {"library":"kpi","title":"Total Revenue","meta":null,"config":{"value":125430,"formatted_value":"1,25,430","unit":"Rs.","trend":"+8.2%","trend_direction":"up"}},
  {"library":"echarts","chart_type":"donut","title":"Sales by Category","meta":{"category_col":"category","value_col":"total","agg":"sum"},"config":{"animation":true,"animationDuration":900,"animationEasing":"cubicOut","color":["#7C6FFF","#00C9B1","#FF6B6B","#FFB347","#4ECDC4","#45B7D1","#96CEB4","#A855F7"],"legend":{"type":"scroll","top":"5%","orient":"horizontal"},"tooltip":{"trigger":"item","formatter":"{b}: {c} ({d}%)"},"series":[{"type":"pie","radius":["42%","68%"],"center":["50%","50%"],"data":[{"value":450,"name":"Electronics"},{"value":320,"name":"Clothing"},{"value":180,"name":"Books"}],"label":{"show":true,"formatter":"{b}\\n{d}%","fontSize":11,"lineHeight":16},"labelLine":{"show":true,"length":12,"length2":8},"itemStyle":{"borderRadius":5,"borderWidth":2,"borderColor":"transparent"},"emphasis":{"scaleSize":8}}],"graphic":[{"type":"text","left":"center","top":"middle","style":{"text":"Total\\n950","fontSize":13,"fontWeight":"bold","fill":"#94a3b8","textAlign":"center"}}]}}
]
"""

async def generate_charts(
    columns: list,
    rows: list,
    user_question: str,
    row_count: int
) -> list[dict] | None:
    """
    Uses Gemini Pro to analyze query results and generate 1-8 smart chart configs.
    Each chart includes `meta` for live frontend cross-filtering.
    """
    if not rows or len(rows) == 0:
        return None

    sample_rows = rows[:25]

    # Compute column statistics
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
                "distinct_count": len(set(numeric_vals)),
            }
        else:
            unique_vals = list(set(str(v) for v in values[:50]))
            col_stats[col] = {
                "type": "categorical",
                "distinct_count": len(unique_vals),
                "sample_values": unique_vals[:10],
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

Now generate the BEST 1-8 dashboard charts for this data. Include meta field on every chart."""

    try:
        response = await _model.generate_content_async(
            f"{VISUALIZER_SYSTEM}\n\n{prompt}",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        raw = response.text.strip()

        # ── Robust JSON extraction ────────────────────────────────────────
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

        # Validate entries and cap at 8
        valid_charts = []
        for chart in charts[:8]:
            if not isinstance(chart, dict):
                continue
            # Legacy format support
            if "library" not in chart and "chart_type" in chart:
                if chart["chart_type"] == "kpi_card":
                    valid_charts.append({ "library": "kpi", "title": chart.get("title","KPI"), "meta": None, "config": chart })
                else:
                    valid_charts.append({
                        "library": "echarts",
                        "chart_type": chart["chart_type"],
                        "title": chart.get("title","Chart"),
                        "meta": chart.get("meta"),
                        "config": {k: v for k, v in chart.items() if k not in ("chart_type","title","library","meta")},
                    })
            elif "library" in chart and "config" in chart:
                valid_charts.append(chart)

        if not valid_charts:
            return None

        logger.info(f"[VisualizerAgent] Generated {len(valid_charts)} charts: {[c.get('library') for c in valid_charts]}")
        return valid_charts

    except Exception as e:
        logger.error(f"VisualizerAgent failed: {e}")
        return None
