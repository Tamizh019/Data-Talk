# Data-Talk AI 🧠

An enterprise-grade Conversational AI platform that lets non-technical users **chat with their PostgreSQL database in plain English**. Just type a question — Data-Talk generates the SQL, runs it securely, renders premium interactive charts, and writes a plain-English summary — all in real-time.

---

## ✨ Key Features

- **Multi-Agent Pipeline** — Dedicated AI agents for routing, SQL generation, QA review, visualization, and analysis — each using the model best suited to its task.
- **Claude-Style Thinking UI** — A live, animated "Thinking" panel streams each pipeline step (routing, SQL gen, QA, execution, visualization) in real-time.
- **Text-to-SQL** — Claude 3.5 Sonnet converts natural language questions into optimized, accurate PostgreSQL queries.
- **@Table Mention** — Type `@` in the chat input to instantly see all your database tables with their columns. Click or use ↑↓/Enter to tag a specific table — focuses the SQL Agent directly on the right table for faster, more accurate answers.
- **Premium Plotly.js Visualizations** — 23+ interactive chart types (Bar, Line, Area, Scatter, Bubble, Pie, Donut, Sunburst, Treemap, Funnel, Waterfall, Heatmap, Radar, Gauge, Box, Violin, Histogram, Sankey, and more) with dark-mode branded themes, built-in zoom/pan/export, and hover tooltips.
- **AI-Driven Chart Selection** — Two-phase visualization: data patterns are programmatically detected first (time series, distributions, correlations, rankings), then Gemini picks 4–7 diverse chart types matched to the data shape — never the same 3 charts twice.
- **Self-Correcting SQL** — A QA Agent (Llama 3 70B) reviews and auto-fixes generated SQL before it hits the database.
- **Schema RAG** — Uses pgvector + LlamaIndex to find only the relevant tables before generating SQL — no full schema dumps to LLMs.
- **Smart Schema Caching** — Schema embeddings are MD5-hashed and persisted to disk. Re-connecting to the same database skips all Gemini API calls completely.
- **Live Cross-Filtering** — Click any chart segment to instantly filter all other charts in the dashboard — no re-querying.
- **Smart Filter Panel** — Sidebar filter panel with column search, active filter chips with one-click removal, collapsible category/numeric groups, "Show more" for long lists, and a row-count progress bar.
- **Drill-Down** — Click any data point to open a detailed data table with statistics for that specific value.
- **Real-time Streaming** — Responses stream step-by-step via Server-Sent Events (SSE).
- **Prompt Injection Guard** — Security layer blocks prompt-injection attempts before any AI agent is invoked.
- **Result Caching** — Redis caches query results, so repeated questions return instantly.
- **Enterprise Security** — All queries are read-only (`SELECT`/`WITH` only).
- **Editable User Profiles** — Name, role, company, department, and bio — persisted to Supabase Auth metadata.
- **Any PostgreSQL DB** — Connect to any PostgreSQL database at runtime via the connect modal.

---

## 📸 Screenshots

**Chat Interface — Query with auto-generated SQL, KPI cards, and live Thinking Panel**

![Data-Talk Chat View](frontend/public/eg1.png.png)

**Dashboard View — Multi-chart Plotly visualization panel from a single question**

![Data-Talk Dashboard View](frontend/public/eg2.html.png)

---

## 🏗️ Architecture

```
User (Browser)
     │  POST /api/chat  (SSE stream)
     ▼
┌────────────────────────────────────────────────────────┐
│                    FastAPI Backend                     │
│                                                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Security │  │   Router   │  │    SQL Agent      │  │
│  │  Guard   │  │ Llama 3 8B │  │  Claude 3.5 Sonnet│  │
│  └──────────┘  └────────────┘  └───────────────────┘  │
│                                                        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ QA Agent │  │ Visualizer │  │  Analyst Agent    │  │
│  │Llama 70B │  │ Gemini Pro │  │   Gemini Pro      │  │
│  └──────────┘  └────────────┘  └───────────────────┘  │
│                                                        │
│  pgvector (Schema RAG)  ←→  PostgreSQL (User DB)      │
│  Redis (Query Cache)        Supabase (Auth + Vectors)  │
└────────────────────────────────────────────────────────┘
     │
     ▼
Next.js Frontend (Chat UI + Plotly.js 23+ Charts + Thinking Panel)
```

### Pipeline Stages (per request)
1. **Security Gate** — Blocks prompt injection
2. **Cache Check** — Returns instantly if result is cached in Redis
3. **Router Agent** — Classifies as `sql` or `chat`
4. **Schema Retrieval** — pgvector finds relevant tables (disk-cached, skips embeddings if unchanged); `@table` tags narrow scope directly
5. **SQL Agent** — Claude 3.5 generates flat relational SQL
6. **QA Agent** — Llama 3 70B reviews and fixes SQL
7. **SQL Execution** — Read-only query on user's DB (max 1000 rows)
8. **Pattern Detection** — Programmatically classifies data (time series, distributions, correlations, rankings)
9. **Visualizer Agent** — Gemini picks 4–7 Plotly charts matched to detected data patterns
10. **Analyst Agent** — Gemini writes plain-English summary with follow-up suggestions
11. **Cache** — Stores result in Redis for instant replay

---

## 🛠️ Tech Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI (Python, async) |
| SQL Generation | Claude 3.5 Sonnet (via OpenRouter) |
| Router & QA | Groq — Llama 3 8B / 70B |
| Visualization & Analysis | Google Gemini Pro |
| Schema Search | LlamaIndex + pgvector |
| Schema Caching | MD5 disk-hash (avoids redundant Gemini embedding calls) |
| Database Driver | SQLAlchemy + asyncpg |
| Caching | Redis (cloud or local) |

### Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 14 (TypeScript, App Router) |
| Styling | Tailwind CSS |
| Charts | Plotly.js (`plotly.js-dist-min` + `react-plotly.js`) — 23+ chart types |
| Auth | Supabase Auth (Google & GitHub OAuth) |
| State | React Context |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- A PostgreSQL database to connect to
- API keys: Groq, OpenRouter, Google Gemini, Supabase
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
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...

# Your System DB (Supabase) for schema vector storage
SYSTEM_DB_URL=postgresql://...

# Redis for query result caching
REDIS_URL=redis://default:PASSWORD@host:port

# Supabase (frontend auth uses this via .env.local)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
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
- **Export charts:** Use the Plotly modebar (top-right of each chart) to download as PNG
- **Switch chart types:** Click the chart type button in the top-right of each chart card to switch between 20+ types
- **Filter data:** Use the Smart Filter panel on the right — search columns, set ranges, apply multi-select filters

---

## 🔒 Security Model

| Layer | Protection |
|---|---|
| Application | `guard_prompt()` blocks prompt injection before any AI call |
| Lexical | Only `SELECT` and `WITH` queries are allowed — hard-coded regex |
| Database | SQLAlchemy engine — `postgresql_readonly: True` makes writes impossible |
| Limits | All queries capped at 1000 rows to prevent memory issues |
| Secrets | `.env` and `.env.local` are git-ignored; `.env.example` provided with placeholder values |

---

## 📁 Project Structure

```
RAG/
├── backend/
│   ├── app/
│   │   ├── agents/          ← AI agents (router, sql, qa, visualizer, analyst, orchestrator)
│   │   ├── core/            ← DB connection, schema indexer, security, cache
│   │   ├── config.py        ← Environment settings (pydantic-settings)
│   │   └── main.py          ← App entry point + /api/connect + /api/chat SSE
│   ├── .env.example         ← Template — copy to .env and fill in your keys
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             ← Next.js pages (chat, login, profile, auth callback)
│   │   ├── components/      ← UI components (ChatWindow, ChartRenderer, DashboardStudio, FilterPanel…)
│   │   ├── lib/             ← API client, auth context, chat context, chart-regenerator
│   │   └── types/           ← TypeScript declarations (plotly.d.ts)
│   └── package.json
├── Docs/                    ← Team documentation
│   ├── 01-system-overview.md
│   ├── 02-agent-roles.md
│   ├── 03-visualization-pipeline.md
│   ├── 04-data-flow.md
│   └── agent-workflow.md
└── docker-compose.yml
```

---

## 📖 Documentation

Full documentation for the team is in the [`Docs/`](./Docs/) folder:

| File | Contents |
|---|---|
| [01-system-overview.md](./Docs/01-system-overview.md) | What Data-Talk is, big-picture diagram, tech table |
| [02-agent-roles.md](./Docs/02-agent-roles.md) | Each agent's job with examples |
| [03-visualization-pipeline.md](./Docs/03-visualization-pipeline.md) | Exact step-by-step chart generation pipeline |
| [04-data-flow.md](./Docs/04-data-flow.md) | Full request traced start-to-finish with timestamps |
| [05-agent-workflow.md](./Docs/agent-workflow.md) | Full orchestration flow with data contracts between agents |
| [06-schema-rag.md](./Docs/06-schema-rag.md) | Deep-dive: how pgvector + LlamaIndex + Gemini embeddings find the right tables per query |

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
