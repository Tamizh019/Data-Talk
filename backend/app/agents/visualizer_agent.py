"""
Visualizer Agent (Groq Llama-3.3-70b-versatile)
Looks at the data structure and returns a Plotly JSON config if a chart makes sense.
"""
import json
import logging
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

VISUALIZER_SYSTEM = """You are an Expert Data Visualizer.
Your job is to look at the query columns and a small data sample, and decide if a chart is appropriate.
If a chart makes sense (Bar, Line, Pie, Scatter), tell me how to map the columns.
If a chart does NOT make sense (e.g. just a list of names, or a single number), return {"render_chart": false}

Respond strictly in JSON format:
{
  "render_chart": true|false,
  "type": "bar|line|pie|scatter",
  "x_col": "column_name_for_x_axis",
  "y_col": "column_name_for_y_axis",
  "title": "A beautiful business title for the chart"
}
Only output the JSON object, NO markdown.
"""

async def generate_chart(columns: list, rows: list) -> dict | None:
    if not rows or len(rows) == 0:
        return None
        
    sample_rows = rows[:5]
    prompt = f"### Columns\n{columns}\n\n### Sample Data\n{sample_rows}\n\nGenerate mapping JSON:"
    
    try:
        completion = await client.chat.completions.create(
            model=settings.groq_visualizer_model,
            messages=[
                {"role": "system", "content": VISUALIZER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        result = json.loads(completion.choices[0].message.content.strip())
        
        if result.get("render_chart") and result.get("type"):
            x_col = result.get("x_col")
            y_col = result.get("y_col")
            
            if x_col not in columns or y_col not in columns:
                return None
                
            x_data = [r.get(x_col) for r in rows]
            y_data = [r.get(y_col) for r in rows]
            
            # Build Plotly config locally to handle full dataset size
            config = {
                "data": [
                    {
                        "x": x_data if result["type"] != "pie" else None,
                        "y": y_data if result["type"] != "pie" else None,
                        "labels": x_data if result["type"] == "pie" else None,
                        "values": y_data if result["type"] == "pie" else None,
                        "type": result["type"],
                        "marker": {"color": "#7C6FFF" if result["type"] != "pie" else None}
                    }
                ],
                "layout": {
                    "title": result.get("title", ""),
                    "xaxis": {"title": x_col} if result["type"] != "pie" else {},
                    "yaxis": {"title": y_col} if result["type"] != "pie" else {},
                    "paper_bgcolor": "rgba(0,0,0,0)",
                    "plot_bgcolor": "rgba(0,0,0,0)",
                    "font": {"color": "rgba(255,255,255,0.8)"}
                }
            }
            return config
            
        return None
    except Exception as e:
        logger.error(f"VisualizerAgent failed: {e}")
        return None
