# 📈 Visualization Pipeline — How Charts Are Built

> This file walks through **exactly** what happens from the moment results come back from the database to the moment charts appear on screen.  
> No deep code knowledge needed — this is written for everyone.

---

## Two Visualization Paths

Data-Talk supports two distinct data paths. Which one runs depends on what the user did:

| Path | Triggered When | Agent Used |
|---|---|---|
| **SQL Visualization** | User asks a question about a *connected database* | `visualizer_agent.py` |
| **Document Visualization** | User uploads a *file* (PDF, resume, report, etc.) | `doc_visualizer_agent.py` |

Both paths produce the same final output format — a list of typed visualization blocks that the frontend renders as interactive Plotly.js charts.

---

## Path A: SQL Visualization (Database Query)

### ✅ Step 1 — SQL Runs, Data Returns

The database returns raw rows for example for:  
*"Show me the count of students grouped by role and gender"*

| role | gender | count |
|---|---|---|
| Student | Male | 412 |
| Student | Female | 318 |
| Faculty | Male | 45 |
| Faculty | Female | 32 |
| Staff | Male | 28 |
| Staff | Female | 19 |

This is just a plain table. No charts yet.

---

### ✅ Step 2 — Column Statistics Are Computed

Before calling any AI, the system **analyzes each column** automatically in Python:

```
role   → categorical | 3 unique values: ['Student', 'Faculty', 'Staff']
gender → categorical | 2 unique values: ['Male', 'Female']
count  → numeric     | min: 19, max: 412, avg: 142.3
```

This analysis is fast (no AI needed) and tells the Visualizer what kind of data it's working with.

---

### ✅ Step 3 — The Visualizer Prompt Is Built

A detailed prompt is assembled and sent to **Gemini 3 Flash** (`models/gemini-3-flash-preview`). It contains:

1. The user's original question  
2. The column analysis from Step 2  
3. A sample of the actual data (up to 20 rows)  
4. Instructions on what chart types are available and the required output schema

The SQL Agent is also instructed to always return **flat relational data** (standard rows and columns). This is enforced deliberately — no JSON aggregation functions (`json_agg`, `json_build_object`) are allowed in generated SQL, because our multi-renderer pipeline requires a clean tabular format.

---

### ✅ Step 4 — Gemini Decides What Charts to Use

Gemini reads the prompt and chooses the best chart types. For this example:

| Chart | Why chosen |
|---|---|
| **KPI Cards** | Show totals at a glance |
| **Stacked Bar** | Role on X-axis, bars split by gender — shows both dimensions |
| **Pie/Donut** | Overall gender split (Male vs Female) across all roles |
| **Data Table** | Full raw tabular view for users who want to see the exact numbers |

---

### ✅ Step 5 — Gemini Returns a Typed Block Array (Not Images!)

**No image files are created.** Gemini returns a JSON array of **typed visualization blocks**. Each block has a `library` field that tells the frontend *how* to render it:

```json
[
  {
    "library": "kpi",
    "title": "Total Students",
    "value": 730,
    "formatted_value": "730",
    "delta": "+8%",
    "delta_direction": "up"
  },
  {
    "library": "plotly",
    "title": "Count by Role & Gender",
    "config": {
      "data": [
        { "x": ["Student", "Faculty", "Staff"], "y": [412, 45, 28], "name": "Male", "type": "bar" },
        { "x": ["Student", "Faculty", "Staff"], "y": [318, 32, 19], "name": "Female", "type": "bar" }
      ],
      "layout": { "barmode": "stack", "title": "Count by Role & Gender" }
    }
  },
  {
    "library": "table",
    "title": "Raw Data",
    "columns": ["role", "gender", "count"],
    "rows": [["Student", "Male", 412], ["Student", "Female", 318], "..."]
  }
]
```

The three possible `library` values:
| `library` value | Rendered As |
|---|---|
| `"kpi"` | A `KpiCard` component (large number badge with delta arrow) |
| `"plotly"` | A `ChartRenderer` → `react-plotly.js` interactive chart |
| `"table"` | A `DataTable` component with sorting and pagination |

---

### ✅ Step 6 — Dynamic Dispatch on the Frontend

The frontend receives the typed block array and uses the **Dashboard Studio** to route each block to the correct React component:

```
Block { library: "kpi"    } → <KpiCard />
Block { library: "plotly"  } → <ChartRenderer /> (Plotly.js via react-plotly.js)
Block { library: "table"  } → <DataTable />
```

Each chart is wrapped in a `<ChartCard />` component that provides:
- **Chart type switching** — click to change between 23+ Plotly chart types
- **Export options** — download as interactive HTML or static SVG
- **Cross-filtering** — click any data point to filter all other charts
- **Drill-down** — click to see detailed data in a drawer
- **Full-screen mode** — expand any chart to fill the viewport

This means the backend is fully in control of what gets rendered — no hardcoded layout on the frontend. If Gemini decides the answer is *only* a table, that's all the user sees. If it picks 2 KPIs and 2 charts, all 4 appear.

---

## Path B: Document Visualization (File Upload)

When a user uploads a **PDF, resume, report, or any text document**, the `DocVisualizerAgent` runs instead. It uses a **2-phase approach** specifically designed for unstructured documents:

### Phase 1 — Extract Structured Data

The raw document text is sent to Gemini with a prompt that says:  
*"Read this document and extract the most chart-worthy data into a structured JSON object."*

Gemini automatically detects the document type and extracts relevant info:

**For a Resume/CV:**
```json
{
  "doc_type": "resume",
  "person_or_entity": "John Doe",
  "role": "Full Stack Developer",
  "skills_by_category": { "Languages": ["Python", "JavaScript"], "AI/ML": ["LangChain", "FAISS"] },
  "projects": [{ "name": "Data-Talk", "tech": ["FastAPI", "Next.js"], "year": 2025 }],
  "education": [{ "degree": "B.E. CSE", "institution": "XYZ University", "cgpa": 8.2 }]
}
```

**For a Financial Report:**
```json
{
  "doc_type": "financial",
  "kpis": [{ "label": "Revenue", "value": 1200000, "unit": "USD" }],
  "monthly_trend": [{ "month": "Jan", "revenue": 100000, "expenses": 80000 }]
}
```

### Phase 2 — Generate Charts from Structured Data

The clean structured JSON from Phase 1 is then passed back to Gemini with a visualization prompt. Gemini generates 3-4 Plotly dashboard configs tailored to the document type.

**For a Resume:** Radar chart of skill categories, bar chart of project count by year, pie chart of technology usage.  
**For a Financial Report:** Line chart of monthly trends, KPI cards for key numbers, bar chart for segment breakdown.

### Why Two Phases?

Raw document text is messy and unstructured — just passing it directly to a chart generator would produce poor results. The two-phase approach ensures:
1. Data is **clean and structured** before any chart decision is made
2. The chart generator works with **facts**, not prose

---

## Summary Diagram

```
User Question (Database)             User Upload (Document)
        │                                     │
        ▼                                     ▼
SQL → DB returns flat rows          Phase 1: Extract structured JSON
        │                                     │
        ▼                                     ▼
Python computes column stats        Phase 2: Generate chart configs
        │                                     │
        ▼                                     ▼
Gemini Visualizer Agent ──────────────────────┘
Picks chart types & builds typed block array
[{ library: "kpi" }, { library: "plotly" }, { library: "table" }]
        │
        ▼
Frontend Dashboard Studio
<KpiCard /> — <ChartRenderer (Plotly.js) /> — <DataTable />
        │
        ▼
Interactive dashboard rendered 🎉
(with cross-filtering, drill-down, export, type switching)
```

---

## Common Questions

**Q: What if the data doesn't suit charts?**  
A: Gemini defaults to a `table` block. The user always gets something useful — never a blank screen.

**Q: What's the maximum number of visualizations per response?**  
A: The agent targets 3–4 blocks per query. Running more than that clutters the dashboard and slows the response.

**Q: Are charts saved?**  
A: Yes. The full result (including chart configs) is cached in Redis. The same question returns instantly on repeat, with no AI calls at all.

**Q: Why not use one AI for everything?**  
A: Each model is chosen for what it does best. Groq handles fast routing decisions (~200ms). Gemini 3.1 Pro writes the most accurate SQL. Gemini 3 Flash is best at open-ended creative generation like chart selection. Groq Llama 3.3 70B does best at data analysis and SQL review.

**Q: Can users change the chart type?**  
A: Yes! Each chart card has a type switcher. Users can click to change between 23+ Plotly chart types (bar → line → scatter → bubble → etc.) without re-querying.

---

*Next: See [04-data-flow.md](./04-data-flow.md) for a full request traced from login to final result.*
