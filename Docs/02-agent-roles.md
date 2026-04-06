# 🤖 Agent Roles — Who Does What?

> This file explains each AI agent in the system, what it does, and why it exists.  
> Think of them like team members — each has one clear job.

---

## Overview

We have **10 agents** working together. Each one is a separate AI model call, optimized for its specific task.

| # | Agent | AI Model | Main Job |
|---|---|---|---|
| 1 | Router | Groq Llama 3.1 8B | Decides what type of question the user asked |
| 2 | SQL Agent | Gemini 3.1 Pro | Writes the SQL query |
| 3 | QA Agent | Groq Llama 3.3 70B | Reviews and fixes the SQL if needed |
| 4 | Executor | (Direct DB call) | Runs the SQL on the actual database |
| 5 | Python Analyst | Groq Llama 3.3 70B | Runs advanced stats/forecasting in a Python sandbox |
| 6 | Visualizer | Gemini 3 Flash | Picks charts and generates Plotly configs |
| 7 | Analyst | Groq Llama 3.3 70B | Writes the raw statistical analysis |
| 8 | Refiner | Groq Llama 3.1 8B | Formats the final answer to match the question type |
| 9 | Error Explainer | Groq Llama 3.1 8B | Translates technical errors into friendly messages |
| 10 | Suggestion Agent | Gemini 3 Flash | Generates schema-aware starter questions on DB connect |

**Additional specialized agents:**
- **Doc RAG Agent** — answers questions from uploaded documents
- **Doc Visualizer Agent** — generates charts from unstructured document data

---

## 1. 🗂️ Router Agent

**File:** `backend/app/agents/router_agent.py`  
**Model:** Groq Llama 3.1 8B (very fast, ~200ms)  
**Fallback:** Phi-4 via GitHub Models

### What it does
Reads the user's question and classifies it into one of **three intents**: `sql` (needs a database query), `doc_rag` (about an uploaded document), or `chat` (general conversation).

### Why this matters
Without a router, we'd try to generate SQL for every message — even *"Hello!"* or *"summarize the uploaded PDF"* — which would waste time and money.

### Example
| User Says | Router Decides |
|---|---|
| *"Show me sales by region"* | `sql` → go run a query |
| *"What tables are available?"* | `sql` → go run a query |
| *"Summarize the uploaded PDF"* | `doc_rag` → search document context |
| *"According to the document, what is the policy?"* | `doc_rag` → search document context |
| *"Hi there!"* | `chat` → just answer conversationally |
| *"What can you do?"* | `chat` → explain capabilities |

---

## 2. 🧠 SQL Agent

**File:** `backend/app/agents/sql_agent.py`  
**Model:** Google Gemini 3.1 Pro (`models/gemini-3.1-pro-preview`)

### What it does
Takes the user's question + the relevant database schema, and **writes the best SQL query** to answer it.

### How it finds the right tables
Before the SQL Agent runs, the system uses **Schema RAG** (pgvector + LlamaIndex) to find the 2-3 most relevant table definitions. It doesn't pass the entire database schema to the AI — only what's relevant. This makes responses faster and more accurate.

### Auto-correction mode
If a generated SQL fails when executed, the SQL Agent is called again with the error message as context and asked to fix the query. This happens automatically for up to 2 retries.

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
**Model:** Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)  
**Fallback:** gpt-4o-mini via GitHub Models

### What it does
Acts like a **senior code reviewer**. It checks the SQL that was generated and either approves it or fixes it. Returns a structured JSON result with `is_valid`, `reason`, and `fixed_sql`.

### What it checks for
- Wrong table names or column names
- Missing JOIN conditions
- Logic errors (e.g., aggregating without GROUP BY)
- Security issues (e.g., DROP, DELETE statements)
- Multi-part questions: it won't reject SQL just because it returns raw rows instead of computing totals — the downstream pipeline handles aggregations

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
- Results capped at 1000 rows to prevent memory issues

### Auto-retry engine
If the SQL execution fails (e.g., wrong table name slipped through QA), the system automatically:
1. Sends the error back to the SQL Agent with the schema
2. Gets a corrected query
3. Re-executes (up to 2 automatic retries)

This means many errors are self-healed without the user ever knowing.

---

## 5. 🐍 Python Analyst Agent

**File:** `backend/app/agents/python_analyst_agent.py`  
**Model:** Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)  
**Fallback:** gpt-4o-mini via GitHub Models

### What it does
Determines if the user's question requires **advanced computation** beyond what SQL already returned — things like trend forecasting, moving averages, statistical distributions, z-scores, or correlation analysis.

### How it works
1. **Keyword heuristic**: If the question contains words like "predict", "forecast", "correlation", "percentile", "z-score", etc., it activates
2. **Code generation**: The LLM writes Python code using Pandas and NumPy
3. **Sandboxed execution**: Code runs in a restricted environment (no file system, no network, only `pd` and `np`)
4. **Result replacement**: If the code produces valid output, it replaces the original dataset before visualization

### Example
User asks: *"Show me the rolling average of sales over time"*  
→ The agent writes: `result = df.assign(rolling_avg=df['sales'].rolling(7).mean()).to_dict('records')`  
→ The visualizer then charts the rolling average column.

---

## 6. 📊 Visualizer Agent

**File:** `backend/app/agents/visualizer_agent.py`  
**Model:** Gemini 3 Flash (`models/gemini-3-flash-preview`)

### What it does
Looks at the data that came back from the database and decides which charts would best explain it.  
It returns **3-4 Plotly.js chart configurations** (JSON instructions that tell the browser what to draw).

### No images are generated
The Visualizer does **not** create image files or screenshots. It outputs JSON config objects, and the browser renders them as interactive charts using Plotly.js.

### Available chart types (23+ total)
Bar, Horizontal Bar, Line, Area, Pie, Donut, Scatter, Bubble, Heatmap, Radar, Treemap, Funnel, Gauge, KPI Scorecard, Box Plot, Violin, Histogram, Waterfall, Stacked Bar, Sunburst, Sankey, and more.

### Example decision
For the question *"Count students by role and gender"*:
- Gemini sees the data has: `role`, `gender`, `count`
- It picks: **Stacked Bar** (count by role, split by gender), **Pie** (gender split), **KPI Cards** (total per role)

*For a detailed breakdown of the full pipeline, see [03-visualization-pipeline.md](./03-visualization-pipeline.md).*

---

## 7. 💬 Analyst Agent

**File:** `backend/app/agents/analyst_agent.py`  
**Model:** Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)  
**Fallback:** gpt-4o-mini via GitHub Models

### What it does
Reads the SQL result set and produces a **structured raw analysis** — findings with specific numbers, a recommendation, and follow-up questions. This is raw material that the Refiner Agent will format.

### Also handles chat
When the Router classifies a question as `chat`, the Analyst Agent switches to conversational mode using `chat_fallback()`, answering general questions about Data-Talk's capabilities.

### Example
**Data:** 340 CS students, 210 ECE students, 180 Mech students  

**Analyst produces:**
```
[FINDINGS]
• Computer Science leads with 340 enrolled students (46% of total)
• ECE follows at 210 students (29%)
• Mechanical Engineering has the smallest share at 180 students (25%)

[RECOMMENDATION]
Investigate why CS enrollment is 89% higher than Mechanical — could indicate resource allocation needs.

[FOLLOWUPS]
• How has enrollment changed year-over-year?
• What is the average CGPA per department?
• Which department has the highest dropout rate?
```

---

## 8. ✨ Refiner / Formatter Agent

**File:** `backend/app/agents/refiner_agent.py`  
**Model:** Groq Llama 3.1 8B (`llama-3.1-8b-instant`)  
**Fallback:** Phi-4 via GitHub Models

### What it does
This is the **final intelligence layer** — the only text the user actually sees. It takes the raw analyst output and reformats it into a beautifully formatted, question-aware response.

### Why it exists
The Analyst produces raw structured findings. The Refiner:
- Generates a descriptive title that captures the **key finding** (not the question)
- Matches the format to the question type (ranking → numbered list, aggregate → bold number, etc.)
- Adds 3 follow-up questions
- Removes robotic language ("As an AI...", "Based on the data...")

### Example transformation
**Analyst raw output:** `[FINDINGS] • CS leads with 340 students...`  
**Refiner output:**
> ## Computer Science Leads Enrollment at 340 — 46% of Total
> 
> CS enrollment is nearly **double** that of Mechanical Engineering (340 vs 180)...

---

## 9. ❌ Error Explainer Agent

**File:** `backend/app/agents/error_explainer_agent.py`  
**Model:** Groq Llama 3.1 8B (`llama-3.1-8b-instant`)

### What it does
When anything fails in the pipeline (SQL errors, connection issues, model failures), this agent translates the raw technical error into a **clear, friendly message** with an actionable suggestion.

### Why it exists
Users should **never** see raw stack traces, SQL syntax errors, or Python exceptions. Every error is intercepted and explained in plain English.

### Example
**Raw error:** `relation "student_database" does not exist`  
**User sees:**
> ❌ **What happened:** I couldn't find a table matching your question.
> 
> 💡 **Try this:** Check the table name by typing `@` to see all available tables, then rephrase your question.

---

## 10. 💡 Suggestion Agent

**File:** `backend/app/agents/suggestion_agent.py`  
**Model:** Gemini 3 Flash (same as Visualizer)

### What it does
Runs **once** when a user connects to a new database. It reads the schema and generates **6 categorized starter questions** that are specific to the user's actual tables and columns.

### Output format
```json
{
  "greeting": "This database contains student records, course enrollments, and faculty details.",
  "categories": [
    { "label": "Quick Overview", "icon": "📊", "questions": ["How many students are enrolled?", "What are the available departments?"] },
    { "label": "Trends & Rankings", "icon": "📈", "questions": ["Which department has the highest average CGPA?", "Top 10 students by marks?"] },
    { "label": "Deep Insights", "icon": "🔍", "questions": ["Is there a correlation between attendance and CGPA?", "Which courses have the lowest pass rate?"] }
  ]
}
```

---

## Why So Many Agents?

Each model is chosen because it's **best at that one specific job**:

| Model | Used By | Reason |
|---|---|---|
| **Groq Llama 3.1 8B** | Router, Refiner, Error Explainer | Ultra-fast (~200ms) — only needs to output a single word or short text |
| **Groq Llama 3.3 70B** | QA, Analyst, Python Agent | Fast + accurate for complex reasoning, SQL validation, statistical analysis |
| **Gemini 3.1 Pro** | SQL Agent | Large context window + best SQL accuracy for complex schemas |
| **Gemini 3 Flash** | Visualizer, Suggestion Agent | Creative generation — ideal for chart selection and open-ended tasks |
| **GitHub Models (Phi-4 / gpt-4o-mini)** | All Groq agents (fallback) | Automatic failover when Groq rate-limits — keeps the system running |

Using one single AI model for everything would be slower, less accurate, and would fail completely if that one provider goes down.

---

*Next: See [03-visualization-pipeline.md](./03-visualization-pipeline.md) for how charts are built step by step.*
