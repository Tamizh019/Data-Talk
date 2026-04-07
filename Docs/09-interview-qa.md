# Data-Talk AI — Complete Interview & Viva Q&A with Answers

> **How to use this:** Every question has a direct answer written in conversational language — ideal for project defense, viva, or internship review. Read them role-by-role based on your area. Everyone must also prepare the **Common** and **Scenario** sections.

---

## 🔵 SECTION 1: Common Questions (Every Team Member Must Know)

---

**Q1. What is Data-Talk? Explain the project in one sentence.**
> Data-Talk is an AI-powered web application that lets any business user type a question in plain English and get back SQL query results, interactive charts, and an AI-written business analysis — without ever writing code.

---

**Q2. What problem does this solve that Excel or Tableau doesn't?**
> Excel and Tableau require the user to know the data model and manually build queries or dashboards. Data-Talk removes that barrier completely — a non-technical manager can ask "What are our top 5 products by sales?" and get back a fully rendered dashboard in seconds.

---

**Q3. What is RAG? Why RAG instead of fine-tuning?**
> RAG stands for Retrieval-Augmented Generation. Instead of fine-tuning an LLM (which is expensive, slow, and needs data retraining every time the schema changes), RAG retrieves the most relevant context at query time and injects it into the prompt. In our project the schema chunks are the retrieved context.

---

**Q4. Walk through the complete flow after a user types a question.**
> 1. Security guard checks for harmful content
> 2. Redis cache is checked — if HIT, return instantly
> 3. Router Agent classifies intent (sql / chat / doc_rag)
> 4. Schema Indexer retrieves the 3 most relevant schema chunks via vector similarity
> 5. SQL Developer Agent (Gemini) generates a PostgreSQL query
> 6. QA Critic Agent (Groq) validates/fixes the SQL
> 7. SQL is executed against the target database
> 8. Python Sandbox Agent checks if advanced computation is needed
> 9. Visualizer Agent (Gemini) generates 4–7 Plotly charts
> 10. Business Analyst Agent writes a structured text summary
> 11. Formatter Agent refines the text for the question type
> 12. Results are cached in Redis and streamed back to the UI

---

**Q5. How many agents are in the pipeline? Name them.**
> 9 agents: Router, SQL Developer, QA Critic, Python Sandbox, Visualizer, Business Analyst, Formatter/Refiner, Error Explainer, and the fallback Document QA agent for doc_rag intent.

---

**Q6. What are Server-Sent Events (SSE)? Why SSE over WebSockets?**
> SSE is a one-way streaming protocol where the server pushes data to the browser over a single HTTP connection. WebSockets are bidirectional — useful for chat apps. Since our data flows only server → client (AI results streaming out), SSE is simpler, lighter, and works naturally with HTTP/2 without the overhead of a WebSocket handshake.

---

**Q7. What is the role of an LLM in this project?**
> The LLMs are the reasoning engine — they translate natural language into SQL, critique that SQL for errors, generate chart configurations from column patterns, explain results in plain English, and classify user intent. The LLMs do NOT access the database directly; they only look at schema descriptions and data samples passed by the orchestrator.

---

**Q8. What are the three databases in this project?**
> 1. **Target Database** — the client's PostgreSQL database that holds business data (students, groceries, etc.). The AI queries this.
> 2. **System Database** — a Supabase PostgreSQL instance that stores embeddings (pgvector), conversation history, and auth data.
> 3. **Redis** — a cloud in-memory cache (Redislabs India) that stores query results for 1 hour for instant repeat responses.

---

**Q9. What happens if one agent fails mid-pipeline?**
> Each agent call is in a try/except block. If it fails, the Error Explainer Agent catches the exception and generates a user-friendly error message (no stack traces shown to the user). For SQL execution specifically, the system automatically retries up to 2 times with an AI auto-correction step.

---

**Q10. Who is the intended user?**
> A non-technical business manager or analyst who needs data insights but cannot write SQL. The entire output (charts, explanations, follow-up suggestions) is designed to be understood without any technical background.

---

**Q11. Why split into multiple agents instead of one big LLM call?**
> Separation of concerns and reliability. A single prompt that must generate SQL, validate it, create chart configs, and write analysis would be too long, too complex, and failures in one part would break everything. Each agent has one focused job, a dedicated model tuned for that task, and independent error handling.

---

**Q12. Why Next.js for the frontend?**
> Next.js provides server-side rendering (better SEO and initial load), API routes (can be used as lightweight BFF), and built-in routing. It also has excellent TypeScript support and the App Router for fine-grained caching control on the frontend.

---

**Q13. Why FastAPI over Flask or Django?**
> FastAPI is async-first (critical for streaming SSE and parallel agent calls), has automatic OpenAPI docs generation, and uses Pydantic for request/response validation. Flask is synchronous by default and Django is heavier than needed for a pure API backend.

---

**Q14. What is Pydantic?**
> Pydantic is a Python data validation library. In FastAPI, every request body is defined as a Pydantic `BaseModel`, which automatically validates incoming JSON, provides type checking, and generates OpenAPI schema documentation.

---

**Q15. What is async/await and why does it matter here?**
> `async` functions can be paused at `await` points without blocking the thread. For our app, this means while waiting for Groq's API to respond, the server can handle other incoming requests simultaneously. Without async, the server would freeze while an LLM thinks (which takes 5–15 seconds).

---

**Q16. How does the system handle concurrent users?**
> FastAPI runs on Uvicorn with async event loop handling. Each incoming request is a separate async coroutine. Multiple users can stream responses simultaneously without blocking each other because the `await` points release the event loop.

---

**Q17. Explain the Target Database vs System Database difference.**
> Target DB = the client's business data (e.g., student records). The AI reads this for analytics. System DB = our infrastructure database on Supabase that stores vector embeddings, user authentication records, and chat history. They are completely separate connections defined by `TARGET_DB_URL` and `SYSTEM_DB_URL` in the .env file.

---

**Q18. Can a user type `DROP TABLE students;` and break the database?**
> No. The Security Guard (`guard_prompt`) blocks typical injection patterns at the application layer before any agent runs. Additionally, the SQL Agent is instructed to ONLY generate SELECT/WITH statements. The SQL Executor also enforces this by checking `allowed_sql_prefixes = "SELECT,WITH"` — any other statement gets rejected at execution time.

---

**Q19. What is CORS and why do you configure it?**
> CORS (Cross-Origin Resource Sharing) is a security feature in browsers that blocks requests from a different domain than the server. Since our frontend runs on `localhost:3000` and backend on `localhost:8000`, without CORS configuration the browser would block all API calls. We whitelist the frontend URL in FastAPI's `CORSMiddleware`.

---

**Q20. What is the difference between JWT and session-based auth?**
> Session-based auth stores session data server-side and sends a session ID cookie. JWT (JSON Web Token) stores the user info encoded in a signed token on the client. We use Supabase which implements JWT — no server-side session storage needed, and the token carries the user identity verified by Supabase's secret key.

---

## 🎨 SECTION 2: Frontend Q&A

---

**Q21. What is useState vs useEffect?**
> `useState` stores a reactive value — when it changes, React re-renders the component. `useEffect` runs side effects (API calls, subscriptions, timers) after render. In `SQLDisplay.tsx`, `useState` tracks `explanation` and `showExplanation`; `useEffect` auto-fetches the explanation from the API when the `sql` prop changes.

---

**Q22. How does streaming work in ChatWindow.tsx?**
> The frontend opens an SSE connection to `/api/chat`. Each event arriving (`thinking_step`, `sql_generated`, `visualization`, `explanation`) is parsed and dispatched to update state. The UI updates incrementally — thinking steps appear first, then SQL block, then charts, then text — all before the full response is complete.

---

**Q23. What is `useRef` used for in the chat window?**
> `useRef` stores a value that persists across renders without causing a re-render when changed. We use it for the SSE connection object itself — we don't want changing the connection reference to trigger a re-render; we just need to be able to close it (`ref.current.close()`) on cleanup.

---

**Q24. What does `"use client"` mean in Next.js 14?**
> It marks a component as a Client Component, meaning it is rendered in the browser (not on the server). Components that use hooks (`useState`, `useEffect`) or browser APIs must be client components. Without this directive, Next.js tries to render them on the server and crashes.

---

**Q25. How does the SQL Explain auto-fetch work?**
> In `SQLDisplay.tsx`, a `useEffect` with `[sql]` dependency fires whenever a new SQL string prop is received. Inside, it immediately sets `isExplaining = true` and calls `explainSqlApi(sql)` which POSTs to `/api/explain-sql`. On response, it sets the `explanation` state which renders the panel automatically.

---

**Q26. What library powers the SQL syntax highlighting?**
> `react-syntax-highlighter` with the `oneDark` theme from Prism.js. It detects SQL keywords and applies colour coding per token type.

---

**Q27. Why Plotly.js over Chart.js?**
> Plotly.js supports 30+ chart types out of the box including specialised types like treemap, sunburst, sankey, violin, and waterfall. It has built-in interactivity (zoom, hover tooltips, pan) without extra configuration. Chart.js requires plugins for most of these. Since the AI generates chart configs automatically, Plotly's rich JSON-based config API is a perfect fit.

---

**Q28. What is a KPI card vs a Plotly chart in the response?**
> KPI cards have `library: "kpi"` and render as simple large-number metric tiles in the frontend (a custom React component). Plotly charts have `library: "plotly"` and are passed directly to the `Plot` component from `react-plotly.js`. The frontend checks the `library` field to decide which renderer to use.

---

**Q29. What happens if a query returns 0 as the result?**
> After the fix we applied: the Visualizer Agent now detects if all numeric values in a single-row result are zero or null and returns `null` (no charts). The frontend then renders no chart section, and the analyst's text message ("There are 0 distinct sub-categories") tells the full story.

---

**Q30. How is the Toggle (Explain ▲/▼) button implemented?**
> A `showExplanation` boolean state is toggled by the button's `onClick`. The explanation panel renders conditionally: `{showExplanation && (<div>...</div>)}`. The chevron icon switches between `ChevronUp` and `ChevronDown` based on the same state value.

---

**Q31. How does auth persist across browser refreshes?**
> Supabase stores the JWT token in `localStorage` on the browser. On page load, the `auth-context.tsx` calls `supabase.auth.getSession()` which reads the token from storage and restores the session without requiring a new login, as long as the token hasn't expired.

---

**Q32. How did you make it mobile responsive?**
> Using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to hide the Smart Filters panel on small screens, reducing padding on the chat header, ensuring the SQL display uses `overflow-x: auto` and `max-w-full` so it scrolls horizontally instead of breaking the layout.

---

## ⚙️ SECTION 3: Backend Q&A

---

**Q33. What is StreamingResponse in FastAPI?**
> `StreamingResponse` lets the server send data to the client incrementally as it becomes available, rather than waiting until the full response is ready. For our chat endpoint, this means the browser starts receiving "thinking step" events within milliseconds while the AI agents are still processing in the background.

---

**Q34. Why use a generator (`yield`) in the orchestrator?**
> `yield` turns `run_pipeline` into an async generator. Each time `yield` is called, one event dict is sent immediately to the SSE stream. This means the frontend receives each step's result the moment it is ready — not after all 9 agents complete. This is what powers the live "thinking" UI.

---

**Q35. What are thinking steps?**
> Before each agent runs, the orchestrator emits a `thinking_step` event with `status: "running"`. After the agent completes, it emits another `thinking_step` with `status: "done"` and the elapsed milliseconds. The frontend renders these as a collapsible timeline showing every step the AI took.

---

**Q36. How many SQL retry attempts are made on failure?**
> Up to 2 automatic retries (`max_retries = 2`). On each failure, the error message is passed back to the SQL Developer Agent as context, asking it to rewrite the query to fix the issue. A `retry` thinking step is emitted so the user can see the auto-correction happening live.

---

**Q37. What does the QA Agent do?**
> The QA Critic Agent (Groq Llama-3.3-70b) receives the generated SQL, the original schema, and the user question. It checks: does the SQL answer the question? Are the table/column names correct? Is there a logic error? If invalid, it either returns a corrected SQL or an explanation of what is wrong.

---

**Q38. How does Redis caching work end-to-end?**
> On every request, the orchestrator first generates an MD5 hash of the lowercased question and checks Redis for that key. If found (HIT), it immediately returns the cached payload (SQL + rows + charts + explanation) — skipping all 9 agents. If not found (MISS), the full pipeline runs and the result is stored in Redis with a 1-hour TTL before returning.

---

**Q39. What is stored in the Redis cache?**
> The complete result dictionary: `{ sql, rows, columns, charts, explanation }`. Everything — including the raw database rows, all Plotly chart configs, and the analyst's text — is serialized as JSON and stored in one Redis key.

---

**Q40. What happens if Redis is unreachable?**
> The `get_cached` and `set_cached` functions are both wrapped in try/except. If Redis is down, a WARNING is logged but the pipeline continues normally. The user gets their answer; they just don't benefit from caching speed. No app crash, no user-visible error.

---

**Q41. Why MD5 for cache keys?**
> Redis keys must be short strings. MD5 converts any length question into a compact 32-character hex string. It's deterministic (same input always produces same output) and extremely fast. We don't use it for security — just for key generation.

---

**Q42. What is `guard_prompt` and what does it block?**
> `guard_prompt` is a security function that checks the user's question against a blocklist of harmful patterns (like DROP, DELETE, TRUNCATE, or prompt injection strings). If matched, it raises a `ValueError` before any agent runs, and the Error Explainer converts it into a friendly message.

---

**Q43. Why is the SQL row limit 500 in the SQL prompt but 1000 in config?**
> The SQL Developer Agent is instructed to add `LIMIT 500` as a sane default for unbounded queries. The `max_query_rows = 1000` in config is the hard execution-level cap enforced by `sql_executor.py` regardless of what the AI generates. So there are two separate safety layers.

---

**Q44. What does `target_schema: public` mean?**
> PostgreSQL organizes tables into namespaces called schemas. `public` is the default schema. This config tells our schema indexer where to look for tables when scanning the client's database metadata.

---

**Q45. How does the `/api/explain-sql` endpoint work?**
> It accepts a POST request with `{ "sql": "SELECT ..." }`. Inside, it calls `explain_sql_query(sql)` from the analyst agent, which sends the SQL to Groq with a system prompt instructing it to explain the query in plain English using bullet points. The explanation is returned as `{ "explanation": "..." }`.

---

## 🗄️ SECTION 4: Database Q&A

---

**Q46. What is the difference between WHERE and HAVING?**
> `WHERE` filters rows before aggregation. `HAVING` filters groups after aggregation. Example: `WHERE age > 18` filters rows first. `HAVING AVG(cgpa) > 8.0` filters after `GROUP BY` calculates the average per group.

---

**Q47. What does GROUP BY do?**
> `GROUP BY` collapses multiple rows into one row per unique value of the grouped column. Example: `GROUP BY department` produces one row per department, which you can then aggregate (COUNT, AVG, SUM) per department.

---

**Q48. What is a LEFT JOIN vs INNER JOIN?**
> `INNER JOIN` only returns rows where a match exists in both tables. `LEFT JOIN` returns all rows from the left table, with NULLs for columns from the right table where no match exists. Used in the petrol dataset query to preserve all countries even if they don't appear in both years.

---

**Q49. What is `ILIKE` in PostgreSQL?**
> `ILIKE` is case-insensitive pattern matching. `WHERE main_category ILIKE '%grocer%'` matches "Grocery", "GROCERY", "grocer", etc. Regular `LIKE` is case-sensitive.

---

**Q50. What is an index in a database?**
> An index is a separate data structure (like a B-tree) that the database maintains to allow fast lookup of rows without scanning every row in the table. A query on an indexed column can be thousands of times faster than a full table scan on large datasets.

---

**Q51. What is pgvector?**
> `pgvector` is a PostgreSQL extension that adds a `vector` data type and enables efficient similarity search (ANN — Approximate Nearest Neighbor). We store schema chunk embeddings (high-dimensional float arrays) in pgvector and use cosine similarity to find the 3 most relevant chunks for each user question.

---

**Q52. What is an embedding?**
> An embedding is a list of numbers (e.g. 768 floats) that represents the meaning of a piece of text. Two texts with similar meanings have similar embeddings — their vectors are "close" in high-dimensional space. We use Google's embedding model to embed both schema chunks and user questions, then find the closest matches.

---

**Q53. What is cosine similarity?**
> Cosine similarity measures the angle between two vectors. A value of 1 means identical direction (same meaning), 0 means unrelated. We use it to rank schema chunks by how semantically similar they are to the user's question, then take the top 3.

---

**Q54. Why store embeddings in PostgreSQL instead of Pinecone?**
> Consolidation — our auth data, conversation history, and embeddings all live in one Supabase PostgreSQL instance. One less external service to manage, one less API key to maintain. For our scale (hundreds of schema chunks, not millions), pgvector performance is more than sufficient.

---

**Q55. What is Supabase?**
> Supabase is an open-source Firebase alternative built on PostgreSQL. We use it for three things: user authentication (Supabase Auth with JWT), conversation history storage (regular Postgres tables), and vector embeddings storage (pgvector extension).

---

**Q56. What is RLS in Supabase?**
> Row Level Security is a PostgreSQL feature that enforces access control at the row level. With RLS, a user can only read their own conversation rows — even if they directly query the database, they cannot see other users' data. Every SELECT/INSERT is automatically filtered by the user's identity.

---

**Q57. What is the `supabase_service_role_key`?**
> It is a master key that bypasses RLS. Our backend uses it for server-side operations (like syncing conversations on behalf of any user). It should NEVER be exposed to the frontend. The frontend uses the weaker `anon_key` which respects RLS policies.

---

**Q58. What does the Schema Indexer do?**
> `schema_indexer.py` reads the target database's metadata: all table names, column names, column types, distinct value counts, and value ranges. It chunks this into descriptive text paragraphs, embeds each chunk using Google's embedding model, and stores them in pgvector. At query time, the user's question is embedded and the 3 most relevant chunks are retrieved.

---

**Q59. What is `TO_CHAR()` in PostgreSQL and why use it?**
> `TO_CHAR(created_at, 'YYYY-MM-DD')` converts a timestamp column to a readable ISO date string. We do this because raw PostgreSQL timestamps include timezone info that can confuse the LLM. A clean string like "2023-06-15" is easier for the AI to reason about.

---

**Q60. Why is COUNT = 0 a special case?**
> When a query returns only a single row with value 0, generating a KPI showing "0" or a gauge pointing to zero is visually misleading and useless. The fixed visualizer now returns `null` in this case, letting only the AI's text explanation ("There are 0 results") communicate the answer cleanly.

---

## 🧠 SECTION 5: AI Workflow Q&A

---

**Q61. What is Groq?**
> Groq is an AI inference company that runs open-source LLMs (like Meta's Llama-3) on custom LPU (Language Processing Unit) hardware. Their API is compatible with OpenAI's format but is significantly faster and cheaper than OpenAI. We use Groq for 5 of the 9 agents.

---

**Q62. What does 70b mean in llama-3.3-70b?**
> 70 billion parameters. More parameters = more capacity to learn complex patterns = higher quality outputs. We use the 70b model for complex reasoning tasks (SQL validation, business analysis) and the smaller 8b model for simpler fast tasks (routing, formatting).

---

**Q63. What is temperature in an LLM? What does temperature=0 mean?**
> Temperature controls randomness in token selection. At 0, the model always picks the highest-probability next token — fully deterministic, as factual as possible, no creativity. At 1.0, lower-probability tokens are also sampled, producing more diverse and creative output. We set the Analyst Agent to temperature=0 to prevent hallucinating names from the database.

---

**Q64. What is max_tokens?**
> The maximum number of tokens (word-pieces) the model can generate in its response. If the generated answer would exceed this, it is cut off mid-sentence. We set 900 for the analyst (enough for full analysis) and 400 for SQL explanation (enough for 8 bullet points).

---

**Q65. What is a system prompt vs user prompt?**
> The system prompt is a persistent instruction given before any conversation to define the AI's role, rules, and output format. The user prompt is the actual input for that specific request. Example: System = "You are a senior analyst. Never invent data." User = "Explain this data: [table]"

---

**Q66. What is the Router Agent and what are its 3 intents?**
> The Router Agent reads the user question and classifies it as: `sql` (needs database query), `chat` (general conversation, no data needed), or `doc_rag` (question about uploaded documents). This routes the request to completely different pipelines, avoiding unnecessary agent calls.

---

**Q67. Why does the SQL Agent use Gemini but others use Groq?**
> SQL generation is the most complex single-step task — it requires deep understanding of a long schema context, multi-table joins, and precise syntax. Gemini 3.1 Pro has a longer context window and stronger structured output capability for this task. Groq's Llama-3 models are faster for the more conversational/analytical tasks.

---

**Q68. What does the Refiner/Formatter Agent do?**
> The Refiner takes the raw structured analysis from the Analyst Agent and reformats it to match the question type. A ranking question gets a numbered list. An aggregate question gets a highlight of the metric. A comparison gets a side-by-side format. This ensures the output style always matches what the user asked.

---

**Q69. What is the Python Sandbox Agent?**
> It checks if the user's question needs advanced computation beyond SQL — e.g., statistical hypothesis testing, regression, or clustering. If so, it generates and safely executes Python code (in a restricted environment) using the raw SQL result rows as input. For most queries it's a no-op.

---

**Q70. What is the Error Explainer Agent?**
> It is the catch-all final safety net. If any agent throws an exception, it is caught in the orchestrator's outer try/except, and the Error Explainer Agent receives the raw error message. It rewrites it as a friendly, non-technical message shown to the user instead of a scary stack trace.

---

**Q71. What is Phase 1 vs Phase 2 of the Visualizer Agent?**
> Phase 1 is fully programmatic (no LLM cost): it analyzes column types and detects data patterns (time series, correlation, ranking, proportions, distributions, aggregates) from the raw rows using Python logic. Phase 2 sends these detected patterns + data sample to Gemini to generate the actual Plotly chart configs matched to the detected patterns.

---

**Q72. Why did the analyst hallucinate names like "Aarav" and "Nithya"?**
> The old prompt sent data as a Python dict blob (`[{'name': 'rishitha', 'cgpa': 9.2}, ...]`) with `temperature=0.3`. The LLM could see the data but the format wasn't explicit enough, and the creativity from temperature=0.3 let it add fictional similar-sounding Indian names. 

---

**Q73. How was the hallucination fixed?**
> Two changes: (1) The data is now formatted as an explicit numbered table (`1. rishitha | 9.20`, etc.) making it impossible to confuse real vs invented names. (2) Temperature set to exactly 0 — no random token selection, only the most factually certain output. A hard rule was also added: "Copy names character-for-character from the data."

---

**Q74. What is the fallback client (`fallback_client.py`)?**
> When Groq returns a rate limit error (HTTP 429) or any other failure, the fallback client automatically resends the same messages to GitHub Models — Microsoft's Phi-4 for lightweight tasks (router, formatter) and OpenAI GPT-4o-mini for heavy tasks (analyst, QA). This is transparent to the user.

---

**Q75. What is GitHub Models?**
> GitHub Models is Microsoft's hosted LLM API exposed at `api.github.com/models/...` using the same OpenAI-compatible format. Access requires only a GitHub personal access token (the `GITHUB_TOKEN` in our .env). It provides free/cheap access to GPT-4o-mini and Phi-4.

---

**Q76. What is the DIVERSITY RULE in the Visualizer prompt?**
> It explicitly forbids using the same `chart_type` twice in one response. This forces Gemini to generate varied visualizations (e.g., KPI + donut + bar + scatter + gauge) rather than lazily returning multiple bar charts. The rule is: "NEVER use the same chart_type twice. Maximize variety."

---

**Q77. What are the 20+ chart types the visualizer can produce?**
> bar, horizontal_bar, grouped_bar, stacked_bar, line, area, scatter, bubble, pie, donut, sunburst, treemap, funnel, waterfall, sankey, histogram, box, violin, radar, gauge, heatmap, and KPI cards.

---

## 💡 SECTION 6: Scenario-Based Q&A

---

**Q78. The app crashes under heavy load. What do you check first?**
> 1. Check FastAPI logs for whether specific agent calls are timing out
> 2. Check Groq API rate limit headers — if 429 errors spike, the fallback isn't keeping up
> 3. Check Redis memory usage — if it's full, cache writes fail silently
> 4. Check database connection pool — if all connections are consumed, SQL execution blocks
> 5. Consider scaling with Gunicorn workers (`uvicorn --workers 4`)

---

**Q79. A user says "the charts are wrong." How do you debug?**
> 1. Check browser console for rendering errors (malformed Plotly config)
> 2. Check backend logs for the `[VisualizerAgent] Generated X charts` line and chart types
> 3. Reproduce the query and log the raw `rows` and `columns` being passed to the visualizer
> 4. Check if the data has enough rows (single-row zero case returns null)
> 5. Check if Gemini's JSON output was malformed and fell back to an empty list

---

**Q80. The Analyst gives fabricated names. What do you investigate?**
> 1. Check temperature — should be 0 for the analyst
> 2. Check if the data table is being formatted correctly in the prompt (numbered rows)
> 3. Check if the result is coming from Redis cache (old cached hallucinated answer)
> 4. If from cache, flush the specific key or wait for TTL to expire
> 5. Verify the model hasn't been swapped to a more "creative" one in config

---

**Q81. Redis goes down at 3am. What does the user experience?**
> Nothing visible. The `get_cached` call fails silently (logs a WARNING), the pipeline runs normally, and the `set_cached` call also fails silently. The user gets their answer — just slightly slower because caching is bypassed. Zero user-facing errors.

---

**Q82. Client database has 5 million rows. What do you change?**
> 1. Reduce `max_query_rows` in config and enforce stricter LIMIT in SQL prompt
> 2. Ensure critical columns (used in WHERE/JOIN/GROUP BY) have database indexes
> 3. Stream rows to the visualizer instead of loading all into memory
> 4. Add pagination to the frontend table display
> 5. Consider read replicas on the database for heavy analytics load

---

**Q83. A new table is added to the client's database. Does the AI know?**
> Not immediately. The Schema Indexer needs to re-run to detect, chunk, and embed the new table's metadata. We'd need to call the schema re-indexing endpoint (or implement a webhook that triggers re-indexing when schema changes are detected).

---

**Q84. A user asks a question in Tamil. Does the system handle it?**
> The router and analyst (Llama-3.3-70b and Gemini) can understand Tamil but the SQL generation specifically needs table/column names from the schema which are in English. Partially — the AI might understand the Tamil question and map it to English column names, but accuracy would degrade. Full multilingual support would require translating the question to English first.

---

**Q85. You need to add a 10th agent. What files do you touch?**
> 1. Create `backend/app/agents/new_agent.py` with the agent logic
> 2. Import it in `orchestrator.py`
> 3. Add `_step_start` + `_step_done` calls + `yield` at the appropriate pipeline position
> 4. If it has an API endpoint, add the route to `main.py`
> 5. Update `Docs/02-agent-roles.md` with the new agent's description

---

**Q86. The Visualizer generates a pie chart with 1 slice. Is that a bug?**
> Yes, it's specified as forbidden in the Visualizer system prompt: "Pie/donut with only 1 slice" is in the FORBIDDEN section. But the LLM might still generate one. The fix is a validation step in `valid_charts` that checks `len(trace['labels']) >= 2` before accepting a pie/donut chart.

---

## 📝 Quick-Answer Cheat Sheet

| Fact | Answer |
|---|---|
| Number of agents | 9 |
| Default SQL LIMIT | 500 |
| Max rows config | 1000 |
| Cache TTL | 1 hour (3600 seconds) |
| Cache key algorithm | MD5 |
| Redis location | Redislabs India (ap-south-1-2) |
| SQL Generator model | Gemini 3.1 Pro Preview |
| Visualizer model | Gemini Flash 3 |
| Analyst / QA model | Groq Llama-3.3-70b-versatile |
| Router / Refiner model | Groq Llama-3.1-8b-instant |
| Fallback heavy model | OpenAI GPT-4o-mini (GitHub Models) |
| Fallback light model | Microsoft Phi-4 (GitHub Models) |
| Auth provider | Supabase (JWT) |
| Vector store | pgvector on Supabase |
| Frontend framework | Next.js 14 (App Router) |
| Backend framework | FastAPI (Python, async) |
| Analyst temperature | 0 (deterministic — no creativity) |
| Max charts per query | 7 |
| Min charts (multi-row data) | 4 |
| Schema chunks per query | 3 (top-3 by cosine similarity) |
| Embedding model | Google text-embedding-0 |
| Cache key prefix | `datatalk:query:` |
| Conversation storage | Supabase `chat_conversations` table |
| Frontend port | 3000 |
| Backend port | 8000 |
