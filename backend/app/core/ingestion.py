"""
Ingestion Pipeline — PDF → parse → chunk → embed → store in Qdrant.
Uses pypdf for text extraction, pdfplumber for table-heavy PDFs.
"""
import os
import tempfile
from pathlib import Path
from typing import List

import pypdf
import pdfplumber
from llama_index.core import Document, VectorStoreIndex, StorageContext
from llama_index.core.node_parser import SentenceSplitter

from app.config import get_settings
from app.core.embedder import get_embedder
from app.core.vectorstore import get_vector_store


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from PDF using pypdf.
    Falls back to pdfplumber for pages with no extractable text (e.g. tables).
    """
    full_text = ""
    filename = Path(file_path).name

    # Primary: pypdf (fast, handles most PDFs)
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                full_text += f"\n[Page {i + 1}]\n{text}"

    # Fallback: pdfplumber (better for tables/complex layouts)
    if not full_text.strip():
        print(f"  [Ingestion] pypdf found no text in {filename}, trying pdfplumber...")
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                full_text += f"\n[Page {i + 1}]\n{text}"

    return full_text


def ingest_pdf_file(file_path: str, source_name: str) -> dict:
    """
    Full ingestion pipeline for a single PDF:
    1. Parse text from PDF
    2. Create LlamaIndex Document with metadata
    3. Chunk with SentenceSplitter
    4. Embed with bge-large and store in Qdrant
    Returns a summary dict with chunk count.
    """
    settings = get_settings()

    print(f"[Ingestion] Processing: {source_name}")

    # 1. Extract text
    raw_text = extract_text_from_pdf(file_path)
    if not raw_text.strip():
        raise ValueError(f"No text could be extracted from {source_name}")

    # 2. Create LlamaIndex Document with metadata
    document = Document(
        text=raw_text,
        metadata={
            "source": source_name,
            "file_path": file_path,
        },
        metadata_seperator="::",
        text_template="Metadata: {metadata_str}\n\nContent: {content}",
    )

    # 3. Setup chunker
    splitter = SentenceSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

    # 4. Setup storage & index
    embedder = get_embedder()
    vector_store = get_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # 5. Build index (this embeds + stores in Qdrant automatically)
    index = VectorStoreIndex.from_documents(
        [document],
        storage_context=storage_context,
        embed_model=embedder,
        transformations=[splitter],
        show_progress=True,
    )

    # Count nodes for response
    nodes = splitter.get_nodes_from_documents([document])

    print(f"[Ingestion] Stored {len(nodes)} chunks from {source_name} ✓")
    return {
        "source": source_name,
        "chunks": len(nodes),
        "status": "success",
    }


async def ingest_uploaded_file(file_bytes: bytes, filename: str) -> dict:
    """Saves uploaded bytes to a permanent data folder and runs ingestion."""
    settings = get_settings()
    data_path = Path(settings.data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    # Save a permanent copy in the data folder
    # If file exists, it will be overwritten
    permanent_path = data_path / filename
    with open(permanent_path, "wb") as f:
        f.write(file_bytes)

    # Run the ingestion pipeline on the saved file
    result = ingest_pdf_file(str(permanent_path), source_name=filename)

    return result
