"""
Visualizer Agent (Gemini Pro) — Plotly.js Edition
Two-phase approach:
  Phase 1: Programmatic data pattern detection (no LLM cost)
  Phase 2: Gemini generates 4-7 Plotly chart configs matched to detected patterns
Supports 20+ chart types with smart, data-driven selection.
"""
import json
import logging
from google import genai
from google.genai import types
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = genai.Client(api_key=settings.gemini_api_key)

# ── Brand palette ────────────────────────────────────────────────────────────
PALETTE = ["#7C6FFF","#00C9B1","#FF6B6B","#FFB347","#4ECDC4","#45B7D1","#96CEB4","#A855F7","#F59E0B","#EC4899"]

# ── Phase 1: Programmatic data pattern detection ─────────────────────────────
def detect_data_patterns(columns: list, rows: list, col_stats: dict) -> list[dict]:
    """Analyze data shape and detect chart-worthy patterns before calling the LLM."""
    patterns = []
    numeric_cols = [c for c, s in col_stats.items() if s["type"] == "numeric"]
    categorical_cols = [c for c, s in col_stats.items() if s["type"] == "categorical"]
    row_count = len(rows)

    # Time series detection
    time_keywords = ["date", "month", "year", "time", "quarter", "week", "day", "period", "created", "updated"]
    time_cols = [c for c in columns if any(k in c.lower() for k in time_keywords)]
    if time_cols and numeric_cols:
        patterns.append({
            "pattern": "time_series",
            "time_col": time_cols[0],
            "value_cols": numeric_cols[:3],
            "recommended": ["line", "area"],
        })

    # Correlation detection (2+ numeric cols)
    if len(numeric_cols) >= 2:
        patterns.append({
            "pattern": "correlation",
            "cols": numeric_cols[:3],
            "recommended": ["scatter", "bubble", "heatmap"],
        })

    # Distribution analysis
    for col in numeric_cols[:2]:
        if col_stats[col].get("distinct_count", 0) > 8:
            patterns.append({
                "pattern": "distribution",
                "col": col,
                "recommended": ["histogram", "box", "violin"],
            })
            break

    # Category proportions
    for col in categorical_cols:
        distinct = col_stats[col].get("distinct_count", 0)
        if 2 <= distinct <= 8:
            patterns.append({
                "pattern": "proportion",
                "col": col,
                "count": distinct,
                "recommended": ["donut", "pie", "sunburst"],
            })
            break
        elif 8 < distinct <= 25:
            patterns.append({
                "pattern": "hierarchy",
                "col": col,
                "count": distinct,
                "recommended": ["treemap", "sunburst"],
            })
            break

    # Ranking detection (categorical + numeric)
    if categorical_cols and numeric_cols:
        patterns.append({
            "pattern": "ranking",
            "category_col": categorical_cols[0],
            "value_col": numeric_cols[0],
            "recommended": ["horizontal_bar", "bar", "funnel"],
        })

    # Aggregates for KPIs
    if numeric_cols:
        patterns.append({
            "pattern": "aggregate_metrics",
            "cols": numeric_cols[:4],
            "recommended": ["kpi", "gauge"],
        })

    # Comparison across groups
    if len(categorical_cols) >= 2 and numeric_cols:
        patterns.append({
            "pattern": "group_comparison",
            "group_cols": categorical_cols[:2],
            "value_col": numeric_cols[0],
            "recommended": ["grouped_bar", "stacked_bar", "radar"],
        })

    # Waterfall for cumulative/financial data
    finance_keywords = ["revenue", "cost", "profit", "expense", "income", "sales", "budget", "price", "amount"]
    finance_cols = [c for c in columns if any(k in c.lower() for k in finance_keywords)]
    if finance_cols and categorical_cols:
        patterns.append({
            "pattern": "cumulative",
            "value_col": finance_cols[0],
            "recommended": ["waterfall", "bar"],
        })

    return patterns


VISUALIZER_SYSTEM = """You are a world-class Data Visualization Architect. Generate stunning, interactive Plotly.js chart configurations that make insights instantly clear.

## CORE RULES
1. Generate 4-7 diverse, high-quality visualizations per query. Never fewer than 4.
2. ALWAYS start with 1-3 KPI cards for key numeric aggregates.
3. NEVER repeat the same chart_type twice.
4. Each chart must answer a specific business question — title it as that question's answer.
5. Match chart types to the DETECTED DATA PATTERNS provided. Use the recommended types as strong hints.
6. Prefer interactive, zoomable charts over static ones.

## AVAILABLE CHART TYPES (20+)

### KPI Cards (library: "kpi")
Single big metrics. Config:
{"value": 12345, "formatted_value": "12,345", "unit": "Rs.", "trend": "+8.2%", "trend_direction": "up"}
trend_direction: "up" (green), "down" (red), "neutral" (grey)

### Plotly Charts (library: "plotly")

IMPORTANT: Every Plotly chart config MUST have exactly two keys: "data" (array of traces) and "layout" (object).

#### Basic Charts
- **bar**: Vertical bar chart
  data: [{"type": "bar", "x": ["A","B","C"], "y": [10,20,30], "marker": {"color": "#7C6FFF"}}]

- **horizontal_bar**: Horizontal bar chart
  data: [{"type": "bar", "x": [30,20,10], "y": ["A","B","C"], "orientation": "h", "marker": {"color": "#7C6FFF"}}]

- **grouped_bar**: Multiple series side-by-side
  data: [{"type": "bar", "name": "2024", "x": [...], "y": [...]}, {"type": "bar", "name": "2025", "x": [...], "y": [...]}]
  layout: {"barmode": "group"}

- **stacked_bar**: Stacked bars
  data: [{"type": "bar", "name": "A", "x": [...], "y": [...]}, {"type": "bar", "name": "B", "x": [...], "y": [...]}]
  layout: {"barmode": "stack"}

- **line**: Time series / trends
  data: [{"type": "scatter", "mode": "lines+markers", "x": [...], "y": [...], "line": {"shape": "spline", "width": 3}, "marker": {"size": 6}}]

- **area**: Filled area (volume emphasis)
  data: [{"type": "scatter", "mode": "lines", "fill": "tozeroy", "x": [...], "y": [...], "line": {"shape": "spline"}, "fillcolor": "rgba(124,111,255,0.15)"}]

- **scatter**: Correlation between 2 numerics
  data: [{"type": "scatter", "mode": "markers", "x": [...], "y": [...], "marker": {"size": 10, "color": "#7C6FFF", "opacity": 0.7}}]

- **bubble**: 3-variable scatter (size = 3rd metric)
  data: [{"type": "scatter", "mode": "markers", "x": [...], "y": [...], "marker": {"size": [...], "sizemode": "area", "sizeref": 0.1, "color": "#00C9B1"}, "text": [...]}]

#### Proportional Charts
- **pie**: Solid pie, ≤6 slices
  data: [{"type": "pie", "labels": [...], "values": [...], "marker": {"colors": [palette]}, "textinfo": "label+percent", "textposition": "auto"}]

- **donut**: Ring chart with center metric
  data: [{"type": "pie", "labels": [...], "values": [...], "hole": 0.45, "marker": {"colors": [palette]}, "textinfo": "label+percent"}]

- **sunburst**: Hierarchical proportions
  data: [{"type": "sunburst", "labels": [...], "parents": [...], "values": [...], "branchvalues": "total"}]

#### Hierarchical / Flow
- **treemap**: Hierarchical breakdown, 12+ categories
  data: [{"type": "treemap", "labels": [...], "parents": [...], "values": [...], "textinfo": "label+value+percent root", "marker": {"colors": [palette]}}]

- **funnel**: Conversion pipeline
  data: [{"type": "funnel", "y": ["Stage 1","Stage 2","Stage 3"], "x": [100,60,30], "textinfo": "value+percent initial", "marker": {"color": [palette]}}]

- **waterfall**: Cumulative breakdown
  data: [{"type": "waterfall", "x": [...], "y": [...], "measure": ["absolute","relative","relative","total"], "connector": {"line": {"color": "rgba(124,111,255,0.3)"}}}]

- **sankey**: Flow allocation
  data: [{"type": "sankey", "node": {"label": [...], "color": [palette]}, "link": {"source": [...], "target": [...], "value": [...]}}]

#### Statistical Charts
- **histogram**: Distribution of a single numeric
  data: [{"type": "histogram", "x": [...], "nbinsx": 20, "marker": {"color": "#7C6FFF", "line": {"color": "rgba(255,255,255,0.3)", "width": 1}}}]

- **box**: Distribution with outliers
  data: [{"type": "box", "y": [...], "name": "Group A", "marker": {"color": "#7C6FFF"}, "boxpoints": "outliers"}]

- **violin**: Distribution shape
  data: [{"type": "violin", "y": [...], "name": "Group A", "box": {"visible": true}, "meanline": {"visible": true}, "fillcolor": "rgba(124,111,255,0.3)"}]

#### Specialized Charts
- **radar**: Multi-metric comparison (uses scatterpolar)
  data: [{"type": "scatterpolar", "r": [4,3,5,2,4], "theta": ["Speed","Power","Range","Safety","Cost"], "fill": "toself", "name": "Product A"}]

- **gauge**: Single metric with target
  data: [{"type": "indicator", "mode": "gauge+number+delta", "value": 85, "delta": {"reference": 70}, "gauge": {"axis": {"range": [0, 100]}, "bar": {"color": "#7C6FFF"}, "steps": [{"range": [0,50], "color": "rgba(124,111,255,0.1)"}, {"range": [50,80], "color": "rgba(124,111,255,0.2)"}, {"range": [80,100], "color": "rgba(124,111,255,0.3)"}]}}]

- **heatmap**: Matrix / correlation
  data: [{"type": "heatmap", "x": [...], "y": [...], "z": [[...]], "colorscale": [[0,"#0d0d16"],[0.5,"#7C6FFF"],[1,"#00C9B1"]], "showscale": true}]

## LAYOUT TEMPLATE (apply to EVERY Plotly chart)
{
  "template": "plotly",
  "paper_bgcolor": "rgba(0,0,0,0)",
  "plot_bgcolor": "rgba(0,0,0,0)",
  "font": {"family": "Inter, system-ui, sans-serif", "color": "#334155"},
  "margin": {"l": 50, "r": 30, "t": 40, "b": 50},
  "colorway": ["#7C6FFF","#00C9B1","#FF6B6B","#FFB347","#4ECDC4","#45B7D1","#96CEB4","#A855F7"],
  "hoverlabel": {"bgcolor": "rgba(255,255,255,0.95)", "bordercolor": "rgba(124,111,255,0.3)", "font": {"color": "#1e293b", "size": 12}},
  "xaxis": {"gridcolor": "rgba(0,0,0,0.06)", "zerolinecolor": "rgba(0,0,0,0.12)"},
  "yaxis": {"gridcolor": "rgba(0,0,0,0.06)", "zerolinecolor": "rgba(0,0,0,0.12)"}
}

## META FIELD (required on every plotly chart for frontend cross-filtering)
- bar/line/area/horizontal_bar/grouped_bar/stacked_bar/waterfall: {"x_col": "col", "y_cols": ["col"], "group_col": null, "agg": "sum"}
- pie/donut/sunburst/treemap/funnel: {"category_col": "col", "value_col": "col", "agg": "sum"}
- scatter/bubble: {"x_col": "col", "y_cols": ["col"], "group_col": null, "agg": "none"}
- histogram/box/violin: {"x_col": "col", "y_cols": ["col"], "agg": "none"}
- heatmap: {"x_col": "col", "y_cols": ["col"], "group_col": "col", "agg": "sum"}
- radar: {"x_col": null, "y_cols": ["metric1","metric2"], "group_col": "col", "agg": "avg"}
- gauge/kpi: null

## DATA LIMITS
- bar/horizontal_bar: max 20 items, sort descending
- pie/donut: max 8 slices, group rest into "Others"
- scatter/bubble: max 100 points
- line/area: max 50 points
- treemap/sunburst: max 30 nodes
- funnel: max 8 stages
- heatmap: max 15×15 matrix

## DIVERSITY RULE
NEVER use the same chart_type twice. Maximize variety.
GOOD: [kpi, kpi, donut, horizontal_bar, line, scatter, histogram]
BAD:  [kpi, bar, bar, scatter]

## OUTPUT FORMAT
Strict JSON array. No markdown. No explanation. No code fences.
[
  {"library":"kpi","title":"Total Revenue","meta":null,"config":{"value":125430,"formatted_value":"1,25,430","unit":"Rs.","trend":"+8.2%","trend_direction":"up"}},
  {"library":"plotly","chart_type":"donut","title":"Sales by Category","meta":{"category_col":"category","value_col":"total","agg":"sum"},"config":{"data":[{"type":"pie","labels":["Electronics","Clothing","Books"],"values":[450,320,180],"hole":0.45,"marker":{"colors":["#7C6FFF","#00C9B1","#FF6B6B"]},"textinfo":"label+percent"}],"layout":{"template":"plotly_dark","paper_bgcolor":"transparent","plot_bgcolor":"transparent","font":{"family":"Inter, system-ui, sans-serif","color":"#94a3b8"},"margin":{"l":30,"r":30,"t":10,"b":30},"showlegend":true,"legend":{"orientation":"h","yanchor":"bottom","y":-0.2}}}}
]

## FORBIDDEN
- Repeating the same chart_type
- Pie/donut with only 1 slice
- Missing "data" or "layout" keys in plotly config
- Table when numeric columns exist
- More than 7 charts total
- Missing meta field on plotly charts
"""


async def generate_charts(
    columns: list,
    rows: list,
    user_question: str,
    row_count: int
) -> list[dict] | None:
    """
    Two-phase chart generation:
      Phase 1: Detect data patterns programmatically
      Phase 2: Use Gemini to generate 4-7 Plotly configs matched to patterns
    """
    if not rows or len(rows) == 0:
        return None

    # ── Smart Zero / Null Result Guard ────────────────────────────────────────
    # If the result is a single row and ALL numeric values are 0 or None,
    # there is nothing meaningful to visualize — skip charts entirely.
    if len(rows) == 1:
        row = rows[0]
        numeric_vals = [v for v in row.values() if isinstance(v, (int, float))]
        all_zero_or_null = (
            len(numeric_vals) == 0
            or all(v == 0 or v is None for v in numeric_vals)
        )
        if all_zero_or_null:
            logger.info("[VisualizerAgent] Single-row result with all zeros/nulls — skipping charts.")
            return None

        # Non-zero single-row result: KPI card + gauge per numeric value
        charts = []
        label_val = next(
            (str(v) for v in row.values() if isinstance(v, str) and v.strip()),
            None
        )
        for col, val in row.items():
            if isinstance(val, (int, float)) and val != 0:
                formatted = f"{val:,.2f}" if isinstance(val, float) else f"{val:,}"
                charts.append({
                    "library": "kpi",
                    "title": col.replace("_", " ").title(),
                    "meta": None,
                    "config": {
                        "value": val,
                        "formatted_value": formatted,
                        "label": label_val or col.replace("_", " ").title(),
                        "trend_direction": "neutral",
                    }
                })
                charts.append({
                    "library": "plotly",
                    "chart_type": "gauge",
                    "title": f"{col.replace('_', ' ').title()} — {label_val or 'Result'}",
                    "meta": None,
                    "config": {
                        "data": [{
                            "type": "indicator",
                            "mode": "gauge+number",
                            "value": val,
                            "title": {"text": label_val or col.replace("_", " ").title(), "font": {"size": 14}},
                            "gauge": {
                                "axis": {"range": [0, max(val * 1.5, 5)]},
                                "bar": {"color": "#7C6FFF"},
                                "steps": [
                                    {"range": [0, val * 0.5], "color": "rgba(124,111,255,0.08)"},
                                    {"range": [val * 0.5, val], "color": "rgba(124,111,255,0.20)"},
                                ],
                                "threshold": {
                                    "line": {"color": "#00C9B1", "width": 3},
                                    "thickness": 0.75,
                                    "value": val
                                }
                            }
                        }],
                        "layout": {
                            "paper_bgcolor": "rgba(0,0,0,0)",
                            "plot_bgcolor": "rgba(0,0,0,0)",
                            "font": {"family": "Inter, system-ui, sans-serif", "color": "#94a3b8"},
                            "margin": {"l": 30, "r": 30, "t": 40, "b": 30},
                        }
                    }
                })
        return charts if charts else None


    sample_rows = rows[:50]

    # ── Phase 1: Compute column statistics ────────────────────────────────
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

    # ── Phase 1b: Detect data patterns ────────────────────────────────────
    patterns = detect_data_patterns(columns, rows, col_stats)

    # Determine min/max chart count based on data complexity
    min_charts = 1 if row_count <= 3 else (2 if row_count <= 10 else 4)
    max_charts = 7

    prompt = f"""### User's Business Question
"{user_question}"

### Query Results Summary
- Total rows returned: {row_count}
- Columns: {columns}

### Column Analysis
{json.dumps(col_stats, indent=2, default=str)}

### Detected Data Patterns (MATCH your chart types to these!)
{json.dumps(patterns, indent=2, default=str)}

### Sample Data (first {len(sample_rows)} rows)
{json.dumps(sample_rows, indent=2, default=str)}

Generate {min_charts}-{max_charts} DIVERSE dashboard charts for this data. Include KPIs first, then use the detected patterns to choose the best chart types. Include meta field on every chart."""

    try:
        response = await _client.aio.models.generate_content(
            model=settings.visualizer_model,
            contents=f"{VISUALIZER_SYSTEM}\n\n{prompt}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
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

        # ── Validate and cap at 8 ─────────────────────────────────────────
        valid_charts = []
        for chart in charts[:8]:
            if not isinstance(chart, dict):
                continue
            # Must have library + config
            if "library" not in chart:
                continue
            if chart["library"] == "kpi" and "config" in chart:
                valid_charts.append(chart)
            elif chart["library"] == "plotly" and "config" in chart:
                cfg = chart["config"]
                # Validate Plotly config has data and layout
                if isinstance(cfg, dict) and "data" in cfg:
                    if "layout" not in cfg:
                        cfg["layout"] = {}
                    valid_charts.append(chart)
            elif chart["library"] == "table" and "config" in chart:
                valid_charts.append(chart)

        if not valid_charts:
            return None

        logger.info(f"[VisualizerAgent] Generated {len(valid_charts)} charts: {[c.get('chart_type', c.get('library')) for c in valid_charts]}")
        return valid_charts

    except Exception as e:
        logger.error(f"VisualizerAgent failed: {e}")
        return None
