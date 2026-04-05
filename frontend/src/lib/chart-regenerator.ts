/**
 * chart-regenerator.ts — Plotly.js Edition
 * Rebuilds Plotly config objects from filtered raw rows + chart metadata.
 * Powers live cross-filtering without re-querying the backend.
 */
import type { VisualizerBlock } from "@/components/ChartRenderer";

export type SupportedType =
    | "bar" | "horizontal_bar" | "grouped_bar" | "stacked_bar"
    | "line" | "area" | "scatter" | "bubble"
    | "pie" | "donut" | "sunburst"
    | "treemap" | "funnel" | "waterfall" | "sankey"
    | "histogram" | "box" | "violin"
    | "radar" | "gauge" | "heatmap"
    | "parallel_coordinates" | "candlestick";

// Brand palette
const PALETTE = ["#7C6FFF", "#00C9B1", "#FF6B6B", "#FFB347", "#4ECDC4", "#45B7D1", "#96CEB4", "#A855F7", "#F59E0B", "#EC4899"];

// ── Shared layout defaults ────────────────────────────────────────────────────
function baseLayout(overrides: Record<string, any> = {}): Record<string, any> {
    return {
        template: "plotly_dark",
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "Inter, system-ui, sans-serif", color: "#94a3b8", size: 12 },
        margin: { l: 50, r: 30, t: 30, b: 50 },
        colorway: PALETTE,
        hoverlabel: { bgcolor: "rgba(13,13,22,0.95)", bordercolor: "rgba(124,111,255,0.3)", font: { color: "#e2e8f0", size: 12 } },
        xaxis: { gridcolor: "rgba(255,255,255,0.04)", zerolinecolor: "rgba(255,255,255,0.08)" },
        yaxis: { gridcolor: "rgba(255,255,255,0.04)", zerolinecolor: "rgba(255,255,255,0.08)" },
        ...overrides,
    };
}

// ── Label truncation ────────────────────────────────────────────────────────
const MAX_LABEL = 22;
const truncate = (s: string) => (!s || s.length <= MAX_LABEL ? s : s.slice(0, MAX_LABEL - 1).trimEnd() + "…");

// ── Main export: regenerate a Plotly config from filtered rows ─────────────
export function regenerateChartOption(
    block: VisualizerBlock,
    filteredRows: Record<string, any>[],
    overrideType?: string
): Record<string, any> | null {
    const meta = block.meta;
    const chartType = (overrideType || block.chart_type || "bar") as SupportedType;

    if (!meta) return null;

    try {
        if (chartType === "pie" || chartType === "donut") return buildPie(meta, filteredRows, chartType);
        if (chartType === "sunburst") return buildSunburst(meta, filteredRows);
        if (chartType === "radar") return buildRadar(meta, filteredRows);
        if (chartType === "scatter") return buildScatter(meta, filteredRows);
        if (chartType === "bubble") return buildBubble(meta, filteredRows);
        if (chartType === "horizontal_bar") return buildHorizontalBar(meta, filteredRows);
        if (chartType === "grouped_bar") return buildGroupedBar(meta, filteredRows, "group");
        if (chartType === "stacked_bar") return buildGroupedBar(meta, filteredRows, "stack");
        if (chartType === "treemap") return buildTreemap(meta, filteredRows);
        if (chartType === "funnel") return buildFunnel(meta, filteredRows);
        if (chartType === "waterfall") return buildWaterfall(meta, filteredRows);
        if (chartType === "histogram") return buildHistogram(meta, filteredRows);
        if (chartType === "box") return buildBox(meta, filteredRows);
        if (chartType === "violin") return buildViolin(meta, filteredRows);
        if (chartType === "heatmap") return buildHeatmap(meta, filteredRows);
        if (chartType === "gauge") return buildGauge(meta, filteredRows);
        // Default: bar / line / area
        return buildXY(meta, filteredRows, chartType);
    } catch (e) {
        console.warn("[ChartRegen] Failed:", e);
        return null;
    }
}

// ── Bar / Line / Area ─────────────────────────────────────────────────────────
function buildXY(meta: any, rows: Record<string, any>[], type: string) {
    const xCol: string = meta.x_col;
    const yCols: string[] = meta.y_cols || [];

    let categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))];
    let _truncated = false;
    if (type === "bar" && categories.length > 15) {
        const catSums = categories.map(cat => ({
            cat,
            sum: yCols.reduce((acc, yCol) => acc + aggregate(rows.filter(r => String(r[xCol] ?? "") === cat), yCol, meta.agg || "sum"), 0),
        }));
        catSums.sort((a, b) => b.sum - a.sum);
        categories = catSums.slice(0, 15).map(c => c.cat);
        _truncated = true;
    }

    const isLine = type === "line" || type === "area";
    const traces = yCols.map((yCol, idx) => {
        const yData = categories.map(cat => aggregate(rows.filter(r => String(r[xCol] ?? "") === cat), yCol, meta.agg || "sum"));
        return {
            type: isLine ? "scatter" : "bar",
            name: yCol,
            x: categories.map(truncate),
            y: yData,
            ...(isLine ? {
                mode: "lines+markers" as const,
                line: { shape: "spline", width: 3, color: PALETTE[idx % PALETTE.length] },
                marker: { size: 6, color: PALETTE[idx % PALETTE.length] },
            } : {
                marker: { color: PALETTE[idx % PALETTE.length], line: { width: 0 } },
            }),
            ...(type === "area" ? { fill: "tozeroy", fillcolor: `${PALETTE[idx % PALETTE.length]}20` } : {}),
        };
    });

    return {
        _truncated,
        data: traces,
        layout: baseLayout({
            showlegend: yCols.length > 1,
            legend: { orientation: "h", yanchor: "bottom", y: 1.05 },
        }),
    };
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
function buildHorizontalBar(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col || meta.category_col;
    let yCol = (meta.y_cols || [])[0] || meta.value_col;

    // Auto-detect best numeric column if yCol is missing or produces only zeros
    if (!yCol || rows.every(r => Number(r[yCol]) === 0 || isNaN(Number(r[yCol])))) {
        const allCols = rows.length > 0 ? Object.keys(rows[0]) : [];
        yCol = allCols.find(col => col !== xCol && rows.some(r => !isNaN(Number(r[col])) && Number(r[col]) !== 0)) || yCol;
    }

    let categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))].filter(Boolean);
    let _truncated = false;

    if (categories.length > 15) {
        const catSums = categories.map(cat => ({
            cat,
            sum: aggregate(rows.filter(r => String(r[xCol] ?? "") === cat), yCol, meta.agg || "sum"),
        }));
        catSums.sort((a, b) => b.sum - a.sum);
        categories = catSums.slice(0, 15).reverse().map(c => c.cat);
        _truncated = true;
    } else {
        // Sort by value descending for visual clarity, then reverse so largest is at top
        const catSums = categories.map(cat => ({
            cat,
            sum: aggregate(rows.filter(r => String(r[xCol] ?? "") === cat), yCol, meta.agg || "sum"),
        }));
        catSums.sort((a, b) => a.sum - b.sum); // ascending so top of chart is largest
        categories = catSums.map(c => c.cat);
    }

    const values = categories.map(cat => aggregate(rows.filter(r => String(r[xCol] ?? "") === cat), yCol, meta.agg || "sum"));

    // Safety check — if every value is 0, skip rendering to avoid blank chart with wrong axis
    if (values.every(v => v === 0)) return null;

    return {
        _truncated,
        data: [{
            type: "bar",
            x: values,
            y: categories.map(truncate),
            orientation: "h",
            marker: { color: PALETTE[0], line: { width: 0 } },
            text: values.map(v => fmtVal(v)),
            textposition: "auto",
        }],
        layout: baseLayout({ margin: { l: 120, r: 30, t: 20, b: 40 } }),
    };
}


// ── Grouped / Stacked Bar ─────────────────────────────────────────────────────
function buildGroupedBar(meta: any, rows: Record<string, any>[], barmode: "group" | "stack") {
    const xCol = meta.x_col;
    const groupCol = meta.group_col;
    const yCol = (meta.y_cols || [])[0] || meta.value_col;
    const categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))];

    if (!groupCol) return buildXY(meta, rows, "bar");

    const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))];
    const traces = groups.map((g, idx) => ({
        type: "bar" as const,
        name: g,
        x: categories.map(truncate),
        y: categories.map(cat => aggregate(rows.filter(r => String(r[xCol] ?? "") === cat && String(r[groupCol] ?? "") === g), yCol, meta.agg || "count")),
        marker: { color: PALETTE[idx % PALETTE.length] },
    }));

    return { data: traces, layout: baseLayout({ barmode, showlegend: true }) };
}

// ── Pie / Donut ───────────────────────────────────────────────────────────────
function buildPie(meta: any, rows: Record<string, any>[], type: string) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];
    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))];
    let data = groups.map(g => ({
        label: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "count"),
    }));

    if (data.length > 8) {
        data.sort((a, b) => b.value - a.value);
        const top = data.slice(0, 7);
        const otherSum = data.slice(7).reduce((s, d) => s + d.value, 0);
        if (otherSum > 0) top.push({ label: "Others", value: otherSum });
        data = top;
    }

    return {
        data: [{
            type: "pie",
            labels: data.map(d => d.label),
            values: data.map(d => d.value),
            hole: type === "donut" ? 0.45 : 0,
            marker: { colors: PALETTE },
            textinfo: "label+percent",
            textposition: "auto",
            hoverinfo: "label+value+percent",
        }],
        layout: baseLayout({
            showlegend: true,
            legend: { orientation: "h", yanchor: "bottom", y: -0.25, font: { size: 11 } },
            margin: { l: 20, r: 20, t: 20, b: 60 },
        }),
    };
}

// ── Sunburst ──────────────────────────────────────────────────────────────────
function buildSunburst(meta: any, rows: Record<string, any>[]) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];
    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))].filter(Boolean);
    const data = groups.map(g => ({
        label: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "count"),
    })).filter(d => d.value > 0).slice(0, 30);

    return {
        data: [{
            type: "sunburst",
            labels: ["Total", ...data.map(d => d.label)],
            parents: ["", ...data.map(() => "Total")],
            values: [data.reduce((s, d) => s + d.value, 0), ...data.map(d => d.value)],
            branchvalues: "total",
            marker: { colors: ["transparent", ...PALETTE] },
        }],
        layout: baseLayout({ margin: { l: 10, r: 10, t: 10, b: 10 } }),
    };
}

// ── Treemap ───────────────────────────────────────────────────────────────────
function buildTreemap(meta: any, rows: Record<string, any>[]) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];
    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))].filter(Boolean);
    const all = groups.map(g => ({
        label: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "sum"),
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const data = all.slice(0, 25);
    if (all.length > 25) {
        const otherVal = all.slice(25).reduce((s, d) => s + d.value, 0);
        if (otherVal > 0) data.push({ label: "Others", value: otherVal });
    }

    return {
        data: [{
            type: "treemap",
            labels: ["Root", ...data.map(d => d.label)],
            parents: ["", ...data.map(() => "Root")],
            values: [0, ...data.map(d => d.value)],
            textinfo: "label+value+percent root",
            marker: { colors: ["transparent", ...PALETTE.slice(0, data.length)] },
            pathbar: { visible: true },
        }],
        layout: baseLayout({ margin: { l: 5, r: 5, t: 5, b: 5 } }),
    };
}

// ── Funnel ────────────────────────────────────────────────────────────────────
function buildFunnel(meta: any, rows: Record<string, any>[]) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];
    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))].filter(Boolean);
    const all = groups.map(g => ({
        label: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "sum"),
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

    return {
        data: [{
            type: "funnel",
            y: all.map(d => truncate(d.label)),
            x: all.map(d => d.value),
            textinfo: "value+percent initial",
            marker: { color: PALETTE.slice(0, all.length) },
        }],
        layout: baseLayout({ margin: { l: 120, r: 30, t: 20, b: 30 } }),
    };
}

// ── Waterfall ─────────────────────────────────────────────────────────────────
function buildWaterfall(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col || meta.category_col;
    const yCol = (meta.y_cols || [])[0] || meta.value_col;
    const categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))].slice(0, 15);
    const values = categories.map(cat => aggregate(rows.filter(r => String(r[xCol] ?? "") === cat), yCol, meta.agg || "sum"));
    const measures = values.map((_, i) => i === values.length - 1 ? "total" : i === 0 ? "absolute" : "relative");

    return {
        data: [{
            type: "waterfall",
            x: categories.map(truncate),
            y: values,
            measure: measures,
            connector: { line: { color: "rgba(124,111,255,0.3)" } },
            increasing: { marker: { color: "#00C9B1" } },
            decreasing: { marker: { color: "#FF6B6B" } },
            totals: { marker: { color: "#7C6FFF" } },
        }],
        layout: baseLayout(),
    };
}

// ── Scatter ───────────────────────────────────────────────────────────────────
function buildScatter(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col;
    const yCol = (meta.y_cols || [])[0];
    const groupCol = meta.group_col;
    const sampleRows = rows.slice(0, 100);

    if (groupCol) {
        const groups = [...new Set(sampleRows.map(r => String(r[groupCol] ?? "")))];
        return {
            data: groups.map((g, idx) => ({
                type: "scatter",
                mode: "markers",
                name: g,
                x: sampleRows.filter(r => String(r[groupCol] ?? "") === g).map(r => Number(r[xCol])),
                y: sampleRows.filter(r => String(r[groupCol] ?? "") === g).map(r => Number(r[yCol])),
                marker: { size: 10, color: PALETTE[idx % PALETTE.length], opacity: 0.7 },
            })),
            layout: baseLayout({
                showlegend: true,
                xaxis: { title: xCol, gridcolor: "rgba(255,255,255,0.04)" },
                yaxis: { title: yCol, gridcolor: "rgba(255,255,255,0.04)" },
            }),
        };
    }

    return {
        data: [{
            type: "scatter",
            mode: "markers",
            x: sampleRows.map(r => Number(r[xCol])),
            y: sampleRows.map(r => Number(r[yCol])),
            marker: { size: 10, color: PALETTE[0], opacity: 0.7 },
        }],
        layout: baseLayout({
            xaxis: { title: xCol, gridcolor: "rgba(255,255,255,0.04)" },
            yaxis: { title: yCol, gridcolor: "rgba(255,255,255,0.04)" },
        }),
    };
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function buildBubble(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col;
    const yCols: string[] = meta.y_cols || [];
    const yCol = yCols[0];
    const sizeCol = yCols[1] || yCol;
    const sampleRows = rows.slice(0, 100);

    const sizes = sampleRows.map(r => Math.abs(Number(r[sizeCol] ?? 1)));
    const maxSize = Math.max(...sizes, 1);

    return {
        data: [{
            type: "scatter",
            mode: "markers",
            x: sampleRows.map(r => Number(r[xCol])),
            y: sampleRows.map(r => Number(r[yCol])),
            marker: { size: sizes.map(s => (s / maxSize) * 40 + 5), color: PALETTE[0], opacity: 0.6, line: { width: 1, color: "rgba(255,255,255,0.3)" } },
            text: sampleRows.map(r => `${r[xCol]}, ${r[yCol]}`),
        }],
        layout: baseLayout({
            xaxis: { title: xCol, gridcolor: "rgba(255,255,255,0.04)" },
            yaxis: { title: yCol, gridcolor: "rgba(255,255,255,0.04)" },
        }),
    };
}

// ── Radar ─────────────────────────────────────────────────────────────────────
function buildRadar(meta: any, rows: Record<string, any>[]) {
    const yCols: string[] = meta.y_cols || [];
    const groupCol = meta.group_col;

    if (groupCol) {
        const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))];
        return {
            data: groups.map((g, idx) => ({
                type: "scatterpolar",
                r: yCols.map(col => aggregate(rows.filter(r => String(r[groupCol] ?? "") === g), col, meta.agg || "avg")),
                theta: yCols,
                fill: "toself",
                name: g,
                marker: { color: PALETTE[idx % PALETTE.length] },
            })),
            layout: baseLayout({
                polar: { radialaxis: { visible: true, gridcolor: "rgba(255,255,255,0.08)" }, angularaxis: { gridcolor: "rgba(255,255,255,0.08)" } },
                showlegend: true,
            }),
        };
    }

    return {
        data: [{
            type: "scatterpolar",
            r: yCols.map(col => aggregate(rows, col, "avg")),
            theta: yCols,
            fill: "toself",
            marker: { color: PALETTE[0] },
        }],
        layout: baseLayout({
            polar: { radialaxis: { visible: true, gridcolor: "rgba(255,255,255,0.08)" } },
        }),
    };
}

// ── Histogram ─────────────────────────────────────────────────────────────────
function buildHistogram(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col || (meta.y_cols || [])[0];
    return {
        data: [{
            type: "histogram",
            x: rows.map(r => Number(r[xCol])).filter(n => !isNaN(n)),
            nbinsx: 20,
            marker: { color: PALETTE[0], line: { color: "rgba(255,255,255,0.2)", width: 1 } },
        }],
        layout: baseLayout({ xaxis: { title: xCol }, bargap: 0.05 }),
    };
}

// ── Box ───────────────────────────────────────────────────────────────────────
function buildBox(meta: any, rows: Record<string, any>[]) {
    const yCols: string[] = meta.y_cols || [meta.x_col];
    const groupCol = meta.group_col || meta.x_col;

    if (groupCol && groupCol !== yCols[0]) {
        const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))].slice(0, 10);
        return {
            data: groups.map((g, idx) => ({
                type: "box",
                y: rows.filter(r => String(r[groupCol] ?? "") === g).map(r => Number(r[yCols[0]])).filter(n => !isNaN(n)),
                name: truncate(g),
                marker: { color: PALETTE[idx % PALETTE.length] },
                boxpoints: "outliers",
            })),
            layout: baseLayout({ showlegend: false }),
        };
    }

    return {
        data: yCols.map((col, idx) => ({
            type: "box",
            y: rows.map(r => Number(r[col])).filter(n => !isNaN(n)),
            name: col,
            marker: { color: PALETTE[idx % PALETTE.length] },
            boxpoints: "outliers",
        })),
        layout: baseLayout(),
    };
}

// ── Violin ────────────────────────────────────────────────────────────────────
function buildViolin(meta: any, rows: Record<string, any>[]) {
    const yCols: string[] = meta.y_cols || [meta.x_col];
    const groupCol = meta.group_col || meta.x_col;

    if (groupCol && groupCol !== yCols[0]) {
        const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))].slice(0, 10);
        return {
            data: groups.map((g, idx) => ({
                type: "violin",
                y: rows.filter(r => String(r[groupCol] ?? "") === g).map(r => Number(r[yCols[0]])).filter(n => !isNaN(n)),
                name: truncate(g),
                box: { visible: true },
                meanline: { visible: true },
                fillcolor: `${PALETTE[idx % PALETTE.length]}40`,
                line: { color: PALETTE[idx % PALETTE.length] },
            })),
            layout: baseLayout({ showlegend: false }),
        };
    }

    return {
        data: yCols.map((col, idx) => ({
            type: "violin",
            y: rows.map(r => Number(r[col])).filter(n => !isNaN(n)),
            name: col,
            box: { visible: true },
            meanline: { visible: true },
            fillcolor: `${PALETTE[idx % PALETTE.length]}40`,
            line: { color: PALETTE[idx % PALETTE.length] },
        })),
        layout: baseLayout(),
    };
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function buildHeatmap(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col;
    const groupCol = meta.group_col || (meta.y_cols || [])[0];
    const yCol = (meta.y_cols || [])[0] || meta.value_col;

    if (!groupCol) return buildXY(meta, rows, "bar");

    const xCats = [...new Set(rows.map(r => String(r[xCol] ?? "")))].slice(0, 15);
    const yCats = [...new Set(rows.map(r => String(r[groupCol] ?? "")))].slice(0, 15);

    const z = yCats.map(yc =>
        xCats.map(xc => aggregate(rows.filter(r => String(r[xCol] ?? "") === xc && String(r[groupCol] ?? "") === yc), yCol, meta.agg || "sum"))
    );

    return {
        data: [{
            type: "heatmap",
            x: xCats.map(truncate),
            y: yCats.map(truncate),
            z,
            colorscale: [[0, "#0d0d16"], [0.5, "#7C6FFF"], [1, "#00C9B1"]],
            showscale: true,
        }],
        layout: baseLayout({ margin: { l: 100, r: 30, t: 20, b: 60 } }),
    };
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
function buildGauge(meta: any, rows: Record<string, any>[]) {
    const yCol = (meta.y_cols || [])[0];
    const values = rows.map(r => Number(r[yCol])).filter(n => !isNaN(n));
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const max = values.length > 0 ? Math.max(...values) : 100;

    return {
        data: [{
            type: "indicator",
            mode: "gauge+number",
            value: Math.round(avg * 100) / 100,
            gauge: {
                axis: { range: [0, max * 1.2] },
                bar: { color: "#7C6FFF" },
                steps: [
                    { range: [0, max * 0.33], color: "rgba(124,111,255,0.08)" },
                    { range: [max * 0.33, max * 0.66], color: "rgba(124,111,255,0.15)" },
                    { range: [max * 0.66, max * 1.2], color: "rgba(124,111,255,0.25)" },
                ],
            },
        }],
        layout: baseLayout({ margin: { l: 30, r: 30, t: 30, b: 10 } }),
    };
}

// ── Aggregation Helper ────────────────────────────────────────────────────────
function aggregate(rows: Record<string, any>[], col: string, agg: string): number {
    if (!col || rows.length === 0) return rows.length;
    if (agg === "count") return rows.length;
    const nums = rows.map(r => Number(r[col] ?? 0)).filter(n => !isNaN(n));
    if (nums.length === 0) return 0;
    if (agg === "sum") return nums.reduce((a, b) => a + b, 0);
    if (agg === "avg") return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
    if (agg === "max") return Math.max(...nums);
    if (agg === "min") return Math.min(...nums);
    return nums[0];
}

function fmtVal(n: number): string {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(Math.round(n * 100) / 100);
}

// ── Chart type groups ─────────────────────────────────────────────────────────
export const AXIS_TYPES: SupportedType[] = ["bar", "horizontal_bar", "grouped_bar", "stacked_bar", "line", "area", "scatter", "bubble", "waterfall", "histogram", "box", "violin"];
export const PIE_TYPES: SupportedType[] = ["pie", "donut", "sunburst"];
export const HIERARCHY_TYPES: SupportedType[] = ["treemap", "funnel"];
export const SPECIAL_TYPES: SupportedType[] = ["heatmap", "radar", "gauge"];
export const ALL_TYPES: SupportedType[] = [...AXIS_TYPES, ...PIE_TYPES, ...HIERARCHY_TYPES, ...SPECIAL_TYPES];

export function getCompatibleTypes(currentType: string): SupportedType[] {
    if (PIE_TYPES.includes(currentType as SupportedType)) return PIE_TYPES;
    if (HIERARCHY_TYPES.includes(currentType as SupportedType)) return HIERARCHY_TYPES;
    if (SPECIAL_TYPES.includes(currentType as SupportedType)) return SPECIAL_TYPES;
    return AXIS_TYPES;
}
