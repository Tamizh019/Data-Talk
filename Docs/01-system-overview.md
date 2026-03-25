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

Think of the system as a **team of specialists** — each one does a specific job:

```
User Question
     │
     ▼
┌─────────────┐    Decides: is this a data question or just chat?
│ Router      │──────────────────────────────────────────────────
└─────────────┘
     │
     ▼
┌─────────────┐    Writes the SQL query for the database
│ SQL Agent   │
└─────────────┘
     │
     ▼
┌─────────────┐    Double-checks the SQL for errors
│  QA Agent   │
└─────────────┘
     │
     ▼
┌─────────────┐    Actually runs the SQL on the database
│  Database   │
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
  Final Response (Charts + SQL + Explanation)
```

---

## Key Technologies Used

| What | Technology | Why |
|---|---|---|
| **Backend** | FastAPI (Python) | Fast, modern API framework |
| **Frontend** | Next.js (React) | The chat interface users see |
| **Database** | PostgreSQL | Where the actual data lives |
| **Schema Search** | pgvector + LlamaIndex | Helps find the right tables quickly |
| **AI Routing** | Groq (Llama 3 8B) | Ultra-fast: decides what kind of question it is |
| **SQL Generation** | OpenRouter (Claude 3.5) | Best-in-class at writing accurate SQL |
| **Charts & Analysis** | Google Gemini Pro | Creates visualizations and writes explanations |
| **Charts Rendering** | Apache ECharts | Renders the actual charts in the browser |

---

## What Happens in Real-Time?

The system doesn't make users wait for everything to finish. It **streams updates** step by step using a live **"Thinking Panel"** displayed directly in the chat:

1. 🔀 *"Routing your question to the right agent..."*
2. 🔍 *"Scanning the database schema for relevant tables..."*
3. 📝 *"Composing a precise SQL query..."*
4. 🛡️ *"Senior QA agent reviewing for accuracy..."*
5. ⚡ *"Executing the query against the live database..."*
6. 📊 *"Analyzing N rows — picking the best charts and visuals..."*
7. 💬 *"Crafting business summary and key insights..."*

Once all steps complete, the Thinking Panel **collapses** into a clean `✅ Thought for N steps` header, and the final result (SQL, charts, summary) appears below — exactly like Claude's reasoning UI.

This is done using **Server-Sent Events (SSE)** — the page updates live without any page reloads.

---

## Recent Enhancements

| Feature | Description |
|---|---|
| 🧠 **Thinking Panel** | Live Claude-style collapsible step panel during query processing |
| 💾 **Schema Caching** | MD5 hash of schema saved to disk — skips Gemini embedding API if DB schema unchanged |
| ⚡ **Redis Cache** | Query results cached with configurable TTL — repeated questions return instantly |
| 👤 **User Profiles** | Editable job title, company, department, and bio — persisted to Supabase Auth metadata |
| 📊 **Dynamic Dispatch** | Visualizer now returns multiple typed blocks (KPI / Table / ECharts) for flexible rendering |

---

## What Data-Talk is NOT

- ❌ It does **not** modify your database (read-only queries only)
- ❌ It does **not** store your data on any external server
- ❌ It is **not** a generic chatbot — it's specifically built to answer questions about your database

---

## Files That Matter

```
RAG/
├── backend/              ← All the AI and API logic lives here
│   ├── app/agents/       ← Each AI agent has its own file
│   ├── app/core/         ← Database connection, schema indexing, security
│   └── app/main.py       ← API entry point
├── frontend/             ← The chat UI
└── Docs/                 ← You are here 📍
```

---

*Next: See [02-agent-roles.md](./02-agent-roles.md) to understand what each agent does.*
