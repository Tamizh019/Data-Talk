# Data-Talk — Multi-Agent System Architecture

> A production-grade NL-to-SQL enterprise chatbot powered by a 5-agent pipeline.

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
│  Classifies intent → "sql" or "chat"    │
└─────────────────────────────────────────┘
     │
     ├──── intent: "sql" ──────────────────────────────────────────────────┐
     │                                                                      │
     ▼                                                                      │
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐    │
│  [2] SQL Agent   │──▶│  [3] QA Agent    │──▶│  ⚙️  SQL Executor    │    │
│  Writes the SQL  │   │  Reviews & fixes │   │  Runs against DB     │    │
└──────────────────┘   └──────────────────┘   └──────────────────────┘    │
                                                          │                 │
                                                          ▼                 │
                                               ┌──────────────────────┐    │
                                               │  [4] Visualizer      │    │
                                               │  Agent               │    │
                                               │  Picks 3-4 best      │    │
                                               │  charts, writes full │    │
                                               │  ECharts JSON        │    │
                                               └──────────────────────┘    │
                                                          │                 │
                                                          ▼                 │
                                               ┌──────────────────────┐    │
                                               │  [5] Analyst Agent   │◀───┘
                                               │  Explains the data   │  (also handles
                                               │  in plain English    │   chat path)
                                               └──────────────────────┘
                                                          │
                                                          ▼
                                          Frontend streams all results live (SSE)
```

---

## The 5 Agents

| # | Agent | Model | File | Responsibility |
|---|---|---|---|---|
| 1 | **Router** | Groq `llama-3.1-8b-instant` | `agents/router_agent.py` | Classifies intent as `sql` or `chat` in milliseconds |
| 2 | **SQL Developer** | Gemini Pro | `agents/sql_agent.py` | Generates a valid PostgreSQL `SELECT` query from natural language |
| 3 | **QA Agent** | Groq `llama-3.3-70b-versatile` | `agents/qa_agent.py` | Reviews the SQL, detects and corrects errors before execution |
| 4 | **Visualizer** | Gemini Pro | `agents/visualizer_agent.py` | Analyzes data, selects best 3–4 charts from 15 types, returns complete ECharts JSON |
| 5 | **Analyst** | Gemini Pro | `agents/analyst_agent.py` | Explains query results in plain English; handles general chat |

### Why Each Model?

| Model | Reason |
|---|---|
| **Groq (Router)** | Ultra-low latency — only needs to output a single word |
| **Groq (QA)** | Fast SQL validation before hitting the database |
| **OpenRouter Claude 3.5** | Best-in-class SQL accuracy for complex schemas |
| **Gemini Pro** | Large context window — ideal for schema retrieval, rich visualization, and explanations |

---

## Supported Chart Types (15 Total)

Gemini Pro automatically selects the best 3–4 from:

| # | Type | Best For |
|---|---|---|
| 1 | Bar (Vertical) | Comparisons, rankings |
| 2 | Bar (Horizontal) | Long labels, Top-N lists |
| 3 | Line | Trends over time |
| 4 | Area | Volume trends, cumulative data |
| 5 | Pie / Donut | Proportions, market share |
| 6 | Scatter | Correlations, distributions |
| 7 | Heatmap | Matrix data, time × category intensity |
| 8 | Radar | Multi-dimensional comparison |
| 9 | Treemap | Hierarchical proportions |
| 10 | Funnel | Conversion pipelines |
| 11 | Gauge | KPI single values |
| 12 | KPI Scorecard | Headline numbers + trend delta |
| 13 | Box Plot | Statistical distribution |
| 14 | Waterfall | Incremental changes |
| 15 | Stacked Bar | Composition across groups |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI + Python (`backend/app/`) |
| **Frontend** | Next.js 16 + React 19 (`frontend/src/`) |
| **Database** | Any PostgreSQL database (connected at runtime) |
| **Vector Search** | pgvector — stores schema embeddings for smart SQL context retrieval |
| **Charts** | Apache ECharts via `echarts-for-react` |
| **Streaming** | Server-Sent Events (SSE) — results stream live to the UI |
| **Caching** | Redis (optional — in-memory TTL cache for repeated queries) |
| **Auth** | Supabase Auth |

