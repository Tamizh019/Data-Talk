# 🛡️ Fallback & Resilience — How Data-Talk Stays Online

> This document explains how Data-Talk handles failures, rate-limits, and errors gracefully.  
> No deep tech knowledge needed — this is written for everyone.

---

## The Problem

Data-Talk uses multiple AI providers (Groq, Google Gemini). Like any cloud service, these can:
- **Rate-limit** — Groq's free tier limits requests per minute/day
- **Go down** — temporary outages, network issues
- **Fail silently** — return garbled or empty responses
- **Throw errors** — SQL syntax failures, connection drops

Without fallback systems, **any single failure would crash the entire pipeline**. A user asking a simple question would see a raw error message they can't understand.

Data-Talk solves this with **three layers of resilience**:

---

## Layer 1: GitHub Models Fallback Client

**File:** `backend/app/core/fallback_client.py`

### What it does
When any **Groq-based agent** fails (rate-limit, timeout, or error), the system automatically switches to **GitHub Models** — Microsoft's free AI inference endpoint. The user never notices.

### How it works

```
User asks a question
         │
         ▼
    Groq API call
         │
    ┌────┴────┐
    │ Success │ → use Groq's response ✅
    └─────────┘
         │
    ┌────┴────┐
    │  Fail   │ → automatic catch
    └─────────┘
         │
         ▼
    GitHub Models API call (same prompt, different model)
         │
    ┌────┴────┐
    │ Success │ → use GitHub's response ✅
    └─────────┘
         │
    ┌────┴────┐
    │  Fail   │ → Error Explainer creates friendly message
    └─────────┘
```

### Two tiers of fallback models

Not all tasks need the same model power. The fallback client has two tiers:

| Tier | GitHub Model | Used For | Reason |
|---|---|---|---|
| `"light"` | **Microsoft Phi-4** | Router, Refiner | These agents do simple tasks (classify one word, format text) — a smaller model is fine |
| `"heavy"` | **OpenAI gpt-4o-mini** | QA, Analyst, Python Agent | These agents do complex reasoning (SQL review, data analysis) — needs a capable model |

### Which agents have fallback?

| Agent | Primary Model | Fallback Model | Tier |
|---|---|---|---|
| Router | Groq Llama 3.1 8B | Phi-4 | light |
| QA Critic | Groq Llama 3.3 70B | gpt-4o-mini | heavy |
| Analyst | Groq Llama 3.3 70B | gpt-4o-mini | heavy |
| Python Analyst | Groq Llama 3.3 70B | gpt-4o-mini | heavy |
| Refiner | Groq Llama 3.1 8B | Phi-4 | light |

> **Note:** Gemini-based agents (SQL Agent, Visualizer, Suggestion Agent) do not use the GitHub fallback — they use Google's API which has different rate limits and doesn't typically rate-limit as aggressively.

### Configuration

The fallback requires one environment variable:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This is a **GitHub Personal Access Token** (classic, with no special scopes needed). GitHub Models provides ~150 free requests/day per model.

The fallback model names are configurable in `.env`:
```env
# These are the defaults — you can change them
GITHUB_FALLBACK_MODEL_LIGHT=microsoft/Phi-4
GITHUB_FALLBACK_MODEL_HEAVY=openai/gpt-4o-mini
```

### What the user experiences

| Scenario | Without Fallback | With Fallback |
|---|---|---|
| Groq rate-limited | ❌ Raw error: "Rate limit exceeded" | ✅ Response takes ~1s longer but works normally |
| Groq down | ❌ Pipeline crashes, user sees error | ✅ Seamless switch — user doesn't notice |
| Both Groq + GitHub fail | ❌ Total failure | ✅ Error Explainer provides a friendly message |

---

## Layer 2: Auto-Retry Engine (Self-Correcting SQL)

**File:** `backend/app/agents/orchestrator.py` (lines 146–171)

### What it does
If SQL execution **fails on the database** (wrong table name, syntax error, column mismatch), the system doesn't give up. It automatically:
1. Captures the database error message
2. Sends it back to the SQL Agent with the schema as context
3. The SQL Agent rewrites the query to fix the issue
4. Re-executes the corrected query
5. Repeats up to **2 times**

### Example flow

```
User: "Show me top students by CGPA"

[Attempt 1]
  SQL Agent generates: SELECT * FROM students ORDER BY cgpa DESC LIMIT 10
  DB Error: relation "students" does not exist
  
[Auto-retry 1]
  Schema context shows the actual table is "student_database"
  SQL Agent generates: SELECT * FROM student_database ORDER BY cgpa DESC LIMIT 10
  ✅ Success — 10 rows returned

User sees: correct results, never knew about the retry
```

### Pipeline thinking steps

The Thinking Panel shows auto-corrections transparently:

1. ⚡ *"Running the SQL against the live database (attempt 1)..."* — ❌ failed
2. 🔄 *"DB error detected. AI is rewriting the query to resolve..."* — fixing
3. ⚡ *"Running the SQL against the live database (attempt 2)..."* — ✅ success

### Configuration

| Setting | Value | Effect |
|---|---|---|
| `max_retries` | `2` | Maximum automatic retry attempts |
| Hardcoded in | `orchestrator.py` | Not configurable via `.env` (intentional — prevents infinite loops) |

---

## Layer 3: Error Explainer Agent

**File:** `backend/app/agents/error_explainer_agent.py`  
**Model:** Groq Llama 3.1 8B (fast — error messages should appear instantly)

### What it does
When **everything else fails** — both the primary model and fallback, or the auto-retry engine exhausts its attempts — the Error Explainer catches the raw technical error and produces a **friendly, actionable message**.

### What it is NOT
- It does **not** retry the failed operation
- It does **not** fix the problem
- It **translates** the error into human-friendly language

### Rules the agent follows
- Never show raw error messages, SQL, stack traces, or technical terms
- Always explain in 1-2 sentences what went wrong
- Always suggest what the user can try next
- Keep tone calm, helpful, and encouraging

### Example transformations

| Raw Technical Error | User Sees |
|---|---|
| `relation "student_database" does not exist` | ❌ **What happened:** I couldn't find a table matching your question. 💡 **Try this:** Type `@` to see all available tables. |
| `connection refused` | ❌ **What happened:** I couldn't reach your database right now. 💡 **Try this:** Check if your database is connected using the sidebar. |
| `division by zero` | ❌ **What happened:** The calculation ran into an issue with your data. 💡 **Try this:** Rephrase your question or check if there are empty values. |
| `Rate limit exceeded` + fallback failed | ❌ **What happened:** All AI services are temporarily busy. 💡 **Try this:** Wait a moment and try again. |

### Where it's called

The Error Explainer wraps the **entire orchestrator pipeline**:

```python
# orchestrator.py
try:
    # ... entire 10-step pipeline ...
except ValueError as e:
    friendly = await explain_error(user_query, str(e))
    yield {"event": "error", "data": {"message": friendly}}
except RuntimeError as e:
    friendly = await explain_error(user_query, str(e))
    yield {"event": "error", "data": {"message": friendly}}
except Exception as e:
    friendly = await explain_error(user_query, str(e))
    yield {"event": "error", "data": {"message": friendly}}
```

Every possible failure path is caught and converted to a friendly message. Users **never** see raw Python errors.

---

## How All Three Layers Work Together

```
User asks: "Show me student grades"
         │
         ▼
[Layer 1] Router Agent → Groq fails (rate limit)
                        → GitHub Models Phi-4 takes over → intent: "sql" ✅
         │
         ▼
[Normal] SQL Agent → generates query → QA approves
         │
         ▼
[Layer 2] Executor → DB error: wrong table name
                   → Auto-retry: SQL Agent rewrites → success ✅
         │
         ▼
[Normal] Visualizer → picks charts → Analyst writes analysis → Refiner formats
         │
         ▼
[Layer 3] If ANYTHING in the above fails completely:
         → Error Explainer catches the error
         → User sees: "I had trouble with your question. Try rephrasing or type @ to pick a table."
```

### Summary

| Layer | Handles | Mechanism | User Experience |
|---|---|---|---|
| **Fallback Client** | Groq rate-limits / outages | Automatic switch to GitHub Models (Phi-4 or gpt-4o-mini) | Seamless — slightly slower |
| **Auto-Retry Engine** | SQL execution failures | AI rewrites query based on DB error, re-executes (up to 2x) | Transparent — shown in Thinking Panel |
| **Error Explainer** | All unrecoverable failures | AI translates error to plain English with a suggestion | Friendly message — never raw errors |

---

## Testing Resilience

To test the fallback system during your demo:

1. **Test GitHub Models fallback:** Temporarily set `GROQ_API_KEY=""` in `.env` and restart. All Groq agents will fail over to GitHub Models.
2. **Test auto-retry:** Ask about a table that doesn't exist by its common name (the SQL Agent will guess wrong, then self-correct from the schema).
3. **Test Error Explainer:** Disconnect the database (remove `TARGET_DB_URL`) and ask a data question — you'll see the friendly error message.

---

*Related: See [02-agent-roles.md](./02-agent-roles.md) for what each agent does.*  
*Related: See [04-data-flow.md](./04-data-flow.md) for the full pipeline timeline.*
