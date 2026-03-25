"""
Master Orchestrator
Chains the Multi-Agent system together (Router -> SQL -> QA -> Execution -> Visualizer -> Analyst).
Yields events directly to the SSE streams.
"""
import logging
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

logger = logging.getLogger(__name__)

async def run_pipeline(user_query: str, history: list) -> AsyncGenerator[dict, None]:
    try:
        # 1. Security Gate
        guard_prompt(user_query)

        # 2. Cache Check
        cached = await get_cached(user_query)
        if cached:
            yield {"event": "step", "data": {"label": "Found cached result — loading instantly ⚡"}}
            yield {"event": "cached_result", "data": cached}
            return

        # 3. Router Agent
        yield {"event": "step", "data": {"label": "Reading your question and routing to the right agent..."}}
        intent = await classify_intent(user_query, history)
        logger.info(f"[Orchestrator] Intent: {intent}")
        yield {"event": "intent", "data": {"intent": intent}}

        # 4. Chat Path
        if intent == "chat":
            yield {"event": "step", "data": {"label": "Thinking through your question..."}}
            explanation = await chat_fallback(history, user_query)
            yield {"event": "explanation", "data": {"text": explanation}}
            return

        # 4.5. Document RAG Path
        if intent == "doc_rag":
            yield {"event": "step", "data": {"label": "Searching through your uploaded documents..."}}
            answer = await query_documents(user_query)
            
            viz_keywords = [
                "visual", "chart", "graph", "plot", "map", "draw",
                "overview", "show", "illustrate", "diagram", "dashboard"
            ]
            wants_viz = any(k in user_query.lower() for k in viz_keywords)
            
            if wants_viz:
                from app.agents.doc_visualizer_agent import generate_doc_charts
                yield {"event": "step", "data": {"label": "Extracting key data points from documents..."}}
                yield {"event": "step", "data": {"label": "Designing the best visual layout for your answer..."}}
                charts = await generate_doc_charts(user_query, answer)
                if charts:
                    yield {"event": "visualization", "data": {"charts": charts}}
                    
            yield {"event": "explanation", "data": {"text": answer}}
            return

        # 5. SQL Path
        yield {"event": "step", "data": {"label": "Scanning the database schema for relevant tables..."}}
        schema_context = await schema_indexer.get_schema_context(user_query)
        
        # 6. SQL Agent
        yield {"event": "step", "data": {"label": "Composing a precise SQL query for your question..."}}
        sql = await generate_sql(schema_context, user_query, history)
        logger.info(f"[Orchestrator] Raw SQL Generated: {sql[:80]}...")
        
        # 7. QA Agent
        yield {"event": "step", "data": {"label": "Senior QA agent reviewing the query for accuracy..."}}
        qa_result = await review_sql(schema_context, user_query, sql)
        if not qa_result.get("is_valid", True) and qa_result.get("fixed_sql"):
            logger.warning(f"[Orchestrator] QA Agent rejected SQL. Reason: {qa_result.get('reason')}. Fixing...")
            sql = qa_result["fixed_sql"]
            yield {"event": "step", "data": {"label": "Query corrected — applying fix and re-validating..."}}
        else:
            logger.info(f"[Orchestrator] QA Agent approved SQL.")
        
        # Emit final approved SQL
        yield {"event": "sql_generated", "data": {"sql": sql}}

        # 8. Execution
        yield {"event": "step", "data": {"label": "Executing query against the live database..."}}
        rows, columns = await execute_sql(sql)
        yield {
            "event": "query_result",
            "data": {
                "rows": rows,
                "columns": columns,
                "sql_used": sql,
                "attempts": 2 if not qa_result.get("is_valid", True) else 1,
                "row_count": len(rows),
            }
        }

        # 9. Visualizer Agent
        yield {"event": "step", "data": {"label": f"Analyzing {len(rows)} rows — deciding the best charts and visuals..."}}
        charts = await generate_charts(columns, rows, user_query, len(rows))
        if charts:
            yield {"event": "step", "data": {"label": "Rendering dashboard components..."}}
            yield {"event": "visualization", "data": {"charts": charts}}

        # 10. Analyst Agent
        yield {"event": "step", "data": {"label": "Crafting a business summary and key insights..."}}
        explanation = await explain_results(user_query, rows, columns)
        yield {"event": "explanation", "data": {"text": explanation}}

        # 11. Cache Results
        await set_cached(user_query, {
            "sql": sql,
            "rows": rows,
            "columns": columns,
            "charts": charts,
            "explanation": explanation,
        })

    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        yield {"event": "error", "data": {"message": str(e)}}
    except RuntimeError as e:
        logger.error(f"Execution error: {e}")
        yield {"event": "error", "data": {"message": str(e)}}
    except Exception as e:
        logger.exception(f"Unexpected error in orchestrator: {e}")
        yield {"event": "error", "data": {"message": f"An unexpected error occurred: {str(e)}"}}
