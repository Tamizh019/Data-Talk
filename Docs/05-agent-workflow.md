# Data-Talk — Multi-Agent System Architecture

> A production-grade NL-to-SQL enterprise chatbot powered by a 10-agent pipeline with automatic failover and self-correcting SQL.

---

## How It Works

Every user message flows through this pipeline in order:

```
User Query
     │
     ▼
┌─────────────────────────────────────────┐
│  🔒 Security Gate                        │
│  Blocks SQL injection / prompt attacks   │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  💾 Cache Check (Redis)                  │
│  Returns instant result if seen before  │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  [1] Router Agent                        │
│  Classifies → "sql" / "doc_rag" / "chat" │
└─────────────────────────────────────────┘
     │
     ├──── intent: "sql" ──────────────────────────────────────────────────┐
     │                                                                      │
     ├──── intent: "doc_rag" → Doc RAG Agent → (optional) Doc Visualizer   │
     │                                                                      │
     ├──── intent: "chat" → Analyst chat_fallback() ────────────────────┐  │
     │                                                                   │  │
     ▼                                                                   │  │
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │  │
│  [2] SQL Agent   │──▶│  [3] QA Agent    │──▶│  ⚙️  SQL Executor    │  │  │
│  Writes the SQL  │   │  Reviews & fixes │   │  Runs against DB     │  │  │
│  (Gemini 3.1 Pro)│   │  (Groq 70B)      │   │  (auto-retry ×2)    │  │  │
└──────────────────┘   └──────────────────┘   └──────────────────────┘  │  │
                                                          │               │  │
                                                          ▼               │  │
                                               ┌──────────────────────┐  │  │
                                               │  [4] Python Sandbox  │  │  │
                                               │  Stats/forecasting   │  │  │
                                               │  (Groq 70B)          │  │  │
                                               └──────────────────────┘  │  │
                                                          │               │  │
                                                          ▼               │  │
                                               ┌──────────────────────┐  │  │
                                               │  [5] Visualizer      │  │  │
                                               │  Picks 3-4 best      │  │  │
                                               │  charts, writes full │  │  │
                                               │  Plotly.js JSON      │  │  │
                                               │  (Gemini 3 Flash)    │  │  │
                                               └──────────────────────┘  │  │
                                                          │               │  │
                                                          ▼               │  │
                                               ┌──────────────────────┐  │  │
                                               │  [6] Analyst Agent   │◀─┘  │
                                               │  Raw data analysis   │     │
                                               │  (Groq 70B)          │     │
                                               └──────────────────────┘     │
                                                          │                  │
                                                          ▼                  │
                                               ┌──────────────────────┐     │
                                               │  [7] Refiner Agent   │◀────┘
                                               │  Formats final answer │
                                               │  (Groq 8B)           │
                                               └──────────────────────┘
                                                          │
                                                          ▼
                                           Frontend streams all results live (SSE)
                                           Dashboard Studio renders charts + analysis
```

---

## The 10 Agents

| # | Agent | Model | File | Responsibility |
|---|---|---|---|---|
| 1 | **Router** | Groq `llama-3.1-8b-instant` | `agents/router_agent.py` | Classifies intent as `sql`, `doc_rag`, or `chat` in milliseconds |
| 2 | **SQL Developer** | Gemini `models/gemini-3.1-pro-preview` | `agents/sql_agent.py` | Generates a valid PostgreSQL `SELECT` query from natural language |
| 3 | **QA Critic** | Groq `llama-3.3-70b-versatile` | `agents/qa_agent.py` | Reviews the SQL, detects and corrects errors before execution |
| 4 | **Python Analyst** | Groq `llama-3.3-70b-versatile` | `agents/python_analyst_agent.py` | Runs Pandas/NumPy in a sandbox for advanced stats and forecasting |
| 5 | **Visualizer** | Gemini `models/gemini-3-flash-preview` | `agents/visualizer_agent.py` | Analyzes data, selects best 3–4 charts from 23+ types, returns Plotly.js JSON |
| 6 | **Analyst** | Groq `llama-3.3-70b-versatile` | `agents/analyst_agent.py` | Produces structured business findings, recommendations, and follow-ups |
| 7 | **Refiner** | Groq `llama-3.1-8b-instant` | `agents/refiner_agent.py` | Formats the final response to match the question type (ranking, aggregate, trend) |
| 8 | **Error Explainer** | Groq `llama-3.1-8b-instant` | `agents/error_explainer_agent.py` | Translates technical errors into friendly plain-English messages |
| 9 | **Suggestion Agent** | Gemini `models/gemini-3-flash-preview` | `agents/suggestion_agent.py` | Generates schema-aware starter questions on database connection |
| 10 | **Doc RAG** | Groq `llama-3.3-70b-versatile` | `agents/doc_agent.py` | Answers questions from uploaded documents via vector retrieval |

**Bonus:** `doc_visualizer_agent.py` — generates Plotly charts from unstructured document data (2-phase extraction).

### Why Each Model?

| Model | Agents | Reason |
|---|---|---|
| **Groq Llama 3.1 8B** | Router, Refiner, Error Explainer | Ultra-low latency (~200ms) — only needs to output short text |
| **Groq Llama 3.3 70B** | QA, Analyst, Python, Doc RAG | Fast + accurate for complex reasoning and data analysis |
| **Gemini 3.1 Pro** | SQL Developer | Large context window — best SQL accuracy for complex schemas |
| **Gemini 3 Flash** | Visualizer, Suggestion Agent | Creative generation — ideal for chart selection and open-ended tasks |
| **GitHub Models (Phi-4)** | Router, Refiner fallback | Automatic failover when Groq rate-limits (lightweight tasks) |
| **GitHub Models (gpt-4o-mini)** | QA, Analyst, Python fallback | Automatic failover when Groq rate-limits (complex reasoning) |

---

## Supported Chart Types (23+ Total)

Gemini automatically selects the best 3–4 from all Plotly.js chart types:

| # | Type | Best For |
|---|---|---|
| 1 | Bar (Vertical) | Comparisons, rankings |
| 2 | Bar (Horizontal) | Long labels, Top-N lists |
| 3 | Line | Trends over time |
| 4 | Area | Volume trends, cumulative data |
| 5 | Pie | Proportions, market share |
| 6 | Donut | Proportions with center metric |
| 7 | Scatter | Correlations, distributions |
| 8 | Bubble | Scatter + magnitude dimension |
| 9 | Heatmap | Matrix data, time × category intensity |
| 10 | Radar | Multi-dimensional comparison |
| 11 | Treemap | Hierarchical proportions |
| 12 | Sunburst | Nested hierarchies |
| 13 | Funnel | Conversion pipelines |
| 14 | Gauge | Single KPI values |
| 15 | KPI Scorecard | Headline numbers + trend delta |
| 16 | Box Plot | Statistical distribution |
| 17 | Violin | Distribution shape |
| 18 | Histogram | Frequency distribution |
| 19 | Waterfall | Incremental changes |
| 20 | Stacked Bar | Composition across groups |
| 21 | Sankey | Flow relationships |
| 22 | Table | Raw data with sorting |
| 23+ | Custom | User can switch type via chart card UI |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI + Python (`backend/app/`) |
| **Frontend** | Next.js 16 + React 19 + TypeScript (`frontend/src/`) |
| **Styling** | Tailwind CSS 4 |
| **Database** | Any PostgreSQL database (connected at runtime) |
| **Vector Search** | pgvector — stores schema embeddings for smart SQL context retrieval |
| **Charts** | Plotly.js via `react-plotly.js` — 23+ interactive chart types |
| **Streaming** | Server-Sent Events (SSE) — results stream live to the UI |
| **Caching** | Redis (configurable TTL for repeated queries) |
| **Auth** | Supabase Auth (Google & GitHub OAuth) |
| **Conversation Sync** | Supabase PostgreSQL (server-side persistence) |
| **Fallback** | GitHub Models (Phi-4 / gpt-4o-mini) — automatic failover |
