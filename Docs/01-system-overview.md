# 📊 Data-Talk — System Overview

> **Who is this for?** Anyone joining the team — no deep tech knowledge needed.  
> This file explains **what** Data-Talk is and **why** it works the way it does.

---

## What is Data-Talk?

Data-Talk is a **smart chat interface for your database**.

Instead of writing SQL queries, users simply type a question in plain English. The system figures out the right SQL, runs it, and then automatically shows charts and a written summary of the results.

**Example:**

> 🧑 User types:  *"How many students are enrolled in each department?"*
>
> ✅ System replies with:
> - The SQL query it generated and ran
> - A bar chart of enrollment per department
> - A plain-English summary like *"Computer Science has the highest enrollment at 340 students..."*

---

## The Big Picture

Think of the system as a **team of 10 specialists** — each one does a specific job:

```
User Question
     │
     ▼
┌─────────────┐    Blocks prompt injection / malicious input
│  Security   │
└─────────────┘
     │
     ▼
┌─────────────┐    Returns instantly if this question was asked before
│ Redis Cache │
└─────────────┘
     │
     ▼
┌─────────────┐    Decides: is this a data question, doc question, or just chat?
│   Router    │────────────────────────────────────────────────────────
└─────────────┘
     │
     ▼
┌─────────────┐    Finds the 2-3 most relevant tables using vector search
│ Schema RAG  │
└─────────────┘
     │
     ▼
┌─────────────┐    Writes the SQL query for the database
│ SQL Agent   │
└─────────────┘
     │
     ▼
┌─────────────┐    Double-checks the SQL for errors and fixes them
│  QA Agent   │
└─────────────┘
     │
     ▼
┌─────────────┐    Actually runs the SQL on the database (with auto-retry)
│  Executor   │
└─────────────┘
     │
     ▼
┌─────────────┐    Runs advanced stats/forecasting if the question needs it
│ Python Agent│
└─────────────┘
     │
     ▼
┌─────────────┐    Decides which charts best show the data
│ Visualizer  │
└─────────────┘
     │
     ▼
┌─────────────┐    Writes a plain-English explanation of results
│  Analyst    │
└─────────────┘
     │
     ▼
┌─────────────┐    Formats the final answer to match the question type
│  Refiner    │
└─────────────┘
     │
     ▼
  Final Response (Charts + SQL + Formatted Analysis)
```

---

## Key Technologies Used

| What | Technology | Why |
|---|---|---|
| **Backend** | FastAPI (Python) | Fast, modern async API framework |
| **Frontend** | Next.js 16 + React 19 (TypeScript) | The chat interface and dashboard studio |
| **Database** | PostgreSQL (any, connected at runtime) | Where the actual data lives |
| **Schema Search** | pgvector + LlamaIndex | Helps find the right tables quickly |
| **AI Routing** | Groq (Llama 3.1 8B) | Ultra-fast: decides what kind of question it is |
| **SQL Generation** | Google Gemini 3.1 Pro | Best-in-class at writing accurate SQL |
| **QA & Analysis** | Groq (Llama 3.3 70B) | Fast review, statistical analysis |
| **Charts & Visualization** | Google Gemini 3 Flash | Creates visualization configs from data |
| **Chart Rendering** | Plotly.js (`react-plotly.js`) | Renders 23+ interactive chart types in the browser |
| **Fallback Models** | GitHub Models (Phi-4 / gpt-4o-mini) | Automatic failover when Groq rate-limits |
| **Auth** | Supabase Auth (Google & GitHub OAuth) | User authentication and profile management |
| **Caching** | Redis | Repeated questions return instantly |

---

## What Happens in Real-Time?

The system doesn't make users wait for everything to finish. It **streams updates** step by step using a live **"Thinking Panel"** displayed directly in the chat:

1. 💾 *"Checking Redis for a previously computed answer..."*
2. 🔀 *"Analysing the question and routing it to the correct agent pipeline..."*
3. 🔍 *"Querying the schema index to find the tables most relevant to this request..."*
4. 📝 *"Translating the natural-language question into an optimised SQL query..."*
5. 🛡️ *"Senior QA agent reviewing the generated SQL for correctness and safety..."*
6. ⚡ *"Running the SQL against the live database..."*
7. 🐍 *"Checking if advanced statistical computation is needed..."*
8. 📊 *"Analysing N rows and selecting the optimal chart types and layout..."*
9. 💬 *"Computing aggregates, trends, and anomalies. Synthesising key business insights..."*
10. ✨ *"Matching the answer structure to your question type..."*

Once all steps complete, the Thinking Panel **collapses** into a clean `✅ Thought for N steps` header, and the final result (SQL, charts, summary) appears below — exactly like Claude's reasoning UI.

This is done using **Server-Sent Events (SSE)** — the page updates live without any page reloads.

---

## Recent Enhancements

| Feature | Description |
|---|---|
| 🛡️ **Fallback Client** | Automatic failover to GitHub Models (Phi-4 / gpt-4o-mini) when Groq rate-limits |
| 🔄 **Auto-Retry Engine** | SQL execution failures trigger AI-powered self-correction (up to 2 retries) |
| 🧠 **Thinking Panel** | Live Claude-style collapsible step panel during query processing |
| 💾 **Schema Caching** | MD5 hash of schema saved to disk — skips embedding API if DB schema unchanged |
| ⚡ **Redis Cache** | Query results cached with configurable TTL — repeated questions return instantly |
| 👤 **User Profiles** | Editable job title, company, department, and bio — persisted to Supabase Auth metadata |
| 📊 **Dashboard Studio** | Full interactive dashboard with cross-filtering, drill-down, and chart type switching |
| 💡 **Smart Suggestions** | Schema-aware onboarding — AI generates tailored starter questions on DB connect |
| 🐍 **Python Sandbox** | Secure Pandas/NumPy execution for advanced stats, forecasting, and transformations |
| ❌ **Error Explainer** | Friendly plain-English error messages — users never see raw stack traces |
| 💬 **Conversation Sync** | Chat history persisted to Supabase for cross-device continuity |

---

## What Data-Talk is NOT

- ❌ It does **not** modify your database (read-only queries only)
- ❌ It does **not** store your data on any external server
- ❌ It is **not** a generic chatbot — it's specifically built to answer questions about your database

---

## Files That Matter

```
RAG/
├── backend/                  ← All the AI and API logic
│   ├── app/agents/           ← 10 AI agents (router, sql, qa, visualizer, analyst, etc.)
│   ├── app/core/             ← Database connection, schema indexer, security, cache, fallback
│   ├── app/routes/           ← API route handlers (chat, upload, conversations)
│   ├── app/config.py         ← Environment settings (all models, keys, URLs)
│   └── app/main.py           ← App entry point + admin endpoints
├── frontend/                 ← The chat UI and Dashboard Studio
│   ├── src/components/       ← UI components (ChatWindow, ChartRenderer, etc.)
│   ├── src/components/studio/ ← Dashboard Studio (ChartCard, FilterPanel, DrillDown, etc.)
│   └── src/lib/              ← API client, auth context, chat context
├── Docs/                     ← You are here 📍
└── docker-compose.yml        ← Container orchestration
```

---

*Next: See [02-agent-roles.md](./02-agent-roles.md) to understand what each agent does.*
