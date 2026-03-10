"""
RAG Engine — LlamaIndex QueryEngine with Groq LLM + Qdrant + Chat Memory.
Handles: retrieval → augmentation → generation → streaming.
"""
from functools import lru_cache
from typing import AsyncGenerator

from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.llms.openai_like import OpenAILike

from app.config import get_settings
from app.core.embedder import get_embedder
from app.core.vectorstore import get_vector_store


def build_groq_llm() -> OpenAILike:
    """
    Groq API is OpenAI-compatible — we point the OpenAI client at Groq's endpoint.
    llama-3.3-70b-versatile: free, 300 tok/sec, GPT-4o level quality.
    """
    cfg = get_settings()
    return OpenAILike(
        model=cfg.groq_model,
        api_base="https://api.groq.com/openai/v1",
        api_key=cfg.groq_api_key,
        is_chat_model=True,
        is_function_calling_model=False,
        temperature=0.1,
        max_tokens=1024,
    )


def build_index() -> VectorStoreIndex:
    """Load existing Qdrant collection as a LlamaIndex VectorStoreIndex."""
    embedder = get_embedder()
    vector_store = get_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # We're loading an existing index — no documents passed
    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embedder,
        storage_context=storage_context,
    )


def build_chat_engine(session_id: str) -> CondensePlusContextChatEngine:
    """
    Builds a fresh chat engine for a given session.
    CondensePlusContextChatEngine:
      - Condenses chat history + new question into a standalone query
      - Retrieves top-k chunks from Qdrant
      - Generates answer with full context
    """
    cfg = get_settings()
    llm = build_groq_llm()
    index = build_index()

    # Configure global LlamaIndex settings
    Settings.llm = llm
    Settings.embed_model = get_embedder()

    memory = ChatMemoryBuffer.from_defaults(token_limit=4096)

    retriever = index.as_retriever(similarity_top_k=cfg.top_k_results)

    system_prompt = """You are an expert RAG assistant. Your job is to answer questions 
based on the provided document context.

RULES:
1. Always ground your answer in the provided context chunks.
2. If the context is insufficient, say so clearly — do NOT hallucinate.
3. Always cite your source by mentioning the document name and page number from metadata.
4. Keep answers concise but complete.
5. If asked something outside the documents, say: "This information is not in the uploaded documents."
"""

    chat_engine = CondensePlusContextChatEngine.from_defaults(
        retriever=retriever,
        memory=memory,
        llm=llm,
        system_prompt=system_prompt,
        verbose=True,
    )

    return chat_engine


async def stream_rag_response(
    chat_engine: CondensePlusContextChatEngine,
    user_message: str,
) -> AsyncGenerator[str, None]:
    """
    Streams the LLM response token-by-token using LlamaIndex's streaming mode.
    Yields SSE-formatted chunks for the FastAPI endpoint.
    """
    streaming_response = await chat_engine.astream_chat(user_message)

    async for token in streaming_response.async_response_gen():
        yield token

    # Yield source nodes as a final metadata chunk
    sources = []
    if streaming_response.source_nodes:
        for node in streaming_response.source_nodes:
            sources.append({
                "source": node.metadata.get("source", "unknown"),
                "score": round(node.score or 0.0, 4),
                "text_preview": node.text[:200] + "..." if len(node.text) > 200 else node.text,
            })

    if sources:
        import json
        yield f"\n\n__SOURCES__{json.dumps(sources)}"
