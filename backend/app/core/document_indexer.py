import logging
import asyncio
import os
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, Document
from app.core.vector_store import get_storage_context
from app.core.embedder import get_embed_model

logger = logging.getLogger(__name__)

# Single global index for documents
_doc_index = None

async def index_document_file(file_path: str):
    """
    Reads a file using LlamaIndex SimpleDirectoryReader, 
    and indexes it into the data_talk_doc_vectors pgvector table.
    """
    logger.info(f"[DocumentIndexer] Indexing file: {file_path}")
    try:
        # Load documents
        reader = SimpleDirectoryReader(input_files=[file_path])
        documents = await asyncio.to_thread(reader.load_data)
        
        if not documents:
            logger.warning("[DocumentIndexer] No text found in file.")
            return False

        # Tag them with type
        for doc in documents:
            file_name = os.path.basename(file_path)
            doc.metadata["type"] = "document_chunk"
            doc.metadata["file_name"] = file_name
            # Prevent overriding doc_id later
            doc.id_ = f"{file_name}_{doc.id_}"

        storage_context = get_storage_context("data_talk_doc_vectors")
        embed_model = get_embed_model()

        # Insert them directly
        index = await asyncio.to_thread(
            VectorStoreIndex.from_documents,
            documents,
            storage_context=storage_context,
            embed_model=embed_model,
            show_progress=True
        )
        
        global _doc_index
        _doc_index = index
        logger.info(f"[DocumentIndexer] Successfully indexed {len(documents)} chunks from {file_path}.")
        return True
    except Exception as e:
        logger.error(f"[DocumentIndexer] Failed to index document: {e}", exc_info=True)
        return False
