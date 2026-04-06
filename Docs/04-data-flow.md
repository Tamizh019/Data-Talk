# 🔄 Full Data Flow — One Request, Start to Finish

> This is a complete walkthrough of what happens when a user sends a message.  
> Follow along with the **example question:** *"Show me the top 5 products by rating"*

---

## Timeline of a Single Request

### ⏱️ T+0ms — User Presses Enter

The user types their question in the chat input and hits send.

The frontend sends a `POST /api/chat` request to the backend with:
```json
{
  "query": "Show me the top 5 products by rating",
  "history": [ ... previous messages ... ]
}
```

The response is a **Server-Sent Events (SSE) stream** — each pipeline step emits events in real-time.

---

### ⏱️ T+50ms — Security Gate

Before anything else, the system checks the message for **prompt injection attacks** — attempts to override AI behavior by writing things like *"Ignore all previous instructions..."*

If detected → request is blocked with an error.  
If clean → proceed.

---

### ⏱️ T+100ms — Cache Check

The system checks if this **exact question was already asked recently**.  
If a cached result exists → return it instantly, skip all AI steps.  
If not → continue to the agents.

---

### ⏱️ T+200ms — Router Agent Fires

**Groq Llama 3.1 8B** reads the question and decides:  
→ This is a **data question** (intent: `sql`)  

The frontend Thinking Panel immediately shows:  
> 🗂️ *"Analysing the question and routing it to the correct agent pipeline..."*

Other possible intents: `doc_rag` (document question) → routes to Doc RAG Agent, `chat` (general) → routes to Analyst for conversational response.

---

### ⏱️ T+400ms — Schema Retrieval (Smart Table Finder)

Instead of handing the AI a dump of the entire database, the system uses **vector search** to find the 2-3 most relevant tables.

The question *"top 5 products by rating"* is converted into a vector (a list of numbers representing meaning), then compared against stored vectors of all table descriptions.

**Result:** The system pulls out:
```
Table: products   (id, name, category, mrp, selling_price)
Table: reviews    (id, product_id, rating, no_of_ratings)
```

Only these two tables are passed to the SQL Agent.

---

### ⏱️ T+800ms — SQL Agent Writes the Query

**Gemini 3.1 Pro** (`models/gemini-3.1-pro-preview`) receives:
- The user's question
- The two relevant table schemas
- Any relevant conversation history

It generates:
```sql
SELECT p.name, AVG(r.rating) AS avg_rating
FROM products p
JOIN reviews r ON p.id = r.product_id
GROUP BY p.name
ORDER BY avg_rating DESC
LIMIT 5;
```

---

### ⏱️ T+1100ms — QA Agent Reviews the SQL

**Groq Llama 3.3 70B** checks the SQL for errors, schema mismatches, and security issues. Returns a JSON verdict: `{ "is_valid": true, "reason": "looks good" }`.

In this case: ✅ approved, no changes needed.  
The frontend shows the SQL block to the user.

---

### ⏱️ T+1300ms — Database Executes the Query (with Auto-Retry)

The approved SQL is sent to PostgreSQL. Results return:

| name | avg_rating |
|---|---|
| boAt Airdopes 441 | 4.5 |
| MI True Wireless | 4.4 |
| JBL C100SI | 4.3 |
| Noise ColorFit Pro | 4.2 |
| Amazon Basics USB | 4.2 |

Row count: 5. Columns: `name`, `avg_rating`.

> **If execution fails:** The error is sent back to the SQL Agent, which rewrites the query. This auto-retry happens up to 2 times — many errors are self-healed without the user noticing.

---

### ⏱️ T+1400ms — Python Sandbox Check

**Groq Llama 3.3 70B** evaluates whether the question needs advanced computation (forecasting, statistical analysis, rolling averages, etc.).

In this case: the data is a simple Top-5 list — no Python needed. The agent returns `NO_PYTHON_NEEDED` and passes the data through unchanged.

---

### ⏱️ T+1600ms — Visualizer Decides Charts

**Gemini 3 Flash** receives the data + question and picks:

1. **KPI Card** — Highlight the top-rated product ("boAt Airdopes 441 · Avg 4.5 ⭐")
2. **Horizontal Bar Chart** — Products ranked by rating (makes it easy to compare)
3. **Gauge Chart** — Overall average rating as a needle/meter display

Gemini returns 3 Plotly.js JSON configs.  
The frontend receives them and renders all 3 interactive charts in the Dashboard Studio.

---

### ⏱️ T+1900ms — Analyst Writes the Raw Analysis

**Groq Llama 3.3 70B** produces a structured analysis:

```
[FINDINGS]
• boAt Airdopes 441 leads with an average rating of 4.5
• All top 5 products maintain a 4.2+ rating threshold
• Audio accessories dominate the top positions

[RECOMMENDATION]
Explore customer review sentiment for the top 3 to identify feature patterns.

[FOLLOWUPS]
• Which products have the most reviews?
• What's the average rating by category?
• Are there products with high ratings but low review counts?
```

---

### ⏱️ T+2100ms — Refiner Formats the Final Answer

**Groq Llama 3.1 8B** takes the raw analysis and transforms it into a polished, question-aware response:

> ## boAt Airdopes 441 Leads at 4.5 ⭐ — Audio Dominates the Top 5
> 
> The top-rated products are dominated by audio accessories. **boAt Airdopes 441** leads with an average rating of **4.5**, closely followed by MI True Wireless at 4.4. All top 5 products sit above a **4.2 rating threshold**, suggesting consistently strong customer satisfaction in this segment.
>
> ---
> **Explore further:**
> - Which products have the most reviews?
> - What's the average rating by product category?
> - Are there products with high ratings but low review counts?

---

### ⏱️ T+2150ms — Results Are Cached

The full result (SQL + rows + charts + formatted explanation) is saved in **Redis cache** with the question as the key. If the same question is asked again within the cache window (default: 1 hour), it returns in milliseconds.

---

### ⏱️ T+2150ms — Done! ✅

The user sees:
- The generated SQL query
- 3 interactive Plotly.js charts (with cross-filter, drill-down, type switching, export)
- A beautifully formatted analysis
- Total time: ~2 seconds

---

## Summary Table

| Step | Agent/System | Model | Time | Output |
|---|---|---|---|---|
| Security Gate | `security.py` | — | ~50ms | Blocked or allowed |
| Cache Check | Redis | — | ~100ms | Hit → instant return |
| Route Question | Router Agent | Groq Llama 3.1 8B | ~200ms | `sql`, `chat`, or `doc_rag` |
| Find Tables | Schema RAG | pgvector + Gemini Embedding | ~400ms | 2-3 relevant schemas |
| Write SQL | SQL Agent | Gemini 3.1 Pro | ~800ms | SQL query |
| Review SQL | QA Agent | Groq Llama 3.3 70B | ~1100ms | Approved/fixed SQL |
| Run SQL | SQL Executor | PostgreSQL | ~1300ms | Raw rows + columns |
| Python Check | Python Agent | Groq Llama 3.3 70B | ~1400ms | Transformed or passed-through data |
| Pick Charts | Visualizer | Gemini 3 Flash | ~1600ms | 3-4 Plotly.js JSON configs |
| Write Analysis | Analyst | Groq Llama 3.3 70B | ~1900ms | Structured findings |
| Format Response | Refiner | Groq Llama 3.1 8B | ~2100ms | Polished markdown |
| Cache Results | Redis | — | ~2150ms | Stored for reuse |

---

## What If Something Goes Wrong?

| Problem | What Happens |
|---|---|
| SQL has a syntax error | QA Agent fixes it before it runs |
| SQL executes but fails on DB | Auto-retry engine rewrites and re-executes (up to 2x) |
| Database returns 0 rows | Visualizer is skipped; Analyst says "no data found" |
| AI model rate-limited | Automatic fallback to GitHub Models (Phi-4 or gpt-4o-mini) |
| AI model is slow/down | Error Explainer produces a friendly message |
| Same question asked twice | Second answer comes from cache — instant |
| Prompt injection attempt | Blocked at security gate before any AI is called |
| Technical error anywhere | Error Explainer translates it to plain English with a fix suggestion |

---

*For how charts are specifically built, see [03-visualization-pipeline.md](./03-visualization-pipeline.md)*  
*For what each agent does, see [02-agent-roles.md](./02-agent-roles.md)*
