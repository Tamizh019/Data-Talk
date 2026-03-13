# 🔄 Full Data Flow — One Request, Start to Finish

> This is a complete walkthrough of what happens when a user sends a message.  
> Follow along with the **example question:** *"Show me the top 5 products by rating"*

---

## Timeline of a Single Request

### ⏱️ T+0ms — User Presses Enter

The user types their question in the chat input and hits send.

The frontend sends a `POST /api/ask` request to the backend with:
```json
{
  "query": "Show me the top 5 products by rating",
  "history": [ ... previous messages ... ]
}
```

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

**Groq Llama 3 8B** reads the question and decides:  
→ This is a **data question** (intent: `sql`)  

The frontend immediately shows:  
> ⚡ *"Understood — running a data query..."*

---

### ⏱️ T+400ms — Schema Retrieval (Smart Table Finder)

Instead of handing the AI a dump of the entire database, the system uses **vector search** to find the 3-5 most relevant tables.

The question *"top 5 products by rating"* is converted into a vector (a list of numbers representing meaning), then compared against stored vectors of all table descriptions.

**Result:** The system pulls out:
```
Table: products   (id, name, category, mrp, selling_price)
Table: reviews    (id, product_id, rating, no_of_ratings)
```

Only these two tables are passed to the SQL Agent.

---

### ⏱️ T+800ms — SQL Agent Writes the Query

**Claude 3.5 Sonnet** receives:
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

**Groq Llama 3 70B** checks the SQL for errors.

In this case: ✅ approved, no changes needed.  
The frontend shows the SQL block to the user.

---

### ⏱️ T+1300ms — Database Executes the Query

The approved SQL is sent to PostgreSQL. Results return:

| name | avg_rating |
|---|---|
| boAt Airdopes 441 | 4.5 |
| MI True Wireless | 4.4 |
| JBL C100SI | 4.3 |
| Noise ColorFit Pro | 4.2 |
| Amazon Basics USB | 4.2 |

Row count: 5. Columns: `name`, `avg_rating`.

The frontend shows: *"Query returned 5 rows"*

---

### ⏱️ T+1400ms — Visualizer Decides Charts

**Gemini Pro** receives the data + question and picks:

1. **KPI Card** — Highlight the top-rated product ("boAt Airdopes 441 · Avg 4.5 ⭐")
2. **Horizontal Bar Chart** — Products ranked by rating (makes it easy to compare)
3. **Gauge Chart** — Overall average rating as a needle/meter display

Gemini returns 3 ECharts JSON configs.  
The frontend receives them and renders all 3 charts.

---

### ⏱️ T+1800ms — Analyst Writes the Summary

**Gemini Pro** writes a plain-English explanation:

> *"The top-rated products are dominated by audio accessories. boAt Airdopes 441 leads with an average rating of 4.5, closely followed by MI True Wireless at 4.4. All top 5 products sit above a 4.2 rating threshold, suggesting consistently strong customer satisfaction in this segment."*

---

### ⏱️ T+1850ms — Results Are Cached

The full result (SQL + rows + charts + explanation) is saved in **Redis cache** with the question as the key. If the same question is asked again within the cache window, it returns in milliseconds.

---

### ⏱️ T+1850ms — Done! ✅

The user sees:
- The generated SQL query
- 3 interactive charts
- A written analysis
- Total time: under 2 seconds

---

## Summary Table

| Step | Agent/System | Time | Output |
|---|---|---|---|
| Security Gate | `security.py` | ~50ms | Blocked or allowed |
| Cache Check | Redis | ~100ms | Hit → instant return |
| Route Question | Groq Llama 3 8B | ~200ms | `sql` or `chat` |
| Find Tables | pgvector search | ~400ms | 2-3 relevant schemas |
| Write SQL | Claude 3.5 | ~800ms | SQL query |
| Review SQL | Groq Llama 3 70B | ~1100ms | Approved/fixed SQL |
| Run SQL | PostgreSQL | ~1300ms | Raw rows + columns |
| Pick Charts | Gemini Pro | ~1400ms | 3-4 ECharts JSON configs |
| Write Summary | Gemini Pro | ~1800ms | Plain-English text |
| Cache Results | Redis | ~1850ms | Stored for reuse |

---

## What If Something Goes Wrong?

| Problem | What Happens |
|---|---|
| SQL has a syntax error | QA Agent fixes it before it runs |
| Database returns 0 rows | Visualizer is skipped; Analyst says "no data found" |
| AI model is slow/down | User sees a graceful error message |
| Same question asked twice | Second answer comes from cache — instant |
| Prompt injection attempt | Blocked at security gate before any AI is called |

---

*For how charts are specifically built, see [03-visualization-pipeline.md](./03-visualization-pipeline.md)*  
*For what each agent does, see [02-agent-roles.md](./02-agent-roles.md)*
