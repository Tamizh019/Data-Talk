import asyncio
import logging
from app.core.schema_indexer import schema_indexer
from app.core.agent_service import route_query

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_rag_pipeline():
    print("\n--- Phase 1: Indexing Schema into pgvector ---")
    await schema_indexer.build_schema_index()
    
    print("\n--- Phase 2: Testing Semantic Retrieval ---")
    question = "Who are the students with the highest CGPA?"
    context = await schema_indexer.get_schema_context(question)
    print(f"Retrieved Context for '{question}':\n{context}")
    
    print("\n--- Phase 3: Testing End-to-End Routing ---")
    result = await route_query(question, [])
    print(f"Intent: {result['intent']}")
    if "sql" in result:
        print(f"Generated SQL: {result['sql']}")
    elif "explanation" in result:
        print(f"Chat Response: {result['explanation']}")

if __name__ == "__main__":
    asyncio.run(test_rag_pipeline())
