# Data-Talk AI 🧠

An enterprise-grade Conversational AI platform that lets non-technical users **chat with their PostgreSQL database in plain English**. Just type a question — Data-Talk generates the SQL, runs it securely, renders premium interactive charts, and writes a plain-English summary — all in real-time.

---

## ✨ Key Features

- **10-Agent Pipeline** — Dedicated AI agents for routing, SQL generation, QA review, Python analytics, visualization, analysis, and formatting — each using the model best suited to its task.
- **Claude-Style Thinking UI** — A live, animated "Thinking" panel streams each pipeline step (routing, SQL gen, QA, execution, visualization) in real-time, then collapses on completion.
- **Text-to-SQL** — Gemini 3.1 Pro converts natural language questions into optimized, accurate PostgreSQL queries.
- **Self-Correcting SQL** — QA Agent reviews SQL pre-execution; if the DB rejects it, the SQL Agent auto-rewrites and retries (up to 2x).
- **@Table Mention** — Type `@` in the chat input to instantly see all your database tables with their columns. Click or use ↑↓/Enter to tag a specific table — focuses the SQL Agent directly on the right table.
- **Premium Plotly.js Visualizations** — 23+ interactive chart types (Bar, Line, Area, Scatter, Bubble, Pie, Donut, Sunburst, Treemap, Funnel, Waterfall, Heatmap, Radar, Gauge, Box, Violin, Histogram, Sankey, and more) with dark-mode themes, zoom/pan/export, and hover tooltips.
- **AI-Driven Chart Selection** — Gemini 3 Flash analyzes data patterns and picks 3-4 diverse chart types matched to the data shape.
- **Dashboard Studio** — Full interactive dashboard with draggable chart cards, cross-filtering, drill-down drawers, chart type switching, and smart filters.
- **Schema RAG** — Uses pgvector + LlamaIndex to find only the relevant tables before generating SQL — no full schema dumps to LLMs.
- **Smart Schema Caching** — Schema embeddings are MD5-hashed and persisted to disk. Re-connecting to the same database skips all embedding API calls completely.
- **Live Cross-Filtering** — Click any chart segment to instantly filter all other charts in the dashboard — no re-querying.
- **Smart Filter Panel** — Sidebar filter panel with column search, active filter chips with one-click removal, collapsible category/numeric groups, and row-count progress bar.
- **Drill-Down** — Click any data point to open a detailed data table with statistics for that specific value.
- **Python Sandbox** — Advanced stats, forecasting, rolling averages, and z-scores via a secure Pandas/NumPy sandbox agent.
- **Real-time Streaming** — Responses stream step-by-step via Server-Sent Events (SSE).
- **Automatic Failover** — GitHub Models (Phi-4 / gpt-4o-mini) activate automatically when Groq rate-limits.
- **Friendly Error Messages** — Error Explainer Agent translates technical failures into plain-English suggestions — users never see stack traces.
- **Prompt Injection Guard** — Security layer blocks prompt-injection attempts before any AI agent is invoked.
- **Result Caching** — Redis caches query results, so repeated questions return instantly.
- **Smart Onboarding** — Suggestion Agent reads your schema and generates tailored starter questions on DB connect.
- **Document RAG** — Upload PDFs, CSVs, or text files and ask questions about their contents with automatic visualization.
- **Conversation Sync** — Chat history persisted to Supabase for cross-device continuity.
- **Enterprise Security** — All queries are read-only (`SELECT`/`WITH` only), capped at 1000 rows.
- **Editable User Profiles** — Name, role, company, department, and bio — persisted to Supabase Auth metadata.
- **Any PostgreSQL DB** — Connect to any PostgreSQL database at runtime via the connect modal.

---

## 🏗️ Architecture

```
User (Browser)
     │  POST /api/chat  (SSE stream)
     ▼
┌────────────────────────────────────────────────────────┐
│                    FastAPI Backend                      │
│                                                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Security │  │   Router   │  │    SQL Agent      │  │
│  │  Guard   │  │ Groq 8B    │  │  Gemini 3.1 Pro   │  │
│  └──────────┘  └────────────┘  └───────────────────┘  │
│                                                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ QA Agent │  │ Python     │  │  Visualizer       │  │
│  │ Groq 70B │  │ Sandbox    │  │  Gemini 3 Flash   │  │
│  └──────────┘  │ Groq 70B   │  └───────────────────┘  │
│                └────────────┘                          │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Analyst  │  │  Refiner   │  │  Error Explainer  │  │
│  │ Groq 70B │  │  Groq 8B   │  │  Groq 8B          │  │
│  └──────────┘  └────────────┘  └───────────────────┘  │
│                                                        │
│  ┌──────────┐  ┌────────────┐                          │
│  │Suggestion│  │  Doc RAG   │  Fallback: GitHub Models │
│  │Gemini 3F │  │  Groq 70B  │  (Phi-4 / gpt-4o-mini)  │
│  └──────────┘  └────────────┘                          │
│                                                        │
│  pgvector (Schema RAG)  ←→  PostgreSQL (User DB)       │
│  Redis (Query Cache)        Supabase (Auth + Vectors)  │
└────────────────────────────────────────────────────────┘
     │
     ▼
Next.js 16 Frontend (Chat UI + Plotly.js 23+ Charts + Dashboard Studio)
```

### Pipeline Stages (per request)
1. **Security Gate** — Blocks prompt injection
2. **Cache Check** — Returns instantly if result is cached in Redis
3. **Router Agent** — Classifies as `sql`, `doc_rag`, or `chat`
4. **Schema Retrieval** — pgvector finds relevant tables (disk-cached, skips embeddings if unchanged); `@table` tags narrow scope directly
5. **SQL Agent** — Gemini 3.1 Pro generates flat relational SQL
6. **QA Agent** — Groq Llama 3.3 70B reviews and fixes SQL
7. **SQL Execution** — Read-only query on user's DB (max 1000 rows) with auto-retry (up to 2x)
8. **Python Sandbox** — Groq 70B checks if advanced stats/forecasting is needed, runs secure Pandas/NumPy code
9. **Visualizer Agent** — Gemini 3 Flash picks 3-4 Plotly charts matched to data patterns
10. **Analyst Agent** — Groq 70B writes structured data analysis with findings and recommendations
11. **Refiner Agent** — Groq 8B formats the final answer to match the question type
12. **Cache** — Stores full result in Redis for instant replay

---

## 🛠️ Tech Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI (Python, async) |
| SQL Generation | Gemini 3.1 Pro (`models/gemini-3.1-pro-preview`) |
| Router, Refiner & Error Explainer | Groq — Llama 3.1 8B |
| QA, Analyst & Python Sandbox | Groq — Llama 3.3 70B |
| Visualization & Suggestions | Gemini 3 Flash (`models/gemini-3-flash-preview`) |
| Fallback Models | GitHub Models (Phi-4 / gpt-4o-mini) |
| Schema Search | LlamaIndex + pgvector |
| Schema Caching | MD5 disk-hash (avoids redundant Gemini embedding calls) |
| Database Driver | SQLAlchemy + asyncpg |
| Caching | Redis (cloud or local) |

### Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 16 (TypeScript, App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Plotly.js (`plotly.js-dist-min` + `react-plotly.js`) — 23+ chart types |
| Dashboard | Dashboard Studio (grid layout, cross-filter, drill-down) |
| Auth | Supabase Auth (Google & GitHub OAuth) |
| State | React Context (auth, chat, studio) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- A PostgreSQL database to connect to
- API keys: Groq, Google Gemini, GitHub PAT (for fallback)
- A Redis instance (free cloud options: [Upstash](https://upstash.com/), [Redis Cloud](https://cloud.redis.io/))

### 1. Clone & configure backend

```bash
cd backend
python -m venv venv
# Windows:  venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys and DB URL
```

**Core `.env` keys required:**
```env
# API Keys
GEMINI_API_KEY=...
GROQ_API_KEY=...
GITHUB_TOKEN=ghp_...        # for fallback models

# Supabase (Auth + Conversation Sync)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# System DB (Supabase) for schema vector storage
SYSTEM_DB_URL=postgresql://...

# Redis for query result caching
REDIS_URL=redis://default:PASSWORD@host:port
```

**Run the backend:**
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend setup

```bash
cd frontend
npm install
# Create frontend/.env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
npm run dev
```

### 3. Open the app

Navigate to **http://localhost:3000** → sign in with Google or GitHub → connect your PostgreSQL database → start chatting!

---

## 💡 Usage Tips

- **Tag a specific table:** Type `@` in the chat box → select a table from the dropdown (e.g., `@student_database show me top 10 by marks`)
- **Cross-filter charts:** Click any bar, slice, or point on a chart to filter all other charts instantly
- **Drill down:** Click any data point to see full row-level details in a popup
- **Export charts:** Download as interactive HTML or static SVG via the chart card menu
- **Switch chart types:** Click the chart type button in the top-right of each chart card to switch between 23+ types
- **Filter data:** Use the Smart Filter panel on the right — search columns, set ranges, apply multi-select filters

---

## 🔒 Security Model

| Layer | Protection |
|---|---|
| Application | `guard_prompt()` blocks prompt injection before any AI call |
| Lexical | Only `SELECT` and `WITH` queries are allowed — hard-coded regex |
| Database | SQLAlchemy engine — read-only execution makes writes impossible |
| Limits | All queries capped at 1000 rows to prevent memory issues |
| Errors | Error Explainer translates failures to plain English — no raw tracebacks |
| Secrets | `.env` and `.env.local` are git-ignored; `.env.example` provided with placeholder values |

---

## 📁 Project Structure

```
RAG/
├── backend/
│   ├── app/
│   │   ├── agents/          ← 10 AI agents (router, sql, qa, python, visualizer, analyst,
│   │   │                       refiner, error_explainer, suggestion, doc_agent, doc_visualizer)
│   │   ├── core/            ← DB connection, schema RAG, security, cache, fallback client
│   │   ├── routes/          ← API route handlers (chat, upload, conversations)
│   │   ├── config.py        ← Environment settings (pydantic-settings)
│   │   └── main.py          ← App entry point + /api/connect + /api/analytics + admin routes
│   ├── .env.example         ← Template — copy to .env and fill in your keys
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             ← Next.js pages (chat, login, signup, profile, analytics, reports)
│   │   ├── components/      ← UI components (ChatWindow, ChartRenderer, ThinkingSteps, etc.)
│   │   ├── components/studio/ ← Dashboard Studio (ChartCard, FilterPanel, DrillDown, SchemaExplorer)
│   │   ├── lib/             ← API client, auth context, chat context, studio context
│   │   └── types/           ← TypeScript declarations
│   └── package.json
├── Docs/                    ← Team documentation
│   ├── 01-system-overview.md
│   ├── 02-agent-roles.md
│   ├── 03-visualization-pipeline.md
│   ├── 04-data-flow.md
│   ├── 05-agent-workflow.md
│   ├── 06-schema-rag.md
│   ├── 07-fallback-and-resilience.md
│   └── 08-api-reference.md
└── docker-compose.yml
```

---

## 📖 Documentation

Full documentation for the team is in the [`Docs/`](./Docs/) folder:

| File | Contents |
|---|---|
| [01-system-overview.md](./Docs/01-system-overview.md) | What Data-Talk is, big-picture diagram, tech table |
| [02-agent-roles.md](./Docs/02-agent-roles.md) | Each of the 10 agents explained with examples |
| [03-visualization-pipeline.md](./Docs/03-visualization-pipeline.md) | Exact step-by-step chart generation pipeline |
| [04-data-flow.md](./Docs/04-data-flow.md) | Full request traced start-to-finish with timestamps |
| [05-agent-workflow.md](./Docs/05-agent-workflow.md) | Full orchestration flow with architecture diagram |
| [06-schema-rag.md](./Docs/06-schema-rag.md) | Deep-dive: how pgvector + LlamaIndex + Gemini embeddings find the right tables |
| [07-fallback-and-resilience.md](./Docs/07-fallback-and-resilience.md) | Production resilience: fallback client, auto-retry, error handling |
| [08-api-reference.md](./Docs/08-api-reference.md) | Full API endpoint reference with request/response schemas |

---

## 👥 Team

| Role | Members |
|---|---|
| Frontend Development | Kubendiran, Sravya |
| Backend & AI Logic | Divya, Rishitha, Ramya, Tamizharasan |
| Database Management | Abilesha, Goel |

---

## 📜 License

This project is for educational and portfolio purposes.
