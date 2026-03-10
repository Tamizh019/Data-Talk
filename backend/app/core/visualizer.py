"""
Auto-generates a Plotly JSON config from SQL result data.
The frontend renders this directly using react-plotly.js.
"""
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _is_numeric(value) -> bool:
    """Returns True if a value is a number (int, float) or a numeric string."""
    if isinstance(value, (int, float)):
        return True
    try:
        float(str(value).replace(",", "").replace("$", ""))
        return True
    except (ValueError, TypeError):
        return False


def _pick_best_metric_col(numeric_cols: list[str]) -> str:
    """
    Intelligently picks the best Y-axis column, skipping ID-like columns
    and preferring meaningful metric names.
    """
    # Columns that are almost certainly NOT useful to chart
    ID_PATTERNS = {"id", "_id", "pk", "uuid", "key", "index", "seq", "no", "num", "number", "serial"}

    # Preferred column name fragments — these are likely meaningful metrics
    PREFERRED_PATTERNS = {
        "cgpa", "gpa", "score", "grade", "mark", "point",
        "salary", "wage", "pay", "income", "revenue", "amount", "price", "cost", "fee",
        "count", "total", "sum", "avg", "average", "mean", "rate", "percent", "ratio",
        "age", "year", "month", "day", "hour", "quantity", "qty", "stock", "inventory",
        "height", "weight", "distance", "duration", "size", "capacity", "population",
    }

    # First pass: look for a preferred metric name (partial match)
    for col in numeric_cols:
        col_lower = col.lower()
        if any(p in col_lower for p in PREFERRED_PATTERNS):
            return col

    # Second pass: skip ID-like columns, return the first non-ID numeric col
    for col in numeric_cols:
        col_lower = col.lower()
        if not any(col_lower == p or col_lower.endswith("_" + p) for p in ID_PATTERNS):
            return col

    # Fallback: just return the first numeric col (not ideal, but better than crashing)
    return numeric_cols[0]


def generate_plotly_config(columns: list[str], rows: list[dict]) -> Optional[dict]:
    """
    Heuristically picks the best chart type and returns a Plotly JSON config.
    Returns None if data is unsuitable for visualization.

    Chart selection:
      - 1 label + 1 numeric column, <= 8 rows → Bar chart
      - 1 label + 1 numeric column, > 8 rows  → Line chart
      - 2 numeric columns                     → Scatter plot
      - 1 numeric column only                 → Histogram
    """
    if not rows or not columns:
        return None

    # Separate label and numeric columns
    sample = rows[0]
    numeric_cols = [c for c in columns if _is_numeric(sample.get(c))]
    label_cols = [c for c in columns if c not in numeric_cols]

    if not numeric_cols:
        logger.info("Visualizer: no numeric columns, skipping chart")
        return None

    # Intelligently pick the best metric column (not just the first one)
    y_col = _pick_best_metric_col(numeric_cols)
    y_values = [row.get(y_col) for row in rows]

    # ── Bar or Line chart (label + value) ────────────────────
    if label_cols:
        x_col = label_cols[0]
        x_values = [str(row.get(x_col, "")) for row in rows]
        chart_type = "bar" if len(rows) <= 8 else "scatter"
        mode = None if chart_type == "bar" else "lines+markers"

        trace = {
            "type": chart_type,
            "x": x_values,
            "y": y_values,
            "marker": {"color": "#6366f1", "opacity": 0.9},
            "name": y_col,
        }
        if mode:
            trace["mode"] = mode
            trace["line"] = {"color": "#6366f1", "width": 2}

        return {
            "data": [trace],
            "layout": {
                "title": {"text": f"{y_col} by {x_col}"},
                "xaxis": {"title": x_col, "tickangle": -30},
                "yaxis": {"title": y_col},
                "bargap": 0.3,
            },
            "chart_type": chart_type,
        }

    # ── Scatter chart (two numeric columns) ──────────────────
    if len(numeric_cols) >= 2:
        x_col, y_col2 = numeric_cols[0], numeric_cols[1]
        return {
            "data": [{
                "type": "scatter",
                "mode": "markers",
                "x": [row.get(x_col) for row in rows],
                "y": [row.get(y_col2) for row in rows],
                "marker": {"color": "#6366f1", "size": 8},
            }],
            "layout": {
                "title": {"text": f"{x_col} vs {y_col2}"},
                "xaxis": {"title": x_col},
                "yaxis": {"title": y_col2},
            },
            "chart_type": "scatter",
        }

    # ── Histogram (single numeric column) ────────────────────
    return {
        "data": [{
            "type": "histogram",
            "x": y_values,
            "marker": {"color": "#6366f1"},
            "name": y_col,
        }],
        "layout": {
            "title": {"text": f"Distribution of {y_col}"},
            "xaxis": {"title": y_col},
            "yaxis": {"title": "Count"},
        },
        "chart_type": "histogram",
    }
