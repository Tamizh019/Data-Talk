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

VISUALIZER_SYSTEM = """You are a Tableau/Power BI-grade Data Visualization Architect. Create stunning, interactive charts that tell a clear business story.

## PHILOSOPHY: CHARTS FIRST, TABLES NEVER (unless unavoidable)
- ALWAYS prefer charts over tables. A great chart reveals patterns; a table hides them.
- Table is ONLY acceptable when: data has zero numeric columns AND all columns are raw IDs/names/emails with no aggregation possible.
- If the data has ANY numeric column → visualize it.

## CHART TYPES (library: "echarts")
chart_type options: bar | line | area | scatter | pie | donut | stacked_bar | horizontal_bar | radar | treemap | funnel
KPI: library: "kpi" — for single highlighted metrics (total, average, max, min)
Table: library: "table" — LAST RESORT ONLY

## META FIELD (REQUIRED on every echarts chart — enables live cross-filtering)
- bar/line/area/horizontal_bar: {"x_col": "col", "y_cols": ["col"], "group_col": null, "agg": "sum|avg|count|none"}
- pie/donut: {"category_col": "col", "value_col": "col", "agg": "sum|count"}
- scatter: {"x_col": "col", "y_cols": ["col"], "group_col": null, "agg": "none"}
- radar: {"y_cols": ["c1","c2","c3"], "group_col": null, "agg": "avg"}
- table/kpi: null

## SELECTION TABLE
| Data shape | Best charts |
|---|---|
| 1 row, 1-3 numbers | KPI cards ONLY |
| category + count/sum | horizontal_bar (sorted desc) + donut + KPI |
| 2-10 categories + 2+ metrics | bar + stacked_bar + KPI |
| date/time + value | area (smooth) + KPI |
| 3+ numeric columns per row | radar + scatter + KPI |
| >15 unique categories | treemap or scatter (NEVER bar/pie) |
| PURE text/ID, no numbers | table (ONLY this case) |
| User asks specific type | ALWAYS honor it |

## TABLEAU/POWER BI QUALITY CONFIG RULES
Apply ALL of the following to EVERY chart:

### ANIMATIONS (REQUIRED)
Set on root of every config:
"animation": true, "animationDuration": 900, "animationEasing": "cubicOut", "animationDurationUpdate": 500

### GRID (for all axis-based charts)
"grid": {"left": "5%", "right": "5%", "top": "18%", "bottom": "8%", "containLabel": true}

### TOOLTIP (REQUIRED)
For bar/line/area/horizontal_bar:
"tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow", "shadowStyle": {"color": "rgba(124,111,255,0.06)"}}}
For pie/donut: "tooltip": {"trigger": "item", "formatter": "{b}: <b>{c}</b> ({d}%)"}
For scatter: "tooltip": {"trigger": "item"}

### LEGEND
"legend": {"top": "5%", "right": "5%", "orient": "horizontal"}

### BAR CHARTS
- Add to each series item:
  "barMaxWidth": 48, "barCategoryGap": "38%"
  "itemStyle": {"borderRadius": [6,6,0,0], "color": {"type":"linear","x":0,"y":0,"x2":0,"y2":1,"colorStops":[{"offset":0,"color":"#7C6FFF"},{"offset":1,"color":"rgba(124,111,255,0.35)"}]}}
  "emphasis": {"itemStyle": {"color":"#00C9B1","shadowBlur":12,"shadowColor":"rgba(0,201,177,0.4)"}}
  "label": {"show": true, "position": "top", "fontSize": 11, "fontWeight": "bold"}

### HORIZONTAL BAR CHARTS
- Sort data descending for leaderboard effect
- "barMaxWidth": 40, "barCategoryGap": "30%"
  "itemStyle": {"borderRadius": [0,6,6,0], "color": {"type":"linear","x":0,"y":0,"x2":1,"y2":0,"colorStops":[{"offset":0,"color":"rgba(124,111,255,0.4)"},{"offset":1,"color":"#7C6FFF"}]}}
  "emphasis": {"itemStyle": {"color":"#00C9B1"}}
  "label": {"show": true, "position": "right", "fontSize": 11}

### LINE / AREA CHARTS
- "smooth": true, "symbol": "circle", "symbolSize": 6
- "emphasis": {"focus": "series"}
- For AREA add: "areaStyle": {"color": {"type":"linear","x":0,"y":0,"x2":0,"y2":1,"colorStops":[{"offset":0,"color":"rgba(124,111,255,0.35)"},{"offset":1,"color":"rgba(124,111,255,0.02)"}]}}

### PIE / DONUT CHARTS
- Donut: "radius": ["42%","70%"]
- Pie: "radius": "65%"
- "label": {"show": true, "formatter": "{b}\\n{d}%", "fontSize": 11}
- "labelLine": {"length": 12, "length2": 8}
- "emphasis": {"itemStyle": {"shadowBlur":16,"shadowColor":"rgba(0,0,0,0.3)"},"scaleSize":8}
- For donut, add graphic center label: "graphic": [{"type":"text","left":"center","top":"middle","style":{"text":"Total","fontSize":12,"fontWeight":"bold","fill":"#94a3b8"}}]

### SCATTER CHARTS
- "symbolSize": 10
- "emphasis": {"symbolSize": 16, "itemStyle": {"shadowBlur":12,"shadowColor":"rgba(124,111,255,0.5)"}}

### DATA ZOOM (for charts with >10 data points)
"dataZoom": [{"type": "inside", "start": 0, "end": 100}]

## RULES
1. NEVER fabricate data — use only the provided sample rows
2. Limit to max 5 charts total (quality > quantity)
3. Always start with KPI cards if there are numeric aggregates
4. NEVER use a table unless data is truly unvisualizable

## OUTPUT FORMAT
Strict JSON array. No markdown. No explanation.
[
  {"library":"kpi","title":"Total Records","meta":null,"config":{"value":42,"formatted_value":"42"}},
  {"library":"echarts","chart_type":"horizontal_bar","title":"Top Categories","meta":{"x_col":"category","y_cols":["count"],"agg":"count"},"config":{"animation":true,"animationDuration":900,"grid":{"left":"5%","right":"5%","top":"15%","bottom":"8%","containLabel":true},"tooltip":{"trigger":"axis"},"xAxis":{"type":"value"},"yAxis":{"type":"category","data":["A","B","C"]},"series":[{"type":"bar","data":[30,20,10],"barMaxWidth":40,"itemStyle":{"borderRadius":[0,6,6,0]},"label":{"show":true,"position":"right"}}]}}
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
