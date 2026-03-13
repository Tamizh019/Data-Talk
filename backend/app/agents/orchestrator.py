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
from app.agents.qa_agent import review_sql
from app.agents.visualizer_agent import generate_chart
from app.agents.analyst_agent import explain_results, chat_fallback

logger = logging.getLogger(__name__)

async def run_pipeline(user_query: str, history: list) -> AsyncGenerator[dict, None]:
    try:
        # 1. Security Gate
        guard_prompt(user_query)

        # 2. Cache Check
        cached = await get_cached(user_query)
        if cached:
            yield {"event": "cached_result", "data": cached}
            return

        # 3. Router Agent (Groq Llama 3 8B)
        intent = await classify_intent(user_query, history)
        logger.info(f"[Orchestrator] Intent: {intent}")
        yield {"event": "intent", "data": {"intent": intent}}

        # 4. Chat Path
        if intent == "chat":
            explanation = await chat_fallback(history, user_query)
            yield {"event": "explanation", "data": {"text": explanation}}
            return

        # 5. SQL Path - Schema Retrieval
        schema_context = await schema_indexer.get_schema_context(user_query)
        
        # 6. SQL Agent (OpenRouter Claude 3.5 Sonnet)
        sql = await generate_sql(schema_context, user_query, history)
        logger.info(f"[Orchestrator] Raw SQL Generated: {sql[:80]}...")
        
        # 7. QA Agent (Groq Llama 3 70B)
        qa_result = await review_sql(schema_context, user_query, sql)
        if not qa_result.get("is_valid", True) and qa_result.get("fixed_sql"):
            logger.warning(f"[Orchestrator] QA Agent rejected SQL. Reason: {qa_result.get('reason')}. Fixing...")
            sql = qa_result["fixed_sql"]
        else:
            logger.info(f"[Orchestrator] QA Agent approved SQL.")
        
        # Emit final approved SQL
        yield {"event": "sql_generated", "data": {"sql": sql}}

        # 8. Execution
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

        # 9. Visualizer Agent (Groq Llama 3 70B)
        chart_config = await generate_chart(columns, rows)
        if chart_config:
            yield {"event": "visualization", "data": {"plotly_config": chart_config}}

        # 10. Analyst Agent (Gemini Pro)
        explanation = await explain_results(user_query, rows, columns)
        yield {"event": "explanation", "data": {"text": explanation}}

        # 11. Cache Results
        await set_cached(user_query, {
            "sql": sql,
            "rows": rows,
            "columns": columns,
            "plotly_config": chart_config,
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
