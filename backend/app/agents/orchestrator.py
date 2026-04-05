"""
Master Orchestrator
Chains the Multi-Agent system together (Router -> SQL -> QA -> Execution -> Visualizer -> Analyst).
Yields structured `thinking_step` events to the SSE stream for rich frontend UI rendering.
Each step emits a 'start' event (status: running) and a 'done' event with elapsed duration_ms.
"""
import logging
import time
from typing import AsyncGenerator

from app.core.security import guard_prompt
from app.core.schema_indexer import schema_indexer
from app.core.sql_executor import execute_sql
from app.core.cache import get_cached, set_cached

from app.agents.router_agent import classify_intent
from app.agents.sql_agent import generate_sql
from app.agents.doc_agent import query_documents
from app.agents.qa_agent import review_sql
from app.agents.visualizer_agent import generate_charts
from app.agents.analyst_agent import explain_results, chat_fallback
from app.agents.python_analyst_agent import run_python_sandbox
from app.agents.refiner_agent import format_response
from app.agents.error_explainer_agent import explain_error

logger = logging.getLogger(__name__)


def _step_start(id: str, type: str, label: str, detail: str) -> dict:
    """Emit a 'running' thinking step to begin timing a stage."""
    return {
        "event": "thinking_step",
        "data": {
            "id": id,
            "type": type,
            "label": label,
            "detail": detail,
            "status": "running",
        }
    }


def _step_done(id: str, started_at: float) -> dict:
    """Emit a 'done' thinking step with elapsed time in ms."""
    elapsed_ms = round((time.perf_counter() - started_at) * 1000)
    return {
        "event": "thinking_step",
        "data": {
            "id": id,
            "status": "done",
            "duration_ms": elapsed_ms,
        }
    }


async def run_pipeline(user_query: str, history: list) -> AsyncGenerator[dict, None]:
    try:
        # 1. Security Gate
        guard_prompt(user_query)

        # 2. Cache Check
        t = time.perf_counter()
        yield _step_start("cache", "routing", "Cache lookup", "Checking Redis for a previously computed answer to skip re-processing.")
        cached = await get_cached(user_query)
        if cached:
            yield _step_done("cache", t)
            yield {"event": "cached_result", "data": cached}
            return
        yield _step_done("cache", t)

        # 3. Router Agent
        t = time.perf_counter()
        yield _step_start("router", "routing", "Intent classification", "Analysing the question and routing it to the correct agent pipeline.")
        intent = await classify_intent(user_query, history)
        logger.info(f"[Orchestrator] Intent: {intent}")
        yield _step_done("router", t)
        yield {"event": "intent", "data": {"intent": intent}}

        # 4. Chat Path
        if intent == "chat":
            t = time.perf_counter()
            yield _step_start("chat", "synthesis", "Conversational response", "Generating a direct answer using the conversation history as context.")
            explanation = await chat_fallback(history, user_query)
            yield _step_done("chat", t)
            yield {"event": "explanation", "data": {"text": explanation}}
            return

        # 4.5. Document RAG Path
        if intent == "doc_rag":
            t = time.perf_counter()
            yield _step_start("doc_search", "tool_call", "Document retrieval", "Searching the vector store for the most relevant chunks from uploaded documents.")
            answer = await query_documents(user_query)
            yield _step_done("doc_search", t)

            viz_keywords = [
                "visual", "chart", "graph", "plot", "map", "draw",
                "overview", "show", "illustrate", "diagram", "dashboard"
            ]
            wants_viz = any(k in user_query.lower() for k in viz_keywords)

            if wants_viz:
                from app.agents.doc_visualizer_agent import generate_doc_charts
                t = time.perf_counter()
                yield _step_start("doc_viz", "synthesis", "Document visualisation", "Extracting key figures from document text and selecting the best chart layout.")
                charts = await generate_doc_charts(user_query, answer)
                yield _step_done("doc_viz", t)
                if charts:
                    yield {"event": "visualization", "data": {"charts": charts}}

            yield {"event": "explanation", "data": {"text": answer}}
            return

        # 5. Schema scan
        t = time.perf_counter()
        yield _step_start("schema", "tool_call", "Schema scan", "Querying the schema index to find the tables and columns most relevant to this request.")
        schema_context = await schema_indexer.get_schema_context(user_query)
        yield _step_done("schema", t)

        # 6. SQL Agent
        t = time.perf_counter()
        yield _step_start("sql_gen", "query_generation", "SQL query constructed", "Translating the natural-language question into an optimised SQL query.")
        sql = await generate_sql(schema_context, user_query, history)
        logger.info(f"[Orchestrator] Raw SQL Generated: {sql[:80]}...")
        yield _step_done("sql_gen", t)

        # 7. QA Agent
        t = time.perf_counter()
        yield _step_start("qa", "analysis", "Query validation", "Senior QA agent reviewing the generated SQL for correctness and safety before execution.")
        qa_result = await review_sql(schema_context, user_query, sql)
        if not qa_result.get("is_valid", True) and qa_result.get("fixed_sql"):
            logger.warning(f"[Orchestrator] QA Agent rejected SQL. Reason: {qa_result.get('reason')}. Fixing...")
            sql = qa_result["fixed_sql"]
            yield _step_done("qa", t)

            t = time.perf_counter()
            yield _step_start("qa_fix", "reflection", "Query auto-corrected", "QA agent detected an issue and rewrote the query to fix the identified problem.")
            yield _step_done("qa_fix", t)
        else:
            logger.info(f"[Orchestrator] QA Agent approved SQL.")
            yield _step_done("qa", t)

        # Emit final approved SQL
        yield {"event": "sql_generated", "data": {"sql": sql}}

        # 8. Execution & Auto-Correction Engine
        max_retries = 2
        attempts = 1 if qa_result.get("is_valid", True) else 2
        rows, columns = None, None

        for attempt in range(max_retries + 1):
            try:
                t = time.perf_counter()
                yield _step_start("execute", "tool_call", "Database query executed", f"Running the SQL against the live database (attempt {attempt + 1}).")
                rows, columns = await execute_sql(sql)
                yield _step_done("execute", t)
                break  # Execution successful
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"[Orchestrator] SQL execution failed (attempt {attempt+1}): {error_msg}")
                yield _step_done("execute", t)

                if attempt < max_retries:
                    error_context = f"The previous SQL query failed with this error:\n{error_msg}\n\nPlease fix the query so it is valid. CRITICAL: Pay exact attention to table names from the schema."
                    t = time.perf_counter()
                    yield _step_start("retry", "reflection", f"Auto-correction (attempt {attempt + 1})", f"DB error detected. AI is rewriting the query to resolve: {error_msg[:80]}...")
                    sql = await generate_sql(schema_context, user_query, history, error_context)
                    yield _step_done("retry", t)
                    yield {"event": "sql_generated", "data": {"sql": sql}}
                    attempts += 1
                else:
                    raise RuntimeError(f"Database error after {max_retries} automatic retry attempts:\n{error_msg}")

        yield {
            "event": "query_result",
            "data": {
                "rows": rows,
                "columns": columns,
                "sql_used": sql,
                "attempts": attempts,
                "row_count": len(rows),
            }
        }

        # 8.5. Python Sandbox Agent
        t = time.perf_counter()
        yield _step_start("python", "tool_call", "Python sandbox", "Checking if advanced statistical or scientific computation is needed and running it in a secure sandbox.")
        rows, columns = await run_python_sandbox(user_query, rows, columns)
        yield _step_done("python", t)

        # 9. Visualizer Agent
        t = time.perf_counter()
        yield _step_start("visualize", "synthesis", "Dashboard visualisations built", f"Analysing {len(rows)} rows and selecting the optimal chart types and layout for the data.")
        charts = await generate_charts(columns, rows, user_query, len(rows))
        yield _step_done("visualize", t)
        if charts:
            yield {"event": "visualization", "data": {"charts": charts}}

        # 10. Analyst Agent
        t = time.perf_counter()
        yield _step_start("analyst", "analysis", "Statistical analysis", "Computing aggregates, trends, and anomalies. Synthesising key business insights from the result set.")
        raw_explanation = await explain_results(user_query, rows, columns)
        yield _step_done("analyst", t)

        # 10.5 Formatter Agent — question-aware final pass
        t = time.perf_counter()
        yield _step_start("refine", "synthesis", "Formatting response", "Matching the answer structure to your question type — ranking, aggregate, trend, comparison, or overview.")
        refined_explanation = await format_response(user_query, raw_explanation)
        yield _step_done("refine", t)

        yield {"event": "explanation", "data": {"text": refined_explanation}}

        # 11. Cache Results
        await set_cached(user_query, {
            "sql": sql,
            "rows": rows,
            "columns": columns,
            "charts": charts,
            "explanation": refined_explanation,
        })

    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        friendly = await explain_error(user_query, str(e))
        yield {"event": "error", "data": {"message": friendly}}
    except RuntimeError as e:
        logger.error(f"Execution error: {e}")
        friendly = await explain_error(user_query, str(e))
        yield {"event": "error", "data": {"message": friendly}}
    except Exception as e:
        logger.exception(f"Unexpected error in orchestrator: {e}")
        friendly = await explain_error(user_query, str(e))
        yield {"event": "error", "data": {"message": friendly}}
