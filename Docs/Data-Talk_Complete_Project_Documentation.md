# Data-Talk AI — Complete Project Documentation

> **Version:** 1.0.0 | **Date:** April 2026  
> **Project Type:** Production-Grade Multi-Agent NL-to-SQL Enterprise Chatbot with RAG  
> **Stack:** FastAPI · Next.js 16 · React 19 · PostgreSQL · pgvector · Redis · Supabase · Docker  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement & Motivation](#2-problem-statement--motivation)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [The Multi-Agent System (9 Agents)](#5-the-multi-agent-system-9-agents)
6. [Detailed Agent Specifications](#6-detailed-agent-specifications)
7. [Fallback & Resilience System](#7-fallback--resilience-system)
8. [Schema RAG Pipeline](#8-schema-rag-pipeline)
9. [Visualization Pipeline](#9-visualization-pipeline)
10. [Document RAG Pipeline](#10-document-rag-pipeline)
11. [Data Flow — Request Lifecycle](#11-data-flow--request-lifecycle)
12. [Security Architecture](#12-security-architecture)
13. [Caching Strategy](#13-caching-strategy)
14. [Authentication & Conversation Sync](#14-authentication--conversation-sync)
15. [Frontend Architecture](#15-frontend-architecture)
16. [API Reference](#16-api-reference)
17. [Database Architecture](#17-database-architecture)
18. [Project File Structure](#18-project-file-structure)
19. [Deployment Architecture](#19-deployment-architecture)
20. [Key Design Decisions](#20-key-design-decisions)
21. [Future Scope](#21-future-scope)

---

## 1. Project Overview

**Data-Talk AI** is a production-grade, intelligent database assistant that converts natural language questions into SQL queries, executes them, and automatically generates interactive visualizations and business insights — all in under 2 seconds.

Instead of writing SQL, users simply type a question in plain English (e.g., "Show me the top 5 products by rating") and receive:
- The generated SQL query
- 4–7 interactive charts (bar, line, pie, scatter, treemap, gauge, KPI cards, etc.)
- A plain-English business analysis with key findings and recommendations
- Follow-up question suggestions

### What Makes Data-Talk Unique

| Feature | How It Works |
|---------|-------------|
| **Multi-Agent Architecture** | 9 specialized AI agents collaborate — each optimized for its specific task |
| **Schema RAG** | Uses vector similarity search (pgvector) to pass only relevant tables to the SQL Agent — not the entire schema |
| **Multi-Model Strategy** | Groq (speed), Gemini (creativity), GitHub Models (fallback) — each chosen for what it does best |
| **Auto-Correction Engine** | If SQL execution fails, the system automatically rewrites and retries up to 2 times |
| **Document RAG** | Upload PDFs, CSVs, or text files and ask questions about their content — with automatic chart generation |
| **Live Streaming UI** | Results stream in real-time via SSE with a Claude-style "Thinking Panel" showing each agent's progress |
| **Resilient Fallback Chain** | If Groq rate-limits, agents automatically fall back to GitHub Models (Phi-4 or gpt-4o-mini) |

---

## 2. Problem Statement & Motivation

### The Problem
Traditional database interaction requires users to know SQL. Business users, managers, and analysts often depend on data engineers to write queries — creating bottlenecks, delays, and knowledge silos.

### The Solution
Data-Talk democratizes data access by allowing anyone to ask questions in natural language. The system autonomously:
1. Understands the intent
2. Finds the relevant tables
3. Writes accurate SQL
4. Validates the query
5. Executes it safely
6. Generates visualizations
7. Produces business insights

### Key Benefits
- **Zero SQL knowledge required** — ask questions in plain English
- **Instant insights** — full pipeline completes in ~2 seconds
- **Read-only safety** — the system can never modify the database
- **Any PostgreSQL/MySQL database** — connect at runtime via URL
- **Document analysis** — upload and query unstructured documents

---

## 3. System Architecture

### High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 16 + React 19)              │
│   ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │
│   │ AuthPages│  │ ChatUI   │  │ ChartRender│  │ ConnectDB Modal  │   │
│   │ (Supabase│  │ (SSE     │  │ (Plotly.js)│  │ (Runtime DB)     │   │
│   │  Auth)   │  │  Stream) │  │            │  │                  │   │
│   └──────────┘  └──────────┘  └────────────┘  └──────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │  HTTP + SSE
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI)                             │
│                                                                        │
│   ┌─── Security Gate ──────────────────────────────────────────────┐   │
│   │  Prompt Injection Detection + SQL Keyword Blocking             │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                               │                                        │
│   ┌─── Cache Layer (Redis) ──────────────────────────────────────┐    │
│   │  Query → MD5 Hash → Redis Key → Cached Result or Miss       │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                               │                                        │
│   ┌─── Orchestrator (Master Pipeline Controller) ────────────────┐    │
│   │                                                                │    │
│   │  Agent 1: Router ──→ Intent Classification (sql/doc/chat)    │    │
│   │  Agent 2: SQL Developer ──→ Query Generation                 │    │
│   │  Agent 3: QA Critic ──→ Query Validation & Correction        │    │
│   │  [SQL Executor] ──→ Read-Only Database Execution             │    │
│   │  Agent 4: Python Sandbox ──→ Statistical Computation         │    │
│   │  Agent 5: Visualizer ──→ Chart Configuration Generation      │    │
│   │  Agent 6: Analyst ──→ Business Insight Generation            │    │
│   │  Agent 7: Refiner ──→ Final Response Formatting              │    │
│   │  Agent 8: Error Explainer ──→ Friendly Error Messages        │    │
│   │  Agent 9: Suggestion ──→ Schema-Aware Question Suggestions   │    │
│   │                                                                │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                               │                                        │
│   ┌─── Schema RAG (pgvector + LlamaIndex) ──────────────────────┐    │
│   │  Gemini Embeddings → Vector Similarity Search → Top-K Tables  │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                               │                                        │
│   ┌─── Document RAG (pgvector + LlamaIndex) ───────────────────┐    │
│   │  Upload → Parse → Embed → Store → Retrieve → Answer          │    │
│   └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  Target DB   │ │  System DB   │ │  Redis Cache │
     │  (User's     │ │  (Supabase   │ │  (Cloud      │
     │  PostgreSQL  │ │   pgvector   │ │   Redis)     │
     │  or MySQL)   │ │   + Auth)    │ │              │
     └──────────────┘ └──────────────┘ └──────────────┘
```

### Three-Database Architecture

| Database | Purpose | Technology |
|----------|---------|-----------|
| **Target DB** | The user's actual data — connected at runtime via URL | Any PostgreSQL or MySQL |
| **System DB** | pgvector embeddings for Schema RAG + Document RAG + Auth data + Conversation history | Supabase (PostgreSQL + pgvector) |
| **Cache DB** | Redis TTL cache for query results — enables instant repeat answers | Redis Cloud |

---

## 4. Technology Stack

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| Python | 3.11+ | Core language |
| FastAPI | 0.115.6 | Async API framework |
| Uvicorn | 0.34.0 | ASGI server |
| SQLAlchemy (async) | 2.0.38 | Database ORM + async queries |
| asyncpg | 0.30.0 | PostgreSQL async driver |
| aiomysql | Latest | MySQL async driver |
| Pydantic | 2.10.6 | Data validation and settings |
| LlamaIndex | 0.12.14 | RAG pipeline for schema/doc indexing |
| pgvector | 0.3.6 | Vector similarity search |
| Redis | 5.2.1 | Async caching layer |
| Pandas / NumPy | Latest | Python Sandbox Agent computation |
| pypdf | Latest | PDF parsing for document uploads |

### AI Models & Providers

| Provider | Model | Agent(s) | Purpose |
|----------|-------|----------|---------|
| **Groq** | `llama-3.1-8b-instant` | Router, Refiner, Error Explainer | Ultra-fast classification & formatting (~200ms) |
| **Groq** | `llama-3.3-70b-versatile` | Analyst, QA Critic, Python Agent | Complex reasoning, SQL review, analysis |
| **Google Gemini** | `gemini-3-flash-preview` | Visualizer, Suggestion, Doc agents | Chart generation, document analysis |
| **Google Gemini** | `gemini-3.1-pro-preview` | SQL Developer | Precise SQL generation |
| **Google Gemini** | `gemini-embedding-001` | Schema RAG, Document RAG | 3072-dim vector embeddings |
| **GitHub Models** (Fallback) | `microsoft/Phi-4` | Router, Refiner (fallback) | Lightweight fallback when Groq is unavailable |
| **GitHub Models** (Fallback) | `openai/gpt-4o-mini` | Analyst, QA, Python (fallback) | Heavy reasoning fallback |

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 16.1.6 | React framework (App Router) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Plotly.js | 3.5.0 | Interactive chart rendering |
| react-plotly.js | 2.6.0 | React wrapper for Plotly |
| Supabase JS | 2.99.1 | Authentication client |
| Lucide React | 0.577.0 | Icon set |
| react-markdown | 10.1.0 | Markdown rendering |
| react-syntax-highlighter | 16.1.1 | SQL syntax highlighting |
| shadcn/ui | 4.0.2 | Component library |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerized deployment |
| Supabase | Auth + System PostgreSQL + pgvector |
| Redis Cloud | Managed Redis cache |
| Netlify | Frontend deployment |

---

## 5. The Multi-Agent System (9 Agents)

Data-Talk uses a **9-agent architecture** where each agent is specialized for a single task. This is superior to using a single monolithic LLM because:

1. **Speed** — Fast models (Groq) handle routing in ~200ms; only complex tasks use slower models
2. **Accuracy** — Each model is chosen for what it does best (SQL generation ≠ chart creation)
3. **Cost** — Lightweight tasks use cheap models; expensive models are reserved for precision
4. **Resilience** — If one agent fails, the pipeline degrades gracefully

### Agent Overview Table

| # | Agent | File | AI Model | Primary Role | Fallback |
|---|-------|------|----------|-------------|---------|
| 1 | **Router** | `router_agent.py` | Groq Llama 3.1 8B | Intent classification (sql/doc/chat) | Phi-4 (GitHub) |
| 2 | **SQL Developer** | `sql_agent.py` | Gemini 3.1 Pro | PostgreSQL query generation | None (Gemini is reliable) |
| 3 | **QA Critic** | `qa_agent.py` | Groq Llama 3.3 70B | SQL review, validation, correction | gpt-4o-mini (GitHub) |
| 4 | **Python Sandbox** | `python_analyst_agent.py` | Groq Llama 3.3 70B | Statistical computation (Pandas/NumPy) | gpt-4o-mini (GitHub) |
| 5 | **Visualizer** | `visualizer_agent.py` | Gemini 3 Flash | Chart type selection + Plotly JSON generation | None |
| 6 | **Analyst** | `analyst_agent.py` | Groq Llama 3.3 70B | Business insights & plain-English analysis | gpt-4o-mini (GitHub) |
| 7 | **Refiner** | `refiner_agent.py` | Groq Llama 3.1 8B | Final response formatting & question-type matching | Phi-4 (GitHub) |
| 8 | **Error Explainer** | `error_explainer_agent.py` | Groq Llama 3.1 8B | Friendly error message generation | None (static fallback) |
| 9 | **Suggestion** | `suggestion_agent.py` | Gemini 3 Flash | Schema-aware starter question suggestions | None |

### Supporting Agents (Document Path)

| Agent | File | AI Model | Role |
|-------|------|----------|------|
| **Doc RAG** | `doc_agent.py` | Gemini (via LlamaIndex) | Answers questions based on uploaded documents |
| **Doc Visualizer** | `doc_visualizer_agent.py` | Gemini 3 Flash | 2-phase document visualization (extract → chart) |

---

## 6. Detailed Agent Specifications

### Agent 1: Router Agent

**Purpose:** Instantly classify user intent to avoid wasting API calls on wrong pipelines.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/router_agent.py` |
| **Model** | Groq `llama-3.1-8b-instant` (Fallback: GitHub `Phi-4`) |
| **Latency** | ~200ms |
| **Output** | Single word: `sql`, `doc_rag`, or `chat` |
| **Token Limit** | max_tokens=10 |

**Classification Rules:**
- `sql` — Any question involving data, metrics, counts, rankings, filters, analytics
- `doc_rag` — Questions about uploaded documents, PDFs, text files
- `chat` — Greetings, system capability questions, thank-you messages

**Design Decision:** When in doubt between SQL and Chat, the router **defaults to SQL** — it's safer to attempt a query than to miss a data request.

---

### Agent 2: SQL Developer Agent

**Purpose:** Generate precise, read-only PostgreSQL SELECT statements from natural language.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/sql_agent.py` |
| **Model** | Gemini `gemini-3.1-pro-preview` |
| **Input** | User question + relevant schema (from RAG) + conversation history |
| **Output** | Raw SQL query string |

**Key Rules Enforced:**
1. Only `SELECT` or `WITH` statements allowed
2. Must use exact table/column names from the schema (no guessing)
3. No JSON aggregation functions (`json_agg`, `row_to_json`)
4. Must return flat relational data (rows + columns)
5. Auto-adds `LIMIT 500` for unbounded queries
6. Casts dates to ISO-8601 format

**Auto-Correction:** If the SQL fails on execution, the error message is fed back to this agent with instructions to fix the query. Up to 2 retries are allowed.

---

### Agent 3: QA Critic Agent

**Purpose:** Acts as a senior database administrator reviewing the SQL before execution.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/qa_agent.py` |
| **Model** | Groq `llama-3.3-70b-versatile` (Fallback: GitHub `gpt-4o-mini`) |
| **Output** | JSON: `{ "is_valid": bool, "reason": str, "fixed_sql": str|null }` |

**Review Criteria:**
1. PostgreSQL syntax validity
2. Schema validation (all tables/columns exist)
3. Security (no mutations: DROP, DELETE, UPDATE, INSERT)
4. Logic errors (missing GROUP BY, wrong JOINs)

---

### Agent 4: Python Sandbox Agent

**Purpose:** Handles advanced statistical computation that SQL alone can't express.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/python_analyst_agent.py` |
| **Model** | Groq `llama-3.3-70b-versatile` (Fallback: GitHub `gpt-4o-mini`) |
| **Trigger** | Keyword detection: "predict", "forecast", "regression", "correlation", "percentile", etc. |
| **Sandbox** | Restricted `exec()` with only `pandas`, `numpy`, and safe builtins |

**Security:** The sandbox blocks `os`, `sys`, `subprocess`, `open`, `import`, and all dangerous builtins. Only `pd`, `np`, `sum`, `len`, `round`, `abs`, `min`, `max` are available.

---

### Agent 5: Visualizer Agent

**Purpose:** Analyze query results and generate 4-7 interactive Plotly.js chart configurations.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/visualizer_agent.py` |
| **Model** | Gemini `gemini-3-flash-preview` |
| **Output** | JSON array of typed visualization blocks |

**Two-Phase Approach:**
1. **Phase 1 (No LLM):** Programmatic data pattern detection — analyzes column types (numeric vs. categorical), detects time series, correlations, distributions, rankings
2. **Phase 2 (Gemini):** Uses detected patterns to guide chart selection, generates complete Plotly.js configs

**20+ Supported Chart Types:**

| Category | Types |
|---------|-------|
| **Basic** | Bar, Horizontal Bar, Grouped Bar, Stacked Bar, Line, Area |
| **Proportional** | Pie, Donut, Sunburst, Treemap |
| **Statistical** | Histogram, Box Plot, Violin |
| **Correlation** | Scatter, Bubble, Heatmap |
| **Flow/Specialized** | Funnel, Waterfall, Sankey, Radar, Gauge |
| **Scorecard** | KPI Cards (large number + trend delta) |

**Output Format:**
```json
[
  { "library": "kpi", "title": "Total Revenue", "config": { "value": 125430, "formatted_value": "1,25,430", "trend": "+8.2%", "trend_direction": "up" } },
  { "library": "plotly", "chart_type": "donut", "title": "Sales by Category", "meta": {...}, "config": { "data": [...], "layout": {...} } },
  { "library": "table", "title": "Raw Data", "config": { "columns": [...], "data": [...] } }
]
```

---

### Agent 6: Analyst Agent

**Purpose:** Produces structured business insights from SQL results. Handles both data analysis and general chat.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/analyst_agent.py` |
| **Model** | Groq `llama-3.3-70b-versatile` (Fallback: GitHub `gpt-4o-mini`) |
| **Functions** | `explain_results()` — data analysis; `chat_fallback()` — general conversation |

**Output Structure:**
```
[FINDINGS]
• Finding 1 with specific numbers
• Finding 2 with specific numbers

[RECOMMENDATION]
One clear, actionable recommendation.

[FOLLOWUPS]
• Follow-up question 1
• Follow-up question 2
• Follow-up question 3
```

---

### Agent 7: Refiner Agent (Response Formatter)

**Purpose:** Final intelligence layer — takes the analyst's raw output and formats it to match the user's question type.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/refiner_agent.py` |
| **Model** | Groq `llama-3.1-8b-instant` (Fallback: GitHub `Phi-4`) |

**Format Matching:**
- Ranking/Top-N → numbered list
- Single aggregate → bold number + explanation  
- Comparison → side-by-side bullets or table
- Trend → direction + magnitude
- Yes/No → direct answer first

---

### Agent 8: Error Explainer Agent

**Purpose:** Converts raw technical errors into friendly, actionable messages.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/error_explainer_agent.py` |
| **Model** | Groq `llama-3.1-8b-instant` |

**Example:**
- Raw: `relation "students" does not exist`
- User sees: `❌ What happened: I couldn't find a table called "students" in your database. 💡 Try this: Check the exact table name — it might be called something like "student_data" instead.`

---

### Agent 9: Suggestion Agent

**Purpose:** On database connection, automatically generates 6 schema-aware starter questions.

| Property | Value |
|----------|-------|
| **File** | `backend/app/agents/suggestion_agent.py` |
| **Model** | Gemini `gemini-3-flash-preview` |
| **Trigger** | Runs once after successful `POST /api/connect` |
| **Cache** | Suggestions cached for 7 days per schema hash |

**Output Categories:**
1. Quick Overview (2 questions)
2. Trends & Rankings (2 questions)
3. Deep Insights (2 questions)

---

## 7. Fallback & Resilience System

Data-Talk uses a **two-tier fallback architecture** powered by GitHub Models (Azure AI Inference).

### How It Works

```
User Query → Agent tries Groq (Primary, Fast)
                │
                ├── ✅ Success → Continue pipeline
                │
                └── ❌ Fail (Rate limit / Network / Error)
                        │
                        ▼
                    Agent retries with GitHub Models (Fallback)
                        │
                        ├── ✅ Success → Continue pipeline (transparent to user)
                        │
                        └── ❌ Fail → Graceful degradation (safe default)
```

### Fallback Model Assignment

| Agent Tier | Primary (Groq) | Fallback (GitHub Models) | Rationale |
|-----------|----------------|-------------------------|-----------|
| **Light** (Router, Refiner) | Llama 3.1 8B | **Phi-4** (14B, Microsoft) | Fast, efficient for simple tasks |
| **Heavy** (Analyst, QA, Python) | Llama 3.3 70B | **gpt-4o-mini** (OpenAI) | Strong reasoning for complex analysis |
| **Gemini** (SQL, Visualizer) | Gemini Pro | — (no fallback needed) | Already reliable, different provider |

### Implementation

**Shared Client:** `backend/app/core/fallback_client.py`
- Lazily initialized `AsyncOpenAI` client
- Points at `https://models.inference.ai.azure.com`
- Uses `GITHUB_TOKEN` (GitHub PAT) as API key
- Single function: `github_chat_completion(tier, messages, ...)`

**Rate Limits:** GitHub Models Free Tier provides ~150 requests/day per model — sufficient for development and burst protection.

---

## 8. Schema RAG Pipeline

### Why RAG for Schema?

If a database has 50+ tables, sending the entire schema to an LLM on every query is:
- **Slow** — large prompts increase latency
- **Expensive** — more tokens = more cost
- **Inaccurate** — LLMs get confused with too much irrelevant context

**Solution:** Schema RAG retrieves only the 2-3 most relevant table definitions per query.

### Phase 1: Indexing (runs once at database connect time)

```
1. FETCH schema from PostgreSQL information_schema
2. COMPUTE MD5 hash of entire schema
3. CHECK .schema_hash.json on disk
   ├── Hash matches → SKIP (no API cost)
   └── Hash differs → Schema changed, proceed to embed
4. CREATE LlamaIndex Document objects per table
5. EMBED via Gemini (models/gemini-embedding-001) → 3072-dim vectors
6. STORE in pgvector (Supabase SYSTEM_DB, table: data_talk_vectors)
```

### Phase 2: Retrieval (runs on every user question)

```
1. EMBED user question via Gemini → 3072-dim vector
2. SEARCH pgvector with cosine similarity (top_k=3)
3. RETURN matching table definitions as context string
4. PASS only these tables to the SQL Agent
```

### Key Design Decisions

- **Disk-persisted hash** — Prevents re-embedding on server restart
- **Lazy index loading** — `from_vector_store()` reconnects to existing vectors without re-embedding
- **Fallback mode** — If `USE_PGVECTOR=False`, the full schema is passed as raw text (works for small DBs)

### Files Involved

| File | Role |
|------|------|
| `core/schema_indexer.py` | Full RAG pipeline: fetch → hash → embed → store → retrieve |
| `core/embedder.py` | Gemini Embedding model initialization |
| `core/vector_store.py` | pgvector store connection (3072-dim, `data_talk_vectors` table) |
| `core/.schema_hash.json` | Disk-persisted MD5 hash |

---

## 9. Visualization Pipeline

### Two Paths

| Path | Trigger | Agent |
|------|---------|-------|
| **SQL Visualization** | Database query results | `visualizer_agent.py` |
| **Document Visualization** | Uploaded file content | `doc_visualizer_agent.py` |

### SQL Visualization Pipeline

```
Step 1: SQL query returns raw rows
Step 2: Column statistics computed programmatically (no LLM)
        - Numeric: min, max, avg, distinct count
        - Categorical: distinct count, sample values
Step 3: Data patterns detected programmatically
        - Time series, correlation, distribution, ranking, proportion, hierarchy
Step 4: Gemini receives: question + column stats + patterns + sample data
Step 5: Gemini selects 4-7 diverse chart types and generates Plotly.js JSON
Step 6: Frontend renders via Dynamic Dispatcher:
        - { library: "kpi" }    → <KpiCard />
        - { library: "plotly" } → <Plot /> (react-plotly.js)
        - { library: "table" } → <DataTable />
```

### Document Visualization Pipeline (2-Phase)

```
Phase 1 (Extract): Raw document text → Gemini → Structured JSON
   e.g., Resume → { skills_by_category: {...}, projects: [...], education: [...] }

Phase 2 (Visualize): Structured JSON → Gemini → 3-5 Plotly chart configs
   e.g., Radar chart of skills, Bar chart of projects by year, KPI of total experience
```

### Chart Diversity Rules
- **Never repeat** the same chart type
- **Always include** KPI cards for key metrics
- **Data limits enforced:** Bar max 20 items, Pie max 8 slices, Scatter max 100 points
- **Brand palette:** `#7C6FFF, #00C9B1, #FF6B6B, #FFB347, #4ECDC4, #45B7D1`

---

## 10. Document RAG Pipeline

### Upload Flow

```
User uploads file (PDF/CSV/TXT/MD/JSON)
    │
    ▼
POST /api/upload
    │
    ├── Save to disk temporarily
    ├── SimpleDirectoryReader parses file
    ├── Split into chunks as LlamaIndex Documents
    ├── TAG with metadata: { type: "document_chunk", file_name: "..." }
    ├── EMBED via Gemini → 3072-dim vectors
    ├── STORE in pgvector table: data_talk_doc_vectors
    └── DELETE temporary file
```

### Query Flow

```
User asks about document content
    │
    ├── Router classifies as "doc_rag"
    ├── VectorStoreIndex.from_vector_store() → reconnect to doc vectors
    ├── Retrieve top-5 most similar chunks
    ├── Gemini synthesizes answer from retrieved context
    │
    ├── If user also wants visualization:
    │   ├── Phase 1: Extract structured data from answer text
    │   └── Phase 2: Generate Plotly chart configs
    │
    └── Return answer + optional charts
```

---

## 11. Data Flow — Request Lifecycle

### Complete Timeline (Example: "Show me top 5 products by rating")

| Time | Step | Agent/System | What Happens |
|------|------|-------------|-------------|
| T+0ms | User sends message | Frontend | `POST /api/chat` with query + history |
| T+50ms | Security Gate | `security.py` | Prompt injection check |
| T+100ms | Cache Check | Redis | MD5 hash lookup → hit or miss |
| T+200ms | Intent Classification | Router Agent (Groq) | Returns `"sql"` |
| T+400ms | Schema Retrieval | pgvector | Top-3 relevant table definitions |
| T+800ms | SQL Generation | SQL Agent (Gemini Pro) | Generates `SELECT ... LIMIT 5` |
| T+1100ms | SQL Review | QA Agent (Groq) | Approves or fixes the SQL |
| T+1300ms | Execution | PostgreSQL | Returns 5 rows, 2 columns |
| T+1350ms | Python Sandbox | Python Agent | Checks if statistical computation needed |
| T+1500ms | Visualization | Visualizer (Gemini) | Generates 4-7 Plotly chart configs |
| T+1800ms | Analysis | Analyst Agent (Groq) | Writes business insights |
| T+1900ms | Formatting | Refiner Agent (Groq) | Formats response to match question type |
| T+1950ms | Cache Store | Redis | Saves full result with TTL |
| T+2000ms | **Done** | Frontend | Renders SQL + charts + analysis |

### Error Recovery Flow

| Error Type | Recovery |
|-----------|---------|
| SQL syntax error | QA Agent auto-fixes before execution |
| DB execution failure | SQL Agent rewrites (up to 2 retries) |
| Groq rate limit | Automatic fallback to GitHub Models |
| No data returned | Visualizer skipped, Analyst reports "no data" |
| Prompt injection | Blocked at security gate with witty message |

---

## 12. Security Architecture

### Layer 1: Prompt Injection Guard

**File:** `backend/app/core/security.py`

Detects jailbreak attempts using phrase matching against known patterns:
- "ignore previous instructions"
- "forget your system prompt"
- "you are now" / "act as" / "pretend you are"
- "jailbreak" / "do anything now"

**Response:** Raises `ValueError` with a randomly selected witty rejection message (10 messages in rotation).

### Layer 2: SQL Guard

Ensures only read-only operations execute:
- **Allowed prefixes:** `SELECT`, `WITH`
- **Blocked keywords:** `DROP`, `DELETE`, `TRUNCATE`, `UPDATE`, `INSERT`, `ALTER`, `CREATE`, `GRANT`, `REVOKE`, `EXEC`, `COPY`, `pg_sleep`, `pg_read_file`
- **Comment bypass detection:** Blocks `--`, `#`, `/*`, `*/`

### Layer 3: Database Execution Safety

- All queries run through SQLAlchemy with `postgresql_readonly=True`
- Command timeout: 10 seconds
- Auto-injected `LIMIT 1000` on unbounded queries
- Connection pooling: 5 base + 10 overflow

---

## 13. Caching Strategy

**Technology:** Redis (async, cloud-hosted)

### How It Works

```python
key = "datatalk:query:" + MD5(normalized_question)
TTL = 3600 seconds (1 hour, configurable)
```

1. Before any agent runs, the system checks Redis for an exact match
2. If found → return instantly (zero AI calls, zero DB queries)
3. If not found → run full pipeline, then cache the result

### What Gets Cached
- Generated SQL
- Query results (rows + columns)
- Chart configurations
- Formatted analysis text
- Suggestion results (7-day TTL)

### Resilience
- Redis errors are caught silently — if Redis is down, the system still works (just without caching)
- Socket timeout: 1 second (prevents blocking)

---

## 14. Authentication & Conversation Sync

### Authentication (Supabase Auth)

- **Frontend:** `@supabase/supabase-js` client for login/signup/session management
- **Backend:** JWT validation via Supabase REST API
- **Pages:** `/login`, `/signup` — modern split-panel UI design

### Conversation History

**Problem:** Browser localStorage is device-specific — conversations don't follow the user.

**Solution:** Server-side sync to Supabase via REST API.

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/api/conversations` | GET | Load all conversations for the user |
| `/api/conversations/sync` | POST | Batch-upsert conversations |
| `/api/conversations/{id}` | DELETE | Delete a specific conversation |

**Schema:** `chat_conversations` table in Supabase:
```sql
CREATE TABLE chat_conversations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT,
    messages JSONB,
    updated_at BIGINT  -- epoch milliseconds
);
```

---

## 15. Frontend Architecture

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Redirect | Redirects to `/login` or `/chat` |
| `/login` | Auth page | Professional split-panel login UI |
| `/signup` | Auth page | Registration page |
| `/chat` | Main app | Chat interface + sidebar + visualizations |
| `/analytics` | Dashboard | Auto-generated database analytics |
| `/profile` | Settings | User profile editing |

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `ChatWindow.tsx` | 55KB | Main chat interface with SSE streaming, message bubbles, thinking panel |
| `ConnectDbModal.tsx` | 37KB | Database connection dialog, URL input, connection testing |
| `Sidebar.tsx` | 19KB | Conversation list, search, new chat, DB connect button |
| `ChartRenderer.tsx` | 18KB | Dynamic dispatcher for KPI/Plotly/Table rendering |
| `DataTable.tsx` | 13KB | Sortable, paginated data table with export functionality |
| `MarkdownRenderer.tsx` | 10KB | Rich markdown rendering with code highlighting |
| `ThinkingSteps.tsx` | 10KB | Claude-style collapsible thinking panel with step animations |
| `SQLDisplay.tsx` | 8KB | SQL syntax-highlighted display with copy button |
| `RightSidebar.tsx` | 6KB | Schema viewer and table browser |
| `KpiCard.tsx` | 4KB | Large metric card with trend indicator |
| `DashboardPanel.tsx` | 3KB | Analytics dashboard layout |

### Streaming Architecture (SSE)

The frontend receives real-time updates via Server-Sent Events:
```
data: {"event": "thinking_step", "id": "router", "status": "running", ...}
data: {"event": "intent", "intent": "sql"}
data: {"event": "thinking_step", "id": "router", "status": "done", "duration_ms": 180}
data: {"event": "sql_generated", "sql": "SELECT ..."}
data: {"event": "query_result", "rows": [...], "columns": [...]}
data: {"event": "visualization", "charts": [...]}
data: {"event": "explanation", "text": "## Revenue Grew 23%..."}
data: {"event": "done"}
```

### Design System
- **Typography:** Inter (Google Fonts)
- **Theme:** Light/Dark mode via `next-themes`
- **Brand Color:** `#7C6FFF` (Purple)
- **Component Library:** shadcn/ui with customizations

---

## 16. API Reference

### Core Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|---------|---------|--------------|
| `POST` | `/api/chat` | Main SSE streaming endpoint | No |
| `POST` | `/api/connect` | Connect to a database at runtime | No |
| `POST` | `/api/upload` | Upload documents for RAG | No |
| `GET` | `/api/schema` | Get current database schema | No |
| `GET` | `/api/schema/reindex` | Trigger schema re-indexing | No |
| `GET` | `/api/db-status` | Check database connection status | No |
| `GET` | `/api/analytics` | Auto-generated analytics dashboard | No |
| `GET` | `/api/conversations` | List user conversations | Yes (JWT) |
| `POST` | `/api/conversations/sync` | Batch-upsert conversations | Yes (JWT) |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation | Yes (JWT) |
| `GET` | `/health` | Health check | No |

### Chat Request Format
```json
{
  "session_id": "uuid-string",
  "message": "Show me the top 5 products by rating",
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

### SSE Event Types

| Event | Data Fields | Description |
|-------|------------|-------------|
| `thinking_step` | `id, type, label, detail, status, duration_ms` | Agent progress tracking |
| `intent` | `intent` | Router classification result |
| `sql_generated` | `sql` | Generated SQL query |
| `query_result` | `rows, columns, sql_used, attempts, row_count` | Execution results |
| `visualization` | `charts` | Array of Plotly/KPI/Table configs |
| `explanation` | `text` | Formatted analysis text |
| `cached_result` | `sql, rows, columns, charts, explanation` | Complete cached response |
| `error` | `message` | Friendly error message |
| `done` | — | Stream complete signal |

---

## 17. Database Architecture

### Target Database (User's Database)

- Connected at runtime via `POST /api/connect`
- Supports **PostgreSQL** and **MySQL**
- Read-only access enforced at driver level
- Schema introspection via `information_schema`
- Custom schema support (e.g., `options=-csearch_path=myschema`)

### System Database (Supabase)

| Table | Purpose | Engine |
|-------|---------|--------|
| `data_talk_vectors` | Schema RAG embeddings (3072-dim) | pgvector |
| `data_talk_doc_vectors` | Document RAG embeddings (3072-dim) | pgvector |
| `chat_conversations` | User conversation history | Regular PostgreSQL |
| `auth.users` | Supabase Auth user accounts | Supabase Auth |

---

## 18. Project File Structure

```
RAG/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                    # Pydantic settings (all env vars)
│   │   ├── main.py                      # FastAPI entry point, routes, lifespan
│   │   │
│   │   ├── agents/                      # The 9-agent AI system
│   │   │   ├── orchestrator.py          # Master pipeline controller (SSE events)
│   │   │   ├── router_agent.py          # Intent classifier (Groq → Phi-4 fallback)
│   │   │   ├── sql_agent.py             # SQL generator (Gemini Pro)
│   │   │   ├── qa_agent.py              # SQL reviewer (Groq → gpt-4o-mini fallback)
│   │   │   ├── analyst_agent.py         # Business insights (Groq → gpt-4o-mini fallback)
│   │   │   ├── refiner_agent.py         # Response formatter (Groq → Phi-4 fallback)
│   │   │   ├── visualizer_agent.py      # Plotly chart generator (Gemini Flash)
│   │   │   ├── python_analyst_agent.py  # Pandas/NumPy sandbox (Groq → gpt-4o-mini fallback)
│   │   │   ├── error_explainer_agent.py # Friendly error messages (Groq)
│   │   │   ├── suggestion_agent.py      # Schema-aware suggestions (Gemini Flash)
│   │   │   ├── doc_agent.py             # Document Q&A (LlamaIndex + Gemini)
│   │   │   └── doc_visualizer_agent.py  # Document chart generator (Gemini Flash)
│   │   │
│   │   ├── core/                        # Infrastructure & utilities
│   │   │   ├── schema_indexer.py        # Full Schema RAG pipeline
│   │   │   ├── document_indexer.py      # Document upload → pgvector indexing
│   │   │   ├── vector_store.py          # pgvector connection (3072-dim)
│   │   │   ├── embedder.py              # Gemini Embedding model init
│   │   │   ├── sql_executor.py          # Safe read-only SQL execution
│   │   │   ├── security.py              # Prompt injection + SQL guards
│   │   │   ├── cache.py                 # Redis async cache (get/set/invalidate)
│   │   │   ├── fallback_client.py       # GitHub Models fallback client
│   │   │   └── .schema_hash.json        # Persistent schema MD5 hash
│   │   │
│   │   └── routes/                      # API endpoints
│   │       ├── chat.py                  # POST /api/chat (SSE stream)
│   │       ├── upload.py                # POST /api/upload (file upload)
│   │       └── conversations.py         # CRUD conversation history
│   │
│   ├── .env                             # Environment variables (secrets)
│   ├── .env.example                     # Template for .env
│   ├── requirements.txt                 # Python dependencies
│   ├── Dockerfile                       # Backend container
│   └── uploads/                         # Temporary file upload directory
│
├── frontend/
│   ├── src/
│   │   ├── app/                         # Next.js App Router pages
│   │   │   ├── layout.tsx               # Root layout (Auth, Theme, Studio providers)
│   │   │   ├── page.tsx                 # Root redirect
│   │   │   ├── globals.css              # Global styles (11KB)
│   │   │   ├── login/                   # Login page
│   │   │   ├── signup/                  # Signup page
│   │   │   ├── chat/                    # Main chat interface
│   │   │   ├── analytics/              # Auto-generated analytics dashboard
│   │   │   ├── profile/                # User profile page
│   │   │   └── reports/                # Reports page
│   │   │
│   │   ├── components/                  # Reusable UI components
│   │   │   ├── ChatWindow.tsx           # Core chat UI (55KB)
│   │   │   ├── ConnectDbModal.tsx       # DB connection dialog (37KB)
│   │   │   ├── Sidebar.tsx              # Navigation sidebar (19KB)
│   │   │   ├── ChartRenderer.tsx        # Plotly/KPI/Table renderer (18KB)
│   │   │   ├── DataTable.tsx            # Interactive data table (13KB)
│   │   │   ├── MarkdownRenderer.tsx     # Markdown + code highlighting (10KB)
│   │   │   ├── ThinkingSteps.tsx        # Claude-style thinking panel (10KB)
│   │   │   ├── SQLDisplay.tsx           # SQL display + copy (8KB)
│   │   │   ├── RightSidebar.tsx         # Schema browser (6KB)
│   │   │   ├── KpiCard.tsx              # KPI scorecard component (4KB)
│   │   │   ├── DashboardPanel.tsx       # Analytics layout (3KB)
│   │   │   └── ThemeProvider.tsx         # Theme context
│   │   │
│   │   ├── lib/                         # Utilities, contexts, Supabase
│   │   ├── types/                       # TypeScript type definitions
│   │   └── middleware.ts                # Auth middleware (route protection)
│   │
│   ├── .env.local                       # Frontend env vars
│   ├── package.json                     # Node dependencies
│   ├── next.config.ts                   # Next.js configuration
│   ├── netlify.toml                     # Netlify deployment config
│   └── Dockerfile                       # Frontend container
│
├── Docs/                                # System documentation
│   ├── 01-system-overview.md
│   ├── 02-agent-roles.md
│   ├── 03-visualization-pipeline.md
│   ├── 04-data-flow.md
│   ├── 05-agent-workflow.md
│   ├── 06-schema-rag.md
│   └── prototype.html                   # UI prototype
│
├── docker-compose.yml                   # Multi-container orchestration
├── run_all.bat                          # Windows launcher script
├── README.md                            # Project README
└── .gitignore
```

---

## 19. Deployment Architecture

### Docker Compose (Development)

```yaml
services:
  backend:   # FastAPI on port 8000
  frontend:  # Next.js on port 3000
```

### Production Deployment

| Component | Platform |
|-----------|---------|
| **Frontend** | Netlify (auto-builds from Git) |
| **Backend** | Docker / any cloud (Render, Railway, etc.) |
| **Target DB** | User's own PostgreSQL/MySQL |
| **System DB** | Supabase (managed PostgreSQL + pgvector) |
| **Cache** | Redis Cloud (managed Redis) |

### Environment Variables

**Backend (.env):**

| Variable | Purpose |
|---------|---------|
| `GEMINI_API_KEY` | Google AI API key (SQL Agent, Visualizer, Embeddings) |
| `GROQ_API_KEY` | Groq API key (Router, Analyst, QA, Refiner, Python) |
| `GITHUB_TOKEN` | GitHub PAT (fallback models via GitHub Models) |
| `HF_TOKEN` | HuggingFace token (reserved for future use) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) |
| `TARGET_DB_URL` | Default PostgreSQL connection string |
| `SYSTEM_DB_URL` | Supabase PostgreSQL for pgvector |
| `REDIS_URL` | Redis Cloud connection string |
| `EMBED_MODEL` | Embedding model name |
| `USE_PGVECTOR` | Enable/disable Schema RAG |

**Frontend (.env.local):**

| Variable | Purpose |
|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key |

---

## 20. Key Design Decisions

### Why Multi-Agent Instead of Single LLM?

| Approach | Problem |
|---------|---------|
| Single LLM | Slower, less accurate, single point of failure, expensive for all tasks |
| Multi-Agent | Each model optimized for its task; fast + accurate + resilient + cost-effective |

### Why Groq for Routing?

Groq uses custom LPU (Language Processing Unit) hardware that achieves ~200ms latency for inference. Since the router fires on **every query**, speed is critical.

### Why Gemini for SQL & Visualization?

Gemini Pro's large context window (1M+ tokens) and structured output capabilities make it ideal for schema comprehension and JSON generation.

### Why pgvector Instead of Pinecone/Weaviate?

- **Zero extra infrastructure** — pgvector runs inside the existing Supabase PostgreSQL
- **No vendor lock-in** — standard PostgreSQL extension
- **Cost** — Free tier of Supabase includes pgvector

### Why SSE Instead of WebSocket?

- **Simpler** — no bidirectional protocol needed (we only stream server→client)
- **HTTP/2 compatible** — works with CDNs, proxies, and load balancers
- **Automatic reconnection** — built into the SSE spec

### Why Plotly.js Instead of ECharts?

The project migrated from ECharts to Plotly.js for:
- **Richer chart types** — 40+ types including statistical (violin, box), flow (sankey), 3D
- **Better interactivity** — built-in zoom, pan, hover tooltips, cross-filtering
- **Export capabilities** — native PNG/SVG/HTML export
- **Responsive design** — handles window resizing automatically

---

## 21. Future Scope

| Feature | Description |
|---------|-------------|
| **HuggingFace Embeddings** | Replace Gemini embeddings with free BAAI/bge-m3 model to reduce API costs |
| **Multi-Database Support** | Simultaneous connections to multiple databases with cross-database queries |
| **Scheduled Reports** | Automated email reports with chart snapshots on a configurable schedule |
| **Collaborative Workspaces** | Team-based conversations and shared dashboards |
| **Natural Language to Charts** | "Make a bar chart of X" → direct chart generation without SQL |
| **Query Templates** | Save and reuse common query patterns |
| **Audit Logs** | Track all queries, users, and API usage for compliance |
| **GPU Acceleration** | Deploy torch-based local embedding models with GPU support |

---

> **This document was generated from a complete source code analysis of the Data-Talk AI project as of April 2026.**  
> **Total Backend Source Files:** 20+ Python files across agents, core, and routes  
> **Total Frontend Components:** 12+ React/TypeScript components  
> **Total AI Agents:** 9 primary + 2 document agents  
> **Total AI Models Used:** 7 (across 3 providers + 1 fallback provider)
