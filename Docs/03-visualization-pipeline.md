# 📈 Visualization Pipeline — How Charts Are Built

> This file walks through **exactly** what happens from the moment results come back from the database to the moment charts appear on screen.  
> No deep code knowledge needed — this is written for everyone.

---

## The Setup

When a user asks a data question, the database returns **raw rows** — just a table of numbers and text. The visualization pipeline's job is to turn that raw table into **meaningful, interactive charts**.

---

## Step-by-Step Walkthrough

### ✅ Step 1 — SQL Runs, Data Returns

The database returns something like this for the question:  
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

Before calling any AI, the system **analyzes each column** automatically:

```
role   → categorical | 3 unique values: ['Student', 'Faculty', 'Staff']
gender → categorical | 2 unique values: ['Male', 'Female']
count  → numeric     | min: 19, max: 412, avg: 142.3
```

This analysis is fast (done in Python, no AI needed) and tells the AI model what kind of data it's working with.

---

### ✅ Step 3 — The Visualizer Prompt Is Built

A detailed prompt is assembled and sent to **Gemini Pro**. It contains:

1. The user's original question  
2. The column analysis from Step 2  
3. A sample of the actual data (up to 20 rows)  
4. Instructions on what chart types are available

```
User's question: "Show me students grouped by role and gender"

Columns: ['role', 'gender', 'count']
Column Analysis:
  role   → categorical, 3 unique values
  gender → categorical, 2 unique values
  count  → numeric, min=19, max=412

Sample Data:
  [{'role': 'Student', 'gender': 'Male', 'count': 412}, ...]

Generate the best 3-4 ECharts configs for this data.
```

---

### ✅ Step 4 — Gemini Decides What Charts to Use

Gemini reads the prompt and chooses the best chart types. For this example:

| Chart | Why chosen |
|---|---|
| **KPI Cards** | Show totals at a glance (Total Students, Total Faculty, etc.) |
| **Stacked Bar** | Role on X-axis, bars split by gender — shows both dimensions |
| **Pie/Donut** | Overall gender split (Male vs Female) across all roles |

Gemini outputs a **JSON array** with one full chart config per visualization. Each config is a complete Apache ECharts `option` object.

---

### ✅ Step 5 — Gemini Returns JSON (Not Images!)

This is an important point: **no image files are created**.

Gemini returns raw JSON that looks like this (simplified):

```json
[
  {
    "chart_type": "kpi_card",
    "title": "Total Students",
    "value": 730,
    "formatted_value": "730",
    "delta": "+8%",
    "delta_direction": "up"
  },
  {
    "chart_type": "stacked_bar",
    "title": "Count by Role & Gender",
    "xAxis": { "data": ["Student", "Faculty", "Staff"] },
    "series": [
      { "name": "Male",   "data": [412, 45, 28] },
      { "name": "Female", "data": [318, 32, 19] }
    ]
  },
  {
    "chart_type": "pie",
    "title": "Overall Gender Split",
    "series": [{
      "data": [
        { "name": "Male",   "value": 485 },
        { "name": "Female", "value": 369 }
      ]
    }]
  }
]
```

---

### ✅ Step 6 — Backend Validates and Sends to Frontend

The backend does a quick sanity check:
- Is it a valid JSON array?
- Does each item have a `chart_type`?
- Are there max 4 charts?

Then it sends this array to the frontend via the API response.

---

### ✅ Step 7 — Frontend Renders the Charts

The frontend receives the JSON and uses **Apache ECharts**, a JavaScript charting library, to render each chart interactively.

```
JSON Config → ECharts Library → Interactive Chart in Browser
```

ECharts handles:
- Drawing the actual bars, pies, lines
- Hover tooltips
- Responsive resizing
- Animated entry effects

The frontend just passes the JSON directly to ECharts — no extra processing needed.

---

## Summary Diagram

```
User Question
     │
     ▼
Database runs SQL
Returns raw rows (table)
     │
     ▼
Python computes column stats
(categorical vs numeric, min/max/avg)
     │
     ▼
Build prompt → Send to Gemini Pro
     │
     ▼
Gemini returns JSON array
(3-4 ECharts config objects)
     │
     ▼
Backend validates JSON
Sends to frontend via API
     │
     ▼
Frontend gives JSON to ECharts
ECharts renders interactive charts 🎉
```

---

## Common Questions

**Q: What if the data doesn't suit charts?**  
A: Gemini still generates KPI cards or a simple table view. It never fails silently.

**Q: Can the user change the chart type?**  
A: Not in the current version. Future improvement planned.

**Q: Are charts saved?**  
A: Results (including chart configs) are cached using Redis for a short period, so the same question returns instantly on repeat.

**Q: Why Gemini for charts?**  
A: Gemini is very good at understanding *context* — it reads both the question AND the data structure to pick charts that actually make sense together, rather than just defaulting to a bar chart every time.

---

*Next: See [04-data-flow.md](./04-data-flow.md) for a full walkthrough of a single request from start to finish.*
