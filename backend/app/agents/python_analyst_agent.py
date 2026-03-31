"""
Python Sandbox Analyst Agent (Phase 6)
Analyzes database rows. If advanced math/forecasting/stats is needed, writes and executes 
safe Python (Pandas/NumPy) code to transform the data before passing it to the visualizer.
"""
import json
import logging
import pandas as pd
import numpy as np
from groq import AsyncGroq
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

client = AsyncGroq(api_key=settings.groq_api_key)

PYTHON_SYSTEM = """You are a Python Data Scientist AI.
Your job: Determine if the user's question requires advanced Python processing (math, aggregations, forecasting, stats) that the SQL database did NOT already do.
If it does, write raw Python code to process a pandas DataFrame.

Input available to your code:
- `df`: A Pandas DataFrame containing the query results.

Output required:
- You MUST define an output list of dictionaries named `result`.
- For example: `result = df.to_dict('records')`
- You are strictly limited to `pandas` (as `pd`) and `numpy` (as `np`).

If no python is needed (the SQL data is already perfect for the question), output 'NO_PYTHON_NEEDED'.
Otherwise, output ONLY the raw Python code. No markdown fences, no explanations.
"""

async def run_python_sandbox(user_query: str, rows: list, columns: list) -> tuple[list, list]:
    # 1. Quick Keyword Heuristics
    math_keywords = ["predict", "forecast", "regression", "average of", "trend", "correlation", "variance", "std dev", "stat"]
    needs_math = any(k in user_query.lower() for k in math_keywords)

    if not rows or not needs_math:
        return rows, columns

    # 2. Prompt LLM to write code
    sample_data = rows[:5]
    prompt = f"### User Question\n{user_query}\n\n### Data Columns\n{columns}\n\n### Sample Data\n{json.dumps(sample_data)}\n\n### Python Code:"
    
    try:
        completion = await client.chat.completions.create(
            model=settings.python_agent_model,
            messages=[
                {"role": "system", "content": PYTHON_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
        )
        
        code = completion.choices[0].message.content.strip()
        code = code.replace("```python", "").replace("```", "").strip()
        
        if code == "NO_PYTHON_NEEDED" or not code:
            return rows, columns
            
        logger.info(f"[PythonAgent] Executing Sandbox Code:\n{code[:100]}...")
        
        # 3. Create Sandbox Environment
        df = pd.DataFrame(rows)
        # Safe globals restricting os, sys, etc.
        safe_globals = {
            "__builtins__": {
                "sum": sum, "len": len, "round": round, "abs": abs,
                "min": min, "max": max, "int": int, "float": float, "str": str, "dict": dict, "list": list
            },
            "pd": pd,
            "np": np
        }
        local_env = {"df": df, "result": None}
        
        # 4. Execute Code
        exec(code, safe_globals, local_env)
        
        # 5. Extract Result
        result = local_env.get("result")
        
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
            new_cols = list(result[0].keys())
            logger.info(f"[PythonAgent] Transformed {len(rows)} rows to {len(result)} rows.")
            return result, new_cols
        elif isinstance(result, pd.DataFrame):
            # If the AI forgot to `.to_dict('records')`, handle it gracefully
            res_list = result.to_dict('records')
            new_cols = list(result.columns)
            return res_list, new_cols
            
        logger.warning("[PythonAgent] Result was not a valid list of dicts. Ignoring execution.")
        return rows, columns

    except Exception as e:
        logger.error(f"[PythonAgent] Execution failed: {e}")
        # On failure, return original dataset so the pipeline doesn't crash completely
        return rows, columns
