# 📡 API Reference — All Endpoints

> Complete reference for every HTTP endpoint in the Data-Talk backend.  
> Use this for frontend integration, testing, or demo walkthroughs.

---

## Base URL

```
Development:  http://localhost:8000
Production:   https://your-backend-domain.com
```

All endpoints are prefixed with `/api/` (except `/health`).

---

## Quick Summary

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/chat` | Main chat — streams the full 10-agent pipeline via SSE |
| `POST` | `/api/connect` | Connect to a new PostgreSQL database at runtime |
| `POST` | `/api/upload` | Upload a document (PDF, CSV, TXT, MD, JSON) for RAG |
| `GET` | `/api/schema` | Get the current database tables and columns |
| `GET` | `/api/schema/reindex` | Manually trigger schema re-indexing |
| `GET` | `/api/db-status` | Lightweight connection status check |
| `GET` | `/api/analytics` | Auto-generate dashboard analytics from connected DB |
| `GET` | `/api/conversations` | Fetch all conversations for the authenticated user |
| `POST` | `/api/conversations/sync` | Batch-upsert conversations to Supabase |
| `DELETE` | `/api/conversations/{id}` | Delete a single conversation |
| `GET` | `/health` | Healthcheck |

---

## 1. `POST /api/chat` — Main Chat (SSE Stream)

**The core endpoint.** Sends a user message through the entire 10-agent pipeline and streams results back in real-time via Server-Sent Events.

### Request

```json
POST /api/chat
Content-Type: application/json

{
  "session_id": "abc-123-def",
  "message": "Show me top 5 students by CGPA",
  "history": [
    { "role": "user", "content": "hi" },
    { "role": "model", "content": "Hello! ..." }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `session_id` | `string` | Yes | Unique session/conversation identifier |
| `message` | `string` | Yes | The user's question |
| `history` | `array` | No | Previous messages for context (role: `user` or `model`) |

### Response — SSE Event Stream

The response is `text/event-stream`. Each line is prefixed with `data: ` and contains a JSON object with an `event` field.

#### Event Types (in order of appearance)

**1. Thinking Steps** — Live pipeline progress (emitted throughout)
```json
data: {"event": "thinking_step", "id": "router", "type": "routing", "label": "Intent classification", "detail": "Analysing the question...", "status": "running"}
data: {"event": "thinking_step", "id": "router", "status": "done", "duration_ms": 187}
```

**2. Intent** — What the router decided
```json
data: {"event": "intent", "intent": "sql"}
```
Possible values: `sql`, `doc_rag`, `chat`

**3. SQL Generated** — The generated (or auto-corrected) SQL
```json
data: {"event": "sql_generated", "sql": "SELECT * FROM student_database ORDER BY cgpa DESC LIMIT 5;"}
```

**4. Query Result** — Raw data from the database
```json
data: {"event": "query_result", "rows": [...], "columns": ["name", "cgpa"], "sql_used": "SELECT ...", "attempts": 1, "row_count": 5}
```

**5. Visualization** — Plotly.js chart configurations
```json
data: {"event": "visualization", "charts": [
  {"library": "kpi", "title": "Top Student", "value": "Alice", "formatted_value": "CGPA: 9.8"},
  {"library": "plotly", "title": "Top Students by CGPA", "config": { ... }},
  {"library": "table", "title": "Full Data", "columns": [...], "rows": [...]}
]}
```

**6. Explanation** — The final formatted analysis
```json
data: {"event": "explanation", "text": "## Alice Leads at 9.8 CGPA — CS Department Dominates\n\n..."}
```

**7. Cached Result** — Returned if the question was already answered recently
```json
data: {"event": "cached_result", "sql": "...", "rows": [...], "columns": [...], "charts": [...], "explanation": "..."}
```

**8. Error** — Friendly error message (from Error Explainer Agent)
```json
data: {"event": "error", "message": "❌ **What happened:** I couldn't find a table matching your question.\n\n💡 **Try this:** Type @ to see all available tables."}
```

**9. Done** — Stream complete
```json
data: {"event": "done"}
```

---

## 2. `POST /api/connect` — Connect to Database

Dynamically connects to a new PostgreSQL database at runtime. Indexes the schema and generates starter question suggestions.

### Request

```json
POST /api/connect
Content-Type: application/json

{
  "db_url": "postgresql://user:password@host:5432/dbname"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `db_url` | `string` | Yes | PostgreSQL connection URL. Supports `postgresql://`, `postgres://`, and `mysql://` formats. The driver prefix (`+asyncpg`) is added automatically. |

### Supabase URLs
For Supabase databases with `?options=-csearch_path=schema_name`, the system automatically:
1. Extracts the target schema from the options parameter
2. Removes the `options` param (it crashes asyncpg)
3. Uses the extracted schema for all queries

### Success Response

```json
{
  "status": "connected",
  "message": "Database connected and schema indexed successfully",
  "suggestions": {
    "greeting": "This database contains student records and course enrollments.",
    "categories": [
      {
        "label": "Quick Overview",
        "icon": "📊",
        "questions": ["How many students are enrolled?", "What departments exist?"]
      },
      {
        "label": "Trends & Rankings",
        "icon": "📈",
        "questions": ["Top 10 students by CGPA?", "Which department has the most students?"]
      },
      {
        "label": "Deep Insights",
        "icon": "🔍",
        "questions": ["Is there a correlation between attendance and CGPA?", "Which courses have the lowest pass rate?"]
      }
    ]
  }
}
```

### Error Response (500)

```json
{
  "detail": "Connection failed: could not translate host name \"wrong-host\" to address"
}
```

---

## 3. `POST /api/upload` — Upload Document

Uploads a document file for Document RAG. The file is parsed, chunked, embedded, and stored in the vector index for future queries.

### Request

```
POST /api/upload
Content-Type: multipart/form-data

file: <binary file>
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `File` | Yes | Supported formats: `.txt`, `.csv`, `.pdf`, `.md`, `.json` |

### Success Response

```json
{
  "status": "success",
  "message": "Successfully indexed resume.pdf into knowledge base."
}
```

### Error Response (400)

```json
{
  "detail": "Only TXT, CSV, PDF, MD, and JSON files are supported."
}
```

---

## 4. `GET /api/schema` — Get Database Schema

Returns all tables and columns in the currently connected database.

### Response

```json
{
  "tables": [
    { "table": "student_database", "columns": "id (integer), name (text), cgpa (numeric), department (text)" },
    { "table": "courses", "columns": "id (integer), course_name (text), credits (integer)" }
  ]
}
```

---

## 5. `GET /api/schema/reindex` — Re-index Schema

Manually triggers schema re-indexing. Use this after you've changed the database structure (added/removed tables or columns).

### Response

```json
{
  "status": "Schema re-indexed successfully"
}
```

---

## 6. `GET /api/db-status` — Connection Status

Lightweight health check for the database connection. The frontend polls this on mount to show the connected/disconnected pill in the sidebar.

### Response

```json
{
  "connected": true
}
```

---

## 7. `GET /api/analytics` — Auto-Generated Analytics

Automatically generates dashboard analytics from the connected database. Inspects up to 5 tables, computes row counts, column averages, value distributions, and top records.

### Response

```json
{
  "analytics": [
    {
      "table": "student_database",
      "columns": ["id", "name", "cgpa", "department"],
      "kpis": [
        { "label": "Total Records", "value": 1200 },
        { "label": "Avg cgpa", "value": 7.42, "min": 2.1, "max": 9.8 }
      ],
      "distributions": [
        {
          "column": "department",
          "data": [
            { "department": "CS", "count": 340 },
            { "department": "ECE", "count": 210 }
          ]
        }
      ],
      "top_records": {
        "ranked_by": "cgpa",
        "columns": ["id", "name", "cgpa", "department"],
        "rows": [
          { "id": 1, "name": "Alice", "cgpa": 9.8, "department": "CS" }
        ]
      }
    }
  ]
}
```

---

## 8. Conversation Endpoints

All conversation endpoints require authentication via the `Authorization` header with a Supabase JWT token.

### `GET /api/conversations` — Fetch Conversations

Returns all conversations for the authenticated user, ordered by most recent.

**Headers:**
```
Authorization: Bearer <supabase-jwt-token>
```

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv-abc-123",
      "title": "Student CGPA Analysis",
      "messages": [
        { "role": "user", "content": "Show me top students" },
        { "role": "model", "content": "## Alice Leads at 9.8 CGPA..." }
      ],
      "updated_at": 1712345678000
    }
  ]
}
```

---

### `POST /api/conversations/sync` — Sync Conversations

Batch-upserts conversations for the authenticated user. Called by the frontend whenever a new message is sent or a chat is renamed.

**Headers:**
```
Authorization: Bearer <supabase-jwt-token>
```

**Request:**
```json
{
  "conversations": [
    {
      "id": "conv-abc-123",
      "title": "Student Analysis",
      "messages": [...],
      "updated_at": 1712345678000
    }
  ]
}
```

**Response:**
```json
{
  "status": "synced",
  "count": 1
}
```

---

### `DELETE /api/conversations/{conversation_id}` — Delete Conversation

Deletes a single conversation (only if it belongs to the authenticated user).

**Headers:**
```
Authorization: Bearer <supabase-jwt-token>
```

**Response:**
```json
{
  "status": "deleted"
}
```

---

## 9. `GET /health` — Healthcheck

Simple healthcheck endpoint. No authentication required.

### Response

```json
{
  "status": "ok",
  "service": "data-talk-api"
}
```

---

## CORS Configuration

The backend allows requests from:
- `http://localhost:3000` (local development)
- `http://127.0.0.1:3000` (local development)
- `https://datatalk-001.netlify.app` (production)
- Value of `FRONTEND_URL` env variable

---

## Error Handling

All endpoints return standard HTTP error codes:

| Code | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request (invalid input, unsupported file type) |
| `401` | Unauthorized (missing or invalid JWT for conversation endpoints) |
| `500` | Server error (connection failure, AI model error) |

For the `/api/chat` SSE stream, errors are delivered as an `error` event rather than HTTP status codes. This way the frontend always maintains the SSE connection and receives a friendly error message from the Error Explainer Agent.

---

*Related: See [04-data-flow.md](./04-data-flow.md) for the full pipeline that runs behind `/api/chat`.*  
*Related: See [07-fallback-and-resilience.md](./07-fallback-and-resilience.md) for how errors are handled gracefully.*
