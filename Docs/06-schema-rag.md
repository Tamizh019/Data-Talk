# 🔍 Schema RAG — How Data-Talk Understands Your Database

> This is the most technically important document in the `/Docs` folder.  
> It explains exactly how Data-Talk **finds the right database tables** for any question — without sending your entire schema to an AI every single time.

---

## The Problem This Solves

If your database has 50+ tables, sending the entire schema to an LLM on every query is:
- 🐢 **Slow** — large prompts take longer to process
- 💸 **Expensive** — more tokens = more API cost
- 🎯 **Inaccurate** — LLMs get confused when there's too much irrelevant context

**Schema RAG** solves all three problems by only sending the 2-3 most relevant table definitions to the SQL Agent — not the whole schema.

---

## What is RAG?

**RAG = Retrieval-Augmented Generation.**

Instead of putting everything into the LLM prompt, you:
1. Store your knowledge in a **vector database**
2. When a question arrives, **search** the vector database for only the relevant pieces
3. Pass **only those pieces** to the LLM

Data-Talk does this specifically for your **database schema** — table names and column definitions.

---

## The Two Phases

### Phase 1 — Indexing (happens once at connect time)

```
User connects to a database
         │
         ▼
┌──────────────────────────────────────────────────────┐
│              schema_indexer.build_schema_index()     │
│                                                      │
│  1. FETCH schema from information_schema             │
│  2. HASH tables with MD5                             │
│  3. If hash matches cached hash → SKIP (no API call) │
│  4. If new/changed → EMBED each table via Gemini     │
│  5. STORE vectors in pgvector (Supabase SYSTEM_DB)   │
└──────────────────────────────────────────────────────┘
```

### Phase 2 — Retrieval (happens on every user question)

```
User types: "Which product has the highest ratings?"
         │
         ▼
┌──────────────────────────────────────────────────────┐
│           schema_indexer.get_schema_context()        │
│                                                      │
│  1. EMBED the user's question via Gemini             │
│  2. SEARCH pgvector — find top 3 most similar chunks │
│  3. RETURN the matching table definitions as text    │
└──────────────────────────────────────────────────────┘
         │
         ▼
Only the 2-3 relevant table definitions are passed to the SQL Agent
```

---

## Phase 1 Deep Dive — Indexing in Detail

### Step 1 — Fetch Schema from PostgreSQL

**File:** `backend/app/core/schema_indexer.py` → `fetch_db_schema()`

As soon as a user connects to their database, we run this SQL query against PostgreSQL's own internal catalog:

```sql
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
```

This returns every table and every column in the database. We then group the columns by table into a clean structure:

```python
[
  { "table": "products",  "columns": "id (integer), name (text), price (numeric), category (text)" },
  { "table": "reviews",   "columns": "id (integer), product_id (integer), rating (numeric), user_id (integer)" },
  { "table": "customers", "columns": "id (integer), name (text), email (text), region (text)" },
  # ... one dict per table
]
```

---

### Step 2 — Check the Persistent Hash Cache (Avoid Redundant Embeddings)

**File:** `backend/app/core/schema_indexer.py` → `build_schema_index()`

Before calling Gemini's embedding API (which costs time and API quota), we:

1. Compute an **MD5 hash** of the entire fetched schema
2. Compare it against the hash saved in **`.schema_hash.json`** on disk

```python
current_hash = hashlib.md5(json.dumps(tables, sort_keys=True).encode()).hexdigest()
```

```
┌─ .schema_hash.json exists? ──────────────────────────┐
│                                                      │
│  hash matches → STOP. Skip embedding completely.     │
│                 Vectors already in pgvector.         │
│                                                      │
│  hash differs → Schema changed! Proceed to embed.   │
│                 Save new hash to disk.               │
└──────────────────────────────────────────────────────┘
```

> **Why disk and not memory?** If we only stored the hash in Python memory, every server restart (even a hot-reload during development) would trigger a full re-embedding. The disk file persists across restarts.

---

### Step 3 — Convert Each Table Into a LlamaIndex Document

**File:** `backend/app/core/schema_indexer.py` → `build_schema_index()`

Each table is wrapped into a **LlamaIndex `Document` object**:

```python
for table_data in tables:
    content = f"Table: {table_name}\nColumns: {cols}\n"
    doc = Document(
        text=content,                        # ← The text that gets embedded
        metadata={"table_name": table_name}, # ← Stored alongside the vector
        doc_id=f"table_{table_name}"         # ← Stable ID for updates
    )
```

**Example document text:**
```
Table: products
Columns: id (integer), name (text), discount_price (numeric), actual_price (numeric), ratings (numeric), no_of_ratings (integer), category (text)
```

This human-readable text is what gets converted to a vector.

---

### Step 4 — Embed Each Document via Gemini

**File:** `backend/app/core/embedder.py`

The system uses **`models/gemini-embedding-001`** — Google's dedicated embedding model (not a chat model).

```python
# embedder.py
GeminiEmbedding(
    model_name="models/gemini-embedding-001",
    api_key=settings.gemini_api_key
)
```

The embedding model reads the table text and outputs a **vector of 3072 numbers** — a mathematical "fingerprint" that captures the semantic meaning of that table.

```
"Table: products\nColumns: name, price, ratings..." 
        │
        ▼  Gemini Embedding Model
        ▼
[0.023, -0.41, 0.887, 0.012, -0.334, ... ]  ← 3072 numbers
```

Tables about similar things (e.g., `products` and `product_reviews`) will produce vectors that are mathematically close to each other. Unrelated tables (e.g., `shipping_zones`) will produce vectors far away.

---

### Step 5 — Store Vectors in pgvector (Permanent Supabase DB)

**File:** `backend/app/core/vector_store.py`

The vectors are stored in a completely separate **permanent Supabase database** — not the user's own database. This is critical:

| | User's Database | System DB (Supabase) |
|---|---|---|
| Contains | Their actual data | The schema vectors |
| Controlled by | The user | Data-Talk |
| Used for | Running SQL queries | Vector similarity search |
| Changes when | User modifies their data | Schema changes |

```python
PGVectorStore.from_params(
    host=...,
    table_name="data_talk_vectors",
    embed_dim=3072,      # must match Gemini output size
    perform_setup=True   # auto-creates the pgvector extension and table
)
```

LlamaIndex handles the actual database write. It stores:
- The original text (`"Table: products\nColumns: ..."`)
- The 3072-dimension vector
- The metadata (`table_name`, `type: schema_chunk`)

---

### Step 6 — LlamaIndex Creates the Index

**File:** `backend/app/core/schema_indexer.py`

```python
self._index = VectorStoreIndex.from_documents(
    documents,
    vector_store=vector_store,
    embed_model=embed_model,
    show_progress=True
)
```

`VectorStoreIndex` is LlamaIndex's abstraction layer. It:
- Takes all the documents
- Calls the embed model on each one  
- Writes vectors + text to pgvector
- Returns an index object that knows how to search it

The index object is stored in memory (`self._index`) for fast reuse within the same server session.

---

## Phase 2 Deep Dive — Retrieval in Detail

**File:** `backend/app/core/schema_indexer.py` → `get_schema_context()`

This runs **every time a user asks a question**.

### Step 1 — Lazy-Load the Index (if not in memory)

If the server just restarted, `self._index` is `None`. Instead of re-embedding everything, LlamaIndex simply **reconnects to the existing vectors** in pgvector:

```python
if self._index is None:
    self._index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model
    )
```

This is nearly instant — it doesn't call any embedding APIs. It just attaches to the existing data in Supabase.

---

### Step 2 — Embed the User's Question

```python
retriever = self._index.as_retriever(similarity_top_k=3)
nodes = retriever.retrieve(question)
```

When `.retrieve(question)` is called, LlamaIndex internally:
1. Sends the user's question text to the Gemini embedding API
2. Gets back a 3072-dimension vector for the question

```
"Which product has the highest discount?"
        │
        ▼  Gemini Embedding Model (same model used for tables)
        ▼
[0.19, -0.28, 0.71, 0.04, -0.55, ... ]  ← 3072 numbers
```

---

### Step 3 — Compare Question Vector to All Table Vectors in pgvector

pgvector performs a **cosine similarity search** — it mathematically measures the "angle" between the question vector and every stored table vector.

```
Question Vector       Table Vectors in pgvector
     │                     │
     │    cosine_sim()      │
     ├──────────────────── products      → similarity: 0.91 ✅ HIGH
     ├──────────────────── reviews       → similarity: 0.78 ✅ MEDIUM  
     ├──────────────────── customers     → similarity: 0.21 ❌ LOW
     ├──────────────────── shipping_log  → similarity: 0.08 ❌ LOW
     └──────────────────── categories    → similarity: 0.45
```

`similarity_top_k=3` means: **return only the 3 highest-scoring tables**.

Cosine similarity ranges from:
- `1.0` = vectors point in exactly the same direction (perfect semantic match)
- `0.0` = completely unrelated meaning

---

### Step 4 — Return Table Definitions as Context String

The top 3 matching tables are joined into a plain text string:

```python
context = "\n\n".join(node.get_content() for node in nodes)
```

**Output:**
```
Table: products
Columns: id (integer), name (text), discount_price (numeric), actual_price (numeric), ratings (numeric), category (text)

Table: reviews
Columns: id (integer), product_id (integer), rating (numeric), review_text (text), verified_purchase (boolean)

Table: categories
Columns: id (integer), name (text), parent_category (text)
```

**This string — and only this string — is what gets passed to the SQL Agent.** Not your 50-table schema. Just the 3 most relevant tables.

---

## The Full Picture — What Gets Passed to the SQL Agent

```python
# Inside the orchestrator, this is what the SQL Agent receives:
schema_context = await schema_indexer.get_schema_context(question)

prompt = f"""
User question: {question}

Relevant schema:
{schema_context}

Write a PostgreSQL SELECT query to answer this question.
"""
```

The SQL Agent (Claude 3.5 Sonnet) then writes a query using **only** the tables it was given context for.

---

## Configuration

| Setting | Default | Effect |
|---|---|---|
| `USE_PGVECTOR=True` | — | Enables full RAG (vector search). Set `False` to fall back to sending the full schema as text. |
| `EMBED_MODEL` | `models/gemini-embedding-001` | Which Gemini model generates the 3072-dim vectors |
| `PGVECTOR_COLLECTION` | `data_talk_vectors` | The table name inside Supabase where vectors are stored |
| `similarity_top_k` | `3` | How many table chunks to retrieve per query (hardcoded in `get_schema_context`) |
| `embed_dim` | `3072` | Must match the output dimension of `gemini-embedding-001` |

---

## Fallback Mode (`USE_PGVECTOR=False`)

If `USE_PGVECTOR` is disabled, the system skips all of the above and just dumps the **entire raw schema** as a text string into the SQL Agent prompt. This is simpler but:
- Slower for large schemas
- More expensive (more tokens)
- Less accurate for databases with many tables

The fallback still works perfectly for small databases (< 10 tables).

---

## Key Files Summary

| File | Role |
|---|---|
| `app/core/schema_indexer.py` | Orchestrates the full RAG pipeline (fetch → hash → embed → store → retrieve) |
| `app/core/embedder.py` | Initializes the Gemini Embedding model (`gemini-embedding-001`) |
| `app/core/vector_store.py` | Connects to the permanent Supabase pgvector store (3072-dim, `data_talk_vectors` table) |
| `app/core/.schema_hash.json` | Disk-persisted MD5 hash — prevents redundant embedding API calls |
| `app/agents/orchestrator.py` | Calls `get_schema_context(question)` before invoking the SQL Agent |

---

*Related: See [02-agent-roles.md](./02-agent-roles.md) for what the SQL Agent does with this retrieved context.*
