"""
Schema Indexer: reads the PostgreSQL schema.
- If USE_PGVECTOR=true  -> indexes into pgvector via LlamaIndex (proper RAG)
- If USE_PGVECTOR=false  -> returns raw schema text to Gemini (simple fallback)
"""
import logging
import asyncio
from typing import List, Dict
from sqlalchemy import text
from app.core.sql_executor import get_db_engine
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SchemaIndexer:
    def __init__(self):
        self._index = None
        self._last_table_hash = None

    async def fetch_db_schema(self) -> List[Dict]:
        """Fetches the database schema from the connected Postgres."""
        query = text("""
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
            WHERE t.table_schema = :schema
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position;
        """)

        try:
            engine = get_db_engine()
            async with engine.connect() as conn:
                result = await conn.execute(query, {"schema": settings.target_schema})
                rows = result.fetchall()

                schema_map = {}
                for r in rows:
                    table, col, dtype, nullable = r
                    if table not in schema_map:
                        schema_map[table] = []
                    schema_map[table].append(f"{col} ({dtype})")

                return [{"table": k, "columns": ", ".join(v)} for k, v in schema_map.items()]
        except Exception as e:
            logger.error(f"[SchemaIndexer] Failed to fetch schema from DB: {e}")
            return []

    def _format_schema(self, tables: List[Dict]) -> str:
        """Formats schema tables into a readable string for Gemini."""
        if not tables:
            return "The database is currently empty or disconnected."
        return "\n\n".join([f"Table {t['table']}: {t['columns']}" for t in tables])

    async def build_schema_index(self):
        """Indexes schema into pgvector if enabled, otherwise does nothing."""
        if not settings.use_pgvector:
            logger.info("[SchemaIndexer] pgvector is disabled. Skipping vector indexing.")
            return

        try:
            # Lazy import - only load LlamaIndex when actually needed
            from llama_index.core import Document, VectorStoreIndex
            from app.core.vector_store import get_vector_store
            from app.core.embedder import get_embed_model
            import hashlib
            import json
            import os

            tables = await self.fetch_db_schema()
            if not tables:
                logger.warning("[SchemaIndexer] No tables found to index.")
                return

            current_hash = hashlib.md5(json.dumps(tables, sort_keys=True).encode()).hexdigest()
            cache_file = os.path.join(os.path.dirname(__file__), ".schema_hash.json")
            
            # Check persistent disk cache
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, "r") as f:
                        cached_data = json.load(f)
                        if cached_data.get("hash") == current_hash:
                            logger.info("[SchemaIndexer] Schema unchanged (disk cache match). Skipping pgvector re-indexing.")
                            return
                except Exception as e:
                    logger.warning(f"Failed to read schema cache: {e}")
            
            logger.info("[SchemaIndexer] Starting RAG indexing into pgvector...")
            
            # Save new hash to disk immediately
            try:
                with open(cache_file, "w") as f:
                    json.dump({"hash": current_hash}, f)
            except Exception as e:
                logger.warning(f"Failed to write schema cache: {e}")

            documents = []
            for table_data in tables:
                table_name = table_data["table"]
                cols = table_data["columns"]
                content = f"Table: {table_name}\nColumns: {cols}\n"
                doc = Document(
                    text=content,
                    metadata={"table_name": table_name, "type": "schema_chunk"},
                    doc_id=f"table_{table_name}"
                )
                documents.append(doc)

            vector_store = get_vector_store()
            embed_model = get_embed_model()

            self._index = await asyncio.to_thread(
                VectorStoreIndex.from_documents,
                documents,
                vector_store=vector_store,
                embed_model=embed_model,
                show_progress=True
            )

            logger.info(f"[SchemaIndexer] Indexed {len(documents)} tables into pgvector.")

        except Exception as e:
            logger.error(f"[SchemaIndexer] RAG Indexing failed: {e}", exc_info=True)

    async def get_schema_context(self, question: str, top_k: int = 3) -> str:
        """
        Returns schema context for the SQL generator.
        - USE_PGVECTOR=false -> returns full raw schema text (old behavior)
        - USE_PGVECTOR=true  -> returns only relevant chunks via vector search
        """
        if not settings.use_pgvector:
            # ---- FALLBACK: exactly how it worked before ----
            tables = await self.fetch_db_schema()
            return self._format_schema(tables)

        # ---- PROPER RAG: semantic retrieval via pgvector ----
        try:
            from llama_index.core import VectorStoreIndex
            from app.core.vector_store import get_vector_store
            from app.core.embedder import get_embed_model

            if self._index is None:
                vector_store = get_vector_store()
                embed_model = get_embed_model()
                self._index = VectorStoreIndex.from_vector_store(
                    vector_store=vector_store,
                    embed_model=embed_model
                )

            retriever = self._index.as_retriever(similarity_top_k=top_k)
            nodes = await asyncio.to_thread(retriever.retrieve, question)

            if not nodes:
                logger.warning("[SchemaIndexer] No nodes retrieved, falling back to full schema")
                tables = await self.fetch_db_schema()
                return self._format_schema(tables)

            context = "\n\n".join(node.get_content() for node in nodes)
            logger.info(f"[SchemaIndexer] RAG retrieved {len(nodes)} schema chunks.")
            return context

        except Exception as e:
            logger.error(f"[SchemaIndexer] Retrieval failed: {e}")
            tables = await self.fetch_db_schema()
            return self._format_schema(tables)


# Singleton instance
schema_indexer = SchemaIndexer()
