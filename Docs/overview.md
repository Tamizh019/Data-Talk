# Data-Talk MVP Project Document

## 1. Project Overview

**Project Name:** Data-Talk – AI for Database Systems  
**Frontend:** Next.js 
**Backend:** Python (FastAPI)  
**Primary Goal:** Enable users to ask database questions in natural language and receive safe, explainable, query-backed answers without writing SQL manually.

This MVP is designed so the user does **not** configure database connections manually. All database access, schema loading, retrieval, SQL generation, and query safety checks happen internally inside the backend.

---

## 2. Core Objectives

The system should:
- support secure user login
- allow authenticated users to start a query session
- accept natural language questions
- understand schema context automatically
- retrieve relevant business/schema knowledge internally
- generate SQL automatically
- validate SQL before execution
- execute only safe read-only queries
- retry with self-correction when queries fail
- return results, explanation, and chart recommendation
- store session history and query logs

---

## 3. MVP Scope

### In Scope
- user authentication
- session creation
- natural language to SQL flow
- schema-aware querying
- SQL validation and safe execution
- self-correction retry
- session history
- result explanation
- visualization recommendation
- audit logging

### Out of Scope for First MVP
- user-managed database connection setup
- multi-tenant database onboarding UI
- role-based admin dashboard
- advanced chart builder UI
- file upload for schema documents by user
- model switching in UI
- complex analytics dashboards

---

## 4. User Roles

### 4.1 End User
Can:
- register
- log in
- start a session
- ask questions in natural language
- view query results
- view session history

### 4.2 Internal System
Handles automatically:
- database connection usage
- schema loading
- schema refresh
- knowledge retrieval
- SQL generation
- SQL validation
- SQL correction
- query execution
- token/cost logging

---

## 5. Technology Stack

### Frontend
- **Next.js 14+** (App Router, TypeScript)
- **Shadcn/UI** — component library (Card, Input, Badge, ScrollArea)
- **Tailwind CSS v4** — styling
- **Plotly.js + react-plotly.js** — auto-visualization
- **react-markdown + remark-gfm** — markdown rendering for AI responses
- **lucide-react** — icons

### Backend
- **Python FastAPI** — async REST API + SSE streaming
- **Pydantic v2 + pydantic-settings** — validation and config
- **SQLAlchemy (async)** — read-only PostgreSQL execution
- **asyncpg** — async PostgreSQL driver
- **JWT (python-jose)** — authentication
- **Passlib + bcrypt** — password hashing
- **Alembic** — database migrations
- **PostgreSQL** — application database (users, sessions, query logs)

### AI / Orchestration
- **Google Gemini Pro** (`gemini-2.5-pro`) — conversation and result explanation
- **SQLCoder-7B via OpenRouter API** — SQL generation from natural language
- **LlamaIndex** — RAG orchestration, schema indexing, retrieval
- **Qdrant** — vector store for schema embeddings (Dockerized)
- **BAAI/bge-large-en-v1.5** — local HuggingFace embedding model

### Infrastructure
- **Redis** — query result caching
- **Celery** — background tasks (heavy/long-running queries)
- **Docker + docker-compose** — Qdrant, Redis, PostgreSQL orchestration

---

## 6. High-Level System Architecture

```text
+----------------------+
|     React Frontend   |
| Login / Chat / Table |
+----------+-----------+
           |
           v
+----------------------+
|    FastAPI Backend   |
|  REST API + JWT Auth |
+----------+-----------+
           |
           v
+----------------------+
|   Query Orchestrator |
+----+----+----+-------+
     |    |    |
     |    |    +---------------------+
     |    |                          |
     v    v                          v
+---------+---------+      +----------------------+
| Prompt Safety     |      | Schema Metadata      |
| Injection Guard   |      | Loader / Cache       |
+---------+---------+      +----------------------+
          |                           |
          +------------+--------------+
                       |
                       v
             +----------------------+
             | RAG Retrieval        |
             | Glossary / Examples  |
             +----------+-----------+
                        |
                        v
             +----------------------+
             | SQL Generation       |
             | LLM-based            |
             +----------+-----------+
                        |
                        v
             +----------------------+
             | SQL Validation       |
             +----+------------+----+
                  |            |
                  | valid      | invalid/fail
                  v            v
           +-------------+   +------------------+
           | SQL Execute |   | Self-Correction  |
           +------+------+   +--------+---------+
                  |                   |
                  +-------retry-------+
                          |
                          v
             +----------------------+
             | Visualization Engine |
             +----------+-----------+
                        |
                        v
             +----------------------+
             | Session / Audit Log  |
             +----------------------+
```

---

## 7. End-to-End User Flow

### 7.1 Authentication Flow
1. User registers an account.
2. User logs in with email and password.
3. Backend validates credentials.
4. JWT access token is issued.
5. Frontend stores token securely and attaches it to protected API calls.

### 7.2 Query Flow
1. User creates a session.
2. User enters a question in natural language.
3. Frontend sends the question to backend.
4. Backend performs prompt safety check.
5. Backend loads schema metadata automatically.
6. Backend retrieves related glossary/schema examples.
7. Backend generates SQL.
8. Backend validates SQL.
9. Backend executes SQL safely.
10. If query fails, backend retries using self-correction.
11. Backend returns rows, explanation, and chart suggestion.
12. Session history and logs are stored.

---

## 8. Public API Design (MVP)

### 8.1 Authentication APIs

#### `POST /api/v1/auth/register`
**Purpose:** Register a new user.

##### Request
```json
{
  "name": "Biju",
  "email": "biju@example.com",
  "password": "StrongPass@123"
}
```

##### Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "usr_001",
    "name": "Biju",
    "email": "biju@example.com"
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

#### `POST /api/v1/auth/login`
**Purpose:** Authenticate user and return JWT token.

##### Request
```json
{
  "email": "biju@example.com",
  "password": "StrongPass@123"
}
```

##### Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-access-token",
    "tokenType": "Bearer",
    "user": {
      "userId": "usr_001",
      "name": "Biju",
      "email": "biju@example.com"
    }
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

#### `GET /api/v1/auth/me`
**Purpose:** Return authenticated user details.

##### Response
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "userId": "usr_001",
    "name": "Biju",
    "email": "biju@example.com"
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

### 8.2 Session APIs

#### `POST /api/v1/sessions`
**Purpose:** Create a new query session.

##### Request
```json
{
  "title": "Revenue Analysis"
}
```

##### Response
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "sessionId": "sess_001",
    "title": "Revenue Analysis"
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

#### `GET /api/v1/sessions/{sessionId}/history`
**Purpose:** Fetch previous conversation/query history.

##### Response
```json
{
  "success": true,
  "message": "Session history fetched successfully",
  "data": {
    "sessionId": "sess_001",
    "messages": [
      {
        "role": "USER",
        "content": "Show monthly revenue by region"
      },
      {
        "role": "ASSISTANT",
        "content": "Here is the monthly revenue by region.",
        "sql": "SELECT ..."
      }
    ]
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

### 8.3 Query APIs

#### `POST /api/v1/query/ask`
**Purpose:** Main end-to-end question API.

##### Request
```json
{
  "sessionId": "sess_001",
  "question": "Show monthly revenue by region for the last 6 months"
}
```

##### Response
```json
{
  "success": true,
  "message": "Query processed successfully",
  "data": {
    "queryId": "qry_001",
    "question": "Show monthly revenue by region for the last 6 months",
    "sql": "SELECT DATE_TRUNC('month', order_date) AS month, region, SUM(amount) AS revenue FROM orders WHERE order_date >= CURRENT_DATE - INTERVAL '6 months' GROUP BY 1, 2 ORDER BY 1;",
    "results": {
      "columns": ["month", "region", "revenue"],
      "rows": [
        ["2025-10-01", "North", 12000],
        ["2025-10-01", "South", 15000]
      ],
      "rowCount": 2
    },
    "visualization": {
      "recommendedChart": "LINE",
      "xAxis": "month",
      "yAxis": "revenue",
      "series": "region"
    },
    "explanation": "This query shows monthly revenue grouped by region for the last 6 months."
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

#### `POST /api/v1/query/explain`
**Purpose:** Explain SQL or result in simple language.

##### Request
```json
{
  "sql": "SELECT region, SUM(amount) AS revenue FROM orders GROUP BY region;"
}
```

##### Response
```json
{
  "success": true,
  "message": "SQL explanation generated successfully",
  "data": {
    "explanation": "This query groups orders by region and calculates total revenue for each region."
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

#### `GET /api/v1/query/{queryId}/result`
**Purpose:** Fetch previously stored query result.

##### Response
```json
{
  "success": true,
  "message": "Query result fetched successfully",
  "data": {
    "queryId": "qry_001",
    "question": "Show top 10 customers by revenue",
    "sql": "SELECT ...",
    "results": {
      "columns": ["customer_name", "revenue"],
      "rows": [
        ["A Corp", 120000],
        ["B Corp", 98000]
      ]
    }
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

### 8.4 Metadata API

#### `GET /api/v1/meta/supported-questions`
**Purpose:** Return example prompts for frontend guidance.

##### Response
```json
{
  "success": true,
  "message": "Supported question patterns fetched successfully",
  "data": {
    "examples": [
      "Show monthly sales by region",
      "List top 10 customers by revenue",
      "Compare quarterly profit by department",
      "Show daily order count for the last 30 days"
    ]
  },
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

## 9. Internal Services

These services are backend-internal and not directly exposed to the frontend.

### 9.1 PromptSafetyService
Checks whether the user request tries to bypass safety or access restricted data.

### 9.2 SchemaMetadataService
Loads schema metadata from internal database sources and keeps it cached.

### 9.3 RagRetrievalService
Retrieves related glossary terms, schema notes, and example queries.

### 9.4 SqlGenerationService
Converts natural language into SQL using LLMs.

### 9.5 SqlValidationService
Ensures SQL is safe, read-only, limited, and valid.

### 9.6 SqlExecutionService
Executes validated SQL and formats database rows.

### 9.7 SqlCorrectionService
Retries failed SQL generation using schema context and error message.

### 9.8 VisualizationService
Suggests chart type and axes using query result metadata.

### 9.9 QueryAuditService
Stores logs, execution metrics, retry counts, and token usage.

---

## 10. Suggested Backend Project Structure (FastAPI)

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── sessions.py
│   │       ├── query.py
│   │       └── meta.py
│   ├── core/
│   │       ├── config.py
│   │       ├── security.py
│   │       ├── database.py
│   │       └── jwt_handler.py
│   ├── models/
│   │       ├── user.py
│   │       ├── session.py
│   │       ├── session_message.py
│   │       ├── query_log.py
│   │       ├── schema_cache.py
│   │       └── knowledge_chunk.py
│   ├── schemas/
│   │       ├── auth_schema.py
│   │       ├── session_schema.py
│   │       ├── query_schema.py
│   │       ├── common_schema.py
│   │       └── meta_schema.py
│   ├── services/
│   │       ├── auth_service.py
│   │       ├── session_service.py
│   │       ├── prompt_safety_service.py
│   │       ├── schema_metadata_service.py
│   │       ├── rag_retrieval_service.py
│   │       ├── sql_generation_service.py
│   │       ├── sql_validation_service.py
│   │       ├── sql_execution_service.py
│   │       ├── sql_correction_service.py
│   │       ├── visualization_service.py
│   │       └── query_audit_service.py
│   ├── orchestrators/
│   │       └── query_orchestrator.py
│   ├── repositories/
│   │       ├── user_repository.py
│   │       ├── session_repository.py
│   │       ├── query_log_repository.py
│   │       └── schema_repository.py
│   ├── utils/
│   │       ├── response_builder.py
│   │       ├── token_counter.py
│   │       └── time_utils.py
│   └── jobs/
│           ├── schema_refresh_job.py
│           └── knowledge_index_job.py
├── alembic/
├── requirements.txt
└── README.md
```

---

## 11. Actual Frontend Project Structure (Next.js 14+)

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with fonts and theme
│   │   ├── globals.css           # Tailwind v4 + Shadcn CSS vars
│   │   ├── page.tsx              # Redirect → /chat or /login
│   │   ├── chat/
│   │   │   └── page.tsx          # Main chat interface page
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── register/
│   │       └── page.tsx          # Register page
│   ├── components/
│   │   ├── ui/                   # Shadcn/UI primitives (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── Sidebar.tsx           # Dark nav with history + DB status
│   │   ├── ChatWindow.tsx        # Main chat with SSE streaming
│   │   ├── SQLDisplay.tsx        # Syntax-highlighted SQL + copy button
│   │   ├── ChartRenderer.tsx     # Plotly auto-visualization
│   │   └── MarkdownRenderer.tsx  # AI response markdown rendering
│   ├── lib/
│   │   ├── api.ts                # SSE streaming client
│   │   └── utils.ts              # Shadcn cn() helper
│   └── types/
│       └── react-plotly.d.ts     # Plotly type declarations
├── components.json               # Shadcn/UI config
└── package.json
```

---

## 12. Authentication Design

### 12.1 Registration
- user submits name, email, password
- backend hashes password using bcrypt/passlib
- user stored in `users` table

### 12.2 Login
- backend verifies credentials
- access token generated using JWT
- protected routes require bearer token

### 12.3 Protected APIs
The following endpoints require JWT:
- `GET /api/v1/auth/me`
- `POST /api/v1/sessions`
- `GET /api/v1/sessions/{sessionId}/history`
- `POST /api/v1/query/ask`
- `POST /api/v1/query/explain`
- `GET /api/v1/query/{queryId}/result`

---

## 13. Database Tables for MVP

### 13.1 `users`
```sql
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13.2 `sessions`
```sql
CREATE TABLE sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### 13.3 `session_messages`
```sql
CREATE TABLE session_messages (
    message_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sql_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

### 13.4 `query_logs`
```sql
CREATE TABLE query_logs (
    query_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50),
    question TEXT NOT NULL,
    generated_sql TEXT,
    final_sql TEXT,
    execution_status VARCHAR(30),
    error_message TEXT,
    execution_time_ms INT,
    token_input INT,
    token_output INT,
    estimated_cost DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

### 13.5 `schema_cache`
```sql
CREATE TABLE schema_cache (
    cache_id VARCHAR(50) PRIMARY KEY,
    schema_summary TEXT,
    schema_json TEXT,
    version_no INT,
    refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13.6 `knowledge_chunks`
```sql
CREATE TABLE knowledge_chunks (
    chunk_id VARCHAR(50) PRIMARY KEY,
    source_type VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 14. Standard API Response Structure

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "errors": [],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    {
      "code": "AUTH_ERROR",
      "field": "password",
      "detail": "Invalid email or password"
    }
  ],
  "timestamp": "2026-03-10T12:00:00Z"
}
```

---

## 15. Internal Automation Jobs

### 15.1 Schema Refresh Job
Runs automatically:
- on backend startup
- on schedule
- updates schema summary and relationships

### 15.2 Knowledge Index Job
Runs automatically:
- to load glossary or internal sample queries
- to create/update vector chunks

### 15.3 Query Safety Enforcement
Applied automatically before every execution:
- allow only `SELECT` / safe `WITH`
- block destructive SQL
- enforce timeout
- enforce row limit

---

## 16. Query Processing Logic

### Main Logic for `/api/v1/query/ask`
1. validate JWT
2. validate request body
3. load session context
4. run prompt safety check
5. load schema metadata
6. retrieve relevant knowledge chunks
7. generate SQL from NL question
8. validate SQL
9. execute SQL
10. if failed, run correction logic and retry
11. build explanation
12. build chart suggestion
13. store logs and messages
14. return final response

---

## 17. Frontend Screens

### 17.1 Login Page
Contains:
- email field
- password field
- login button
- link to register

### 17.2 Register Page
Contains:
- name field
- email field
- password field
- register button
- link to login

### 17.3 Dashboard Page
Contains:
- create session button
- session list
- sample supported questions

### 17.4 Session / Query Page
Contains:
- chat input
- user question history
- generated SQL block
- table result view
- explanation card
- chart preview

---

## 18. Security Considerations

- passwords must be hashed, never stored raw
- JWT tokens must be validated on protected routes
- SQL execution must use read-only credentials internally
- prompt injection patterns must be blocked
- dangerous SQL statements must be rejected
- sensitive tables should be blocked internally if needed
- audit logs should capture failures and retries

---

## 19. MVP Build Order

### Phase 1
- FastAPI project setup
- PostgreSQL setup (app DB: users, sessions, query_logs)
- auth register/login APIs
- JWT protection

### Phase 2
- session APIs
- session table and history storage

### Phase 3
- query orchestrator (`/api/v1/query/ask`)
- prompt safety service
- schema metadata loader (PostgreSQL → LlamaIndex → Qdrant)
- SQL generation via **OpenRouter → SQLCoder-7B**
- SQL validation (read-only guard)
- SQL execution (async SQLAlchemy)

### Phase 4
- self-correction retry loop
- Gemini Pro explanation service
- visualization recommendation (Plotly config)
- Redis caching
- Celery background tasks for heavy queries

### Phase 5
- **Next.js 14+** frontend integration
- Shadcn/UI login/register screens
- Chat page with SSE streaming
- Auto-chart rendering with Plotly

---

## 20. Final Minimal Public APIs

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/sessions
GET  /api/v1/sessions/{sessionId}/history
POST /api/v1/query/ask
POST /api/v1/query/explain
GET  /api/v1/query/{queryId}/result
GET  /api/v1/meta/supported-questions
```

---

## 21. Final Architecture (Actual Stack)

For this project, the clean MVP architecture is:
- **Next.js 14+** (App Router, TypeScript) for frontend — with Shadcn/UI and react-plotly.js
- **FastAPI** for backend — async, SSE streaming
- **PostgreSQL** for app data (users, sessions, query logs)
- **Qdrant** (Docker) for vector storage of schema embeddings
- **LlamaIndex** for RAG orchestration
- **Google Gemini Pro** for conversation and explanation
- **SQLCoder-7B via OpenRouter** for SQL generation
- **Redis** for response caching
- **JWT authentication** for user protection

This gives you a proper project structure, clear separation of concerns, and a production-grade demo-ready architecture.

---

## 22. Next Deliverables

After this project doc, the next recommended artifacts are:
1. FastAPI folder-by-folder implementation plan
2. React page-wise implementation plan
3. database ER diagram
4. API DTO definitions
5. backend sequence diagram for `/query/ask`

