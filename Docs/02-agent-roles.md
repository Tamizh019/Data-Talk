# 🤖 Agent Roles — Who Does What?

> This file explains each AI agent in the system, what it does, and why it exists.  
> Think of them like team members — each has one clear job.

---

## Overview

We have **6 agents** working together. Each one is a separate AI model call, optimized for its specific task.

| Agent | AI Model | Main Job |
|---|---|---|
| Router | Groq Llama 3 8B | Decides what type of question the user asked |
| SQL Agent | Claude 3.5 Sonnet | Writes the SQL query |
| QA Agent | Groq Llama 3 70B | Reviews and fixes the SQL if needed |
| Executor | (Direct DB call) | Runs the SQL on the actual database |
| Visualizer | Gemini Pro | Picks charts and generates configs |
| Analyst | Gemini Pro | Writes the plain-English explanation |

---

## 1. 🗂️ Router Agent

**File:** `backend/app/agents/router_agent.py`  
**Model:** Groq Llama 3 8B (very fast, ~200ms)

### What it does
Reads the user's question and decides: is this a **data question** (needs SQL) or a **general chat** (no SQL needed)?

### Why this matters
Without a router, we'd try to generate SQL for every message — even *"Hello!"* or *"What can you do?"* — which would waste time and money.

### Example
| User Says | Router Decides |
|---|---|
| *"Show me sales by region"* | `sql` → go run a query |
| *"What tables are available?"* | `chat` → just answer conversationally |
| *"How many products are out of stock?"* | `sql` → go run a query |
| *"Can you summarize what you found?"* | `chat` → just have a conversation |

---

## 2. 🧠 SQL Agent

**File:** `backend/app/agents/sql_agent.py`  
**Model:** Claude 3.5 Sonnet via OpenRouter

### What it does
Takes the user's question + the relevant database schema, and **writes the best SQL query** to answer it.

### How it finds the right tables
Before the SQL Agent runs, the system uses **Schema Indexing** (pgvector + LlamaIndex) to find the 3-5 most relevant table definitions. It doesn't pass the entire database schema to the AI — only what's relevant. This makes responses faster and more accurate.

### Example
**User asks:** *"What's the average rating per product category?"*

**Schema passed to AI:**
```
Table: products (id, name, category, price, mrp)
Table: reviews (id, product_id, rating, user_id)
```

**SQL Generated:**
```sql
SELECT p.category, ROUND(AVG(r.rating), 2) AS avg_rating
FROM products p
JOIN reviews r ON p.id = r.product_id
GROUP BY p.category
ORDER BY avg_rating DESC;
```

---

## 3. ✅ QA Agent

**File:** `backend/app/agents/qa_agent.py`  
**Model:** Groq Llama 3 70B

### What it does
Acts like a **code reviewer**. It checks the SQL that was generated and either approves it or fixes it.

### What it checks for
- Wrong table names or column names
- Missing JOIN conditions
- Logic errors (e.g., aggregating without GROUP BY)
- Security issues (e.g., DROP, DELETE statements)

### Example
If the SQL Agent writes:
```sql
SELECT category, AVG(rating) FROM products  -- ❌ reviews table is missing!
```

The QA Agent catches this and fixes it to:
```sql
SELECT p.category, AVG(r.rating)
FROM products p JOIN reviews r ON p.id = r.product_id
GROUP BY p.category  -- ✅ correct
```

---

## 4. 🗄️ SQL Executor

**File:** `backend/app/core/sql_executor.py`  
**No AI here** — this is a direct database connection.

### What it does
Takes the approved SQL and **actually runs it** on the PostgreSQL database. Returns the raw rows and column names.

### Safety rules
- All queries are run as **read-only** (SELECT only)
- No writes, updates, or deletes are allowed
- Timeouts are enforced so heavy queries don't hang

---

## 5. 📊 Visualizer Agent

**File:** `backend/app/agents/visualizer_agent.py`  
**Model:** Gemini Pro

### What it does
Looks at the data that came back from the database and decides which charts would best explain it.  
It returns **3-4 Apache ECharts configurations** (these are JSON instructions that tell the browser what to draw).

### No images are generated
The Visualizer does **not** create image files or screenshots. It outputs JSON config objects, and the browser renders them as interactive charts using the ECharts library.

### Available chart types (15 total)
Bar, Horizontal Bar, Line, Area, Pie/Donut, Scatter, Heatmap, Radar, Treemap, Funnel, Gauge, KPI Card, Boxplot, Waterfall, Stacked Bar.

### Example decision
For the question *"Count students by role and gender"*:
- Gemini sees the data has: `role`, `gender`, `count`
- It picks: **Stacked Bar** (count by role, split by gender), **Pie** (gender split), **KPI Cards** (total per role)

*For a detailed breakdown of the full pipeline, see [03-visualization-pipeline.md](./03-visualization-pipeline.md).*

---

## 6. 💬 Analyst Agent

**File:** `backend/app/agents/analyst_agent.py`  
**Model:** Gemini Pro

### What it does
Writes the **plain-English explanation** of the results. Instead of just showing a table of numbers, it tells the user what the data means.

### Example
**Data:** 340 CS students, 210 ECE students, 180 Mech students  

**Analyst writes:**  
*"Computer Science is the largest department with 340 enrolled students, accounting for 46% of total enrollment. ECE follows at 210 students. Mechanical Engineering has the smallest share at 180 students."*

---

## Why So Many Agents?

Each model is chosen because it's **best at that one specific job**:
- Groq models are **fast** (ideal for routing decisions that need to be instant)
- Claude is **most accurate** at SQL (critical to get queries right)
- Gemini is **creative** at analysis and charts (ideal for open-ended generation)

Using one single AI model for everything would be slower and less accurate.

---

*Next: See [03-visualization-pipeline.md](./03-visualization-pipeline.md) for how charts are built step by step.*
