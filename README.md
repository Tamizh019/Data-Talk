# Data-Talk AI

An enterprise-grade Conversational AI platform that allows non-technical users to chat with their Postgres databases in natural English. It automatically generates SQL, executes read-only queries securely, and renders beautiful interactive data visualizations.

![](frontend/public/placeholder.png) 

## Key Features

- **Text-to-SQL Engine**: Powered by Google Gemini. Converts natural language questions directly into optimized PostgreSQL queries.
- **Auto-Visualization**: Intelligently analyzes numeric and categorical query results to instantly render the perfect chart (Bar, Line, Area, Scatter, Pie).
- **Interactive UI**: Premium Z.ai-inspired dark theme built with Next.js, Shadcn UI, and Tailwind.
- **Enterprise Security**: Strict read-only database execution (`postgresql_readonly`, `SELECT`/`WITH` parsing) to prevent any mutation of data.
- **Chat Persistence**: Full chat history and state saved directly to standard browser `localStorage` for privacy and speed.
- **Self-Correcting LLM Loop**: If a generated SQL query fails syntax execution, the AI gets the error context and auto-corrects the query.

---

## Architecture Stack

### Frontend (User Interface)
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **Visualizations**: `react-plotly.js` (Fully interactive with zoom, pan, hover, and PNG export)

### Backend (API & AI Agent)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python, Async)
- **LLM/AI**: [Google Gemini Pro / Flash](https://aistudio.google.com/) via `google-generativeai`
- **Database Driver**: SQLAlchemy + `asyncpg`

---

## Quick Start Guide

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Google Gemini API Key ([get one here](https://aistudio.google.com/))
- A PostgreSQL Database (to act as your target data)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
```

**Configure Environment Variables:**
Copy `.env.example` to `.env` and fill in your Gemini Key and PostgreSQL Database URL:
```bash
cp .env.example .env
```
*(Open `.env` and configure `GEMINI_API_KEY` and `TARGET_DB_URL`)*

**Run the Backend Server:**
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the Dashboard
Navigate to **http://localhost:3000** in your browser. Start chatting with your database!

---

## Security Posture

Because LLMs can hallucinate malicious queries (e.g. `DROP TABLE`), Data-Talk implements a rigorous multi-layer security model before query execution:
1. **Application Layer**: `sql_executor.py` injects a hard limit (`LIMIT 1000`) into every query to prevent memory saturation.
2. **Lexical Layer**: Hardcoded regex blocklists rejecting any query not starting with `SELECT` or `WITH`.
3. **Database Layer**: SQLAlchemy establishes the `asyncpg` engine explicitly using `execution_options={"postgresql_readonly": True}`, making it completely impossible for the DB connection to modify schema or write data.

---

## Team
- **Frontend Development**: Kubendiran, Sravya
- **Backend & AI Logic**: Divya, Rishitha, Ramya, Tamizharasan
- **Database Management**: Abhilesha, Goel

---

## License
This project is for educational and portfolio purposes.
