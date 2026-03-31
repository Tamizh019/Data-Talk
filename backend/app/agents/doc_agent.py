"""
Document RAG Agent (Gemini Pro)
Queries the data_talk_doc_vectors table via LlamaIndex to answer questions based strictly on uploaded documents.
"""
import logging
import asyncio
from llama_index.core import VectorStoreIndex
from app.core.vector_store import get_vector_store
from app.core.embedder import get_embed_model
from llama_index.llms.gemini import Gemini
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Keep index in memory
_doc_index = None

async def query_documents(user_query: str) -> str:
    """Retrieves context from documents and uses Gemini to answer."""
    global _doc_index
    try:
        if _doc_index is None:
            vector_store = get_vector_store("data_talk_doc_vectors")
            embed_model = get_embed_model()
            _doc_index = VectorStoreIndex.from_vector_store(
                vector_store=vector_store,
                embed_model=embed_model
            )

        # Initialize explicit LLM to ensure LlamaIndex uses our set model
        llm = Gemini(model="models/" + settings.visualizer_model, api_key=settings.gemini_api_key)

        query_engine = _doc_index.as_query_engine(
            similarity_top_k=5,
            response_mode="compact",
            llm=llm
        )
        
        response = await asyncio.to_thread(query_engine.query, user_query)
        
        if not response or not str(response).strip() or "Empty Response" in str(response):
            return "I couldn't find an answer to that in the uploaded documents."
        
        return str(response)

    except Exception as e:
        logger.error(f"[DocAgent] Failed to query documents: {e}", exc_info=True)
        return "I encountered an error while searching the documents. Please verify they were uploaded correctly."
