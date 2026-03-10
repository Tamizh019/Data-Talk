"""
Bulk Ingestion Script — Pre-loads all PDFs from backend/data/ into Qdrant.

Usage:
    1. Create folder: backend/data/
    2. Drop all your PDFs inside it
    3. Make sure Qdrant is running (docker-compose up qdrant -d)
    4. Run: python ingest_bulk.py

This is a one-time setup script. You can re-run it to add more documents.
"""

import os
import sys
import time
from pathlib import Path

# Add the project root to path so app imports work
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from app.core.ingestion import ingest_pdf_file
from app.core.vectorstore import get_qdrant_client, ensure_collection_exists
from app.config import get_settings

DATA_DIR = Path(__file__).parent / "data"


def run_bulk_ingest():
    settings = get_settings()

    print("=" * 55)
    print("  RAG Chatbot — Bulk Ingestion Script")
    print("=" * 55)
    print(f"  Vector DB : Qdrant @ {settings.qdrant_host}:{settings.qdrant_port}")
    print(f"  Collection: {settings.qdrant_collection}")
    print(f"  Embedder  : {settings.embedding_model}")
    print(f"  Data Dir  : {DATA_DIR}")
    print("=" * 55)

    # Ensure data directory exists
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True)
        print(f"\n📁 Created folder: {DATA_DIR}")
        print("   Add your PDF files there and re-run this script.")
        return

    # Find all PDFs
    pdf_files = list(DATA_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"\n⚠️  No PDF files found in: {DATA_DIR}")
        print("   Add .pdf files there and re-run.")
        return

    print(f"\n📚 Found {len(pdf_files)} PDF(s) to ingest:\n")
    for f in pdf_files:
        size_mb = f.stat().st_size / (1024 * 1024)
        print(f"   • {f.name} ({size_mb:.1f} MB)")

    print("\n🔌 Connecting to Qdrant...")
    client = get_qdrant_client()
    ensure_collection_exists(client, settings.qdrant_collection)

    print("\n🧠 Loading embedding model (first run downloads ~1.3GB)...")

    # Run ingestion
    results = []
    total_start = time.time()

    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\n[{i}/{len(pdf_files)}] Processing: {pdf_path.name}")
        start = time.time()
        try:
            result = ingest_pdf_file(str(pdf_path), source_name=pdf_path.name)
            elapsed = time.time() - start
            results.append({"file": pdf_path.name, "chunks": result["chunks"], "status": "✅", "time": elapsed})
            print(f"   ✅ Done — {result['chunks']} chunks in {elapsed:.1f}s")
        except Exception as e:
            elapsed = time.time() - start
            results.append({"file": pdf_path.name, "chunks": 0, "status": "❌", "time": elapsed})
            print(f"   ❌ Failed: {e}")

    total_elapsed = time.time() - total_start

    # Summary
    print("\n" + "=" * 55)
    print("  INGESTION SUMMARY")
    print("=" * 55)
    for r in results:
        print(f"  {r['status']} {r['file']:<35} {r['chunks']:>4} chunks  ({r['time']:.1f}s)")

    success = sum(1 for r in results if r["status"] == "✅")
    total_chunks = sum(r["chunks"] for r in results)

    print("-" * 55)
    print(f"  {success}/{len(pdf_files)} files ingested | {total_chunks} total chunks | {total_elapsed:.1f}s total")
    print("=" * 55)
    print("\n🚀 Knowledge base ready. Start your chatbot and ask away!")


if __name__ == "__main__":
    run_bulk_ingest()
