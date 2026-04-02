/**
 * chart-regenerator.ts
 * Rebuilds ECharts option objects from filtered raw rows + chart metadata.
 * This is the engine that powers live cross-filtering without re-querying the backend.
 */
import type { VisualizerBlock } from "@/components/ChartRenderer";

export type SupportedType = "bar" | "line" | "area" | "scatter" | "pie" | "donut" | "horizontal_bar" | "stacked_bar" | "radar" | "treemap" | "funnel";

// ECharts brand palette
const PALETTE = ["#7C6FFF", "#00C9B1", "#F59E0B", "#6366F1", "#EC4899", "#10B981", "#3B82F6", "#F97316"];

// ── Label truncation helper — prevents axis label overlap ─────────────────────
const MAX_LABEL_LEN = 22;
function truncateLabel(label: string): string {
    if (!label || label.length <= MAX_LABEL_LEN) return label;
    return label.slice(0, MAX_LABEL_LEN - 1).trimEnd() + "…";
}

function smartAxisLabel(categories: string[], isHorizontal = false) {
    const maxLen = Math.max(...categories.map(c => c.length));
    const needsRotation = !isHorizontal && (categories.length > 6 || maxLen > 15);
    return {
        formatter: (value: string) => truncateLabel(value),
        rotate: needsRotation ? 25 : 0,
        fontSize: 11,
        overflow: "truncate" as const,
        width: isHorizontal ? 120 : 80,
    };
}

// ── Main export: regenerate a chart option from filtered rows ──────────────────
export function regenerateChartOption(
    block: VisualizerBlock,
    filteredRows: Record<string, any>[],
    overrideType?: string
): Record<string, any> | null {
    const meta = block.meta;
    const chartType = (overrideType || block.chart_type || "bar") as SupportedType;

    // If no meta, fall back to original config (already filtered data can't help)
    if (!meta) return null;

    try {
        if (chartType === "pie" || chartType === "donut") return buildPie(meta, filteredRows, chartType);
        if (chartType === "radar") return buildRadar(meta, filteredRows);
        if (chartType === "scatter") return buildScatter(meta, filteredRows);
        if (chartType === "horizontal_bar") return buildHorizontalBar(meta, filteredRows);
        if (chartType === "stacked_bar") return buildStackedBar(meta, filteredRows, "bar");
        if (chartType === "treemap") return buildTreemap(meta, filteredRows);
        if (chartType === "funnel") return buildFunnel(meta, filteredRows);
        // Default: bar / line / area share the same structure
        return buildXY(meta, filteredRows, chartType);
    } catch (e) {
        console.warn("[ChartRegen] Failed:", e);
        return null;
    }
}

// ── X/Y Charts: bar, line, area ───────────────────────────────────────────────
function buildXY(meta: any, rows: Record<string, any>[], type: string) {
    const xCol: string = meta.x_col;
    const yCols: string[] = meta.y_cols || [];

    let categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))];
    let isTruncated = false;

    // Truncate Bar charts with too many categories
    if (type === "bar" && categories.length > 15) {
        const catSums = categories.map(cat => {
            const sum = yCols.reduce((acc, yCol) => {
                const matching = rows.filter(r => String(r[xCol] ?? "") === cat);
                return acc + aggregate(matching, yCol, meta.agg || "sum");
            }, 0);
            return { cat, sum };
        });
        catSums.sort((a, b) => b.sum - a.sum);
        categories = catSums.slice(0, 15).map(c => c.cat);
        isTruncated = true;
    }

    const series = yCols.map((yCol, idx) => ({
        name: yCol,
        type: type === "area" ? "line" : type,
        smooth: type === "line" || type === "area",
        areaStyle: type === "area" ? { opacity: 0.25 } : undefined,
        data: categories.map(cat => {
            const matching = rows.filter(r => String(r[xCol] ?? "") === cat);
            return aggregate(matching, yCol, meta.agg || "sum");
        }),
        itemStyle: { color: PALETTE[idx % PALETTE.length] },
    }));

    const opt: any = {
        _truncated: isTruncated,
        xAxis: {
            type: "category",
            data: categories,
            axisLabel: smartAxisLabel(categories),
            axisTick: { alignWithLabel: true },
        },
        yAxis: { type: "value" },
        series,
        legend: yCols.length > 1 ? { show: true } : { show: false },
        tooltip: { trigger: "axis" },
    };

    // Data Zoom for Time Series
    if ((type === "line" || type === "area") && categories.length > 25) {
        opt.dataZoom = [
            { type: "inside", start: 0, end: Math.max(10, Math.floor(2500 / categories.length)) },
            { type: "slider", start: 0, end: Math.max(10, Math.floor(2500 / categories.length)), bottom: 5, height: 16 }
        ];
        opt.grid = { bottom: 50, left: 20, right: 20, containLabel: true };
    }

    return opt;
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
function buildHorizontalBar(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col || meta.category_col;
    const yCol = (meta.y_cols || [])[0] || meta.value_col;
    let categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))];
    let isTruncated = false;

    if (categories.length > 15) {
        const catSums = categories.map(cat => {
            const matching = rows.filter(r => String(r[xCol] ?? "") === cat);
            return { cat, sum: aggregate(matching, yCol, meta.agg || "sum") };
        });
        catSums.sort((a, b) => b.sum - a.sum);
        categories = catSums.slice(0, 15).reverse().map(c => c.cat); // reverse for bottom-up rendering
        isTruncated = true;
    }

    return {
        _truncated: isTruncated,
        yAxis: {
            type: "category",
            data: categories,
            axisLabel: smartAxisLabel(categories, true),
        },
        xAxis: { type: "value" },
        series: [{
            type: "bar",
            data: categories.map(cat => {
                const matching = rows.filter(r => String(r[xCol] ?? "") === cat);
                return aggregate(matching, yCol, meta.agg || "sum");
            }),
            itemStyle: { color: PALETTE[0] },
        }],
        grid: { left: 10, right: 30, top: 15, bottom: 20, containLabel: true },
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                if (!Array.isArray(params)) params = [params];
                const cat = params[0]?.name ?? "";
                const val = params[0]?.value ?? "";
                return `<b>${cat}</b><br/>${val}`;
            },
        },
    };
}

// ── Stacked Bar ───────────────────────────────────────────────────────────────
function buildStackedBar(meta: any, rows: Record<string, any>[], chartType = "bar") {
    const xCol = meta.x_col;
    const groupCol = meta.group_col;
    const yCol = (meta.y_cols || [])[0] || meta.value_col;

    const categories = [...new Set(rows.map(r => String(r[xCol] ?? "")))];

    if (!groupCol) return buildXY(meta, rows, chartType); // fall back

    const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))];
    const series = groups.map((g, idx) => ({
        name: g,
        type: "bar",
        stack: "total",
        data: categories.map(cat => {
            const matching = rows.filter(r => String(r[xCol] ?? "") === cat && String(r[groupCol] ?? "") === g);
            return aggregate(matching, yCol, meta.agg || "count");
        }),
        itemStyle: { color: PALETTE[idx % PALETTE.length] },
    }));

    return {
        xAxis: { type: "category", data: categories },
        yAxis: { type: "value" },
        series,
        legend: { show: true },
        tooltip: { trigger: "axis" },
    };
}

// ── Pie / Donut ───────────────────────────────────────────────────────────────
function buildPie(meta: any, rows: Record<string, any>[], type: string) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];

    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))];
    let data = groups.map(g => ({
        name: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "count"),
    }));

    let isTruncated = false;
    if (groups.length > 15) {
        data.sort((a, b) => b.value - a.value);
        let top15 = data.slice(0, 15);
        let othersSum = data.slice(15).reduce((acc, curr) => acc + curr.value, 0);
        if (othersSum > 0) top15.push({ name: "Other", value: othersSum });
        data = top15;
        isTruncated = true;
    }

    return {
        _truncated: isTruncated,
        series: [{
            type: "pie",
            radius: type === "donut" ? ["40%", "70%"] : "65%",
            data,
            label: { formatter: "{b}: {d}%" },
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.3)" } },
        }],
        tooltip: { trigger: "item", formatter: "{a} <br>{b}: {c} ({d}%)" },
        legend: { orient: "vertical", right: 10, top: "center", type: "scroll" },
        color: PALETTE,
    };
}

// ── Radar ─────────────────────────────────────────────────────────────────────
function buildRadar(meta: any, rows: Record<string, any>[]) {
    const yCols: string[] = meta.y_cols || [];
    const groupCol = meta.group_col;

    if (groupCol) {
        const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))];
        const indicators = yCols.map(col => {
            const vals = rows.map(r => Number(r[col] ?? 0)).filter(n => !isNaN(n));
            return { name: col, max: Math.max(...vals) * 1.2 };
        });
        const series = [{
            type: "radar",
            data: groups.map((g, gi) => ({
                name: g,
                value: yCols.map(col => {
                    const matching = rows.filter(r => String(r[groupCol] ?? "") === g);
                    return aggregate(matching, col, meta.agg || "avg");
                }),
                itemStyle: { color: PALETTE[gi % PALETTE.length] },
            })),
        }];
        return { radar: { indicator: indicators }, series, legend: { show: true }, tooltip: {} };
    }

    const indicators = yCols.map(col => {
        const vals = rows.map(r => Number(r[col] ?? 0)).filter(n => !isNaN(n));
        return { name: col, max: Math.max(...vals) * 1.2 };
    });

    return {
        radar: { indicator: indicators },
        series: [{
            type: "radar",
            data: [{ name: "Values", value: yCols.map(col => aggregate(rows, col, "avg")) }],
        }],
        tooltip: {},
    };
}

// ── Treemap ───────────────────────────────────────────────────────────────────
function buildTreemap(meta: any, rows: Record<string, any>[]) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];

    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))].filter(Boolean);
    // NOTE: No per-item itemStyle — ECharts treemap assigns palette colors automatically.
    // Adding itemStyle per node causes an internal 'push' crash in ECharts' SeriesData.
    const data = groups.map(g => ({
        name: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "sum"),
    })).filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
        color: PALETTE,
        series: [{
            type: "treemap",
            width: "100%",
            height: "100%",
            data,
            leafDepth: 1,
            roam: false,
            breadcrumb: { show: false },
            label: { show: true, formatter: "{b}\n{c}", fontSize: 12, fontWeight: "bold", color: "#fff" },
            upperLabel: { show: false },
            itemStyle: { borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", gapWidth: 2 },
            emphasis: { label: { fontSize: 14 }, itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } },
            levels: [
                { itemStyle: { borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", gapWidth: 2 } },
            ],
        }],
        tooltip: { trigger: "item", formatter: (info: any) => `<b>${info.name}</b>: ${info.value}` },
    };
}

// ── Funnel ────────────────────────────────────────────────────────────────────
function buildFunnel(meta: any, rows: Record<string, any>[]) {
    const catCol = meta.category_col || meta.x_col;
    const valCol = meta.value_col || (meta.y_cols || [])[0];

    const groups = [...new Set(rows.map(r => String(r[catCol] ?? "")))].filter(Boolean);
    const data = groups.map((g, i) => ({
        name: g,
        value: aggregate(rows.filter(r => String(r[catCol] ?? "") === g), valCol, meta.agg || "sum"),
        itemStyle: { color: PALETTE[i % PALETTE.length] },
    })).filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
        series: [{
            type: "funnel",
            width: "70%",
            left: "15%",
            data,
            label: { show: true, position: "inside", formatter: "{b}\n{c}", fontSize: 12, fontWeight: "bold", color: "#fff" },
            itemStyle: { borderWidth: 1, borderColor: "#fff" },
            emphasis: { label: { fontSize: 14 } },
        }],
        tooltip: { trigger: "item", formatter: "{a} <br/>{b}: {c}" },
    };
}

// ── Scatter ───────────────────────────────────────────────────────────────────
function buildScatter(meta: any, rows: Record<string, any>[]) {
    const xCol = meta.x_col;
    const yCol = (meta.y_cols || [])[0];
    const groupCol = meta.group_col;

    if (groupCol) {
        const groups = [...new Set(rows.map(r => String(r[groupCol] ?? "")))];
        return {
            xAxis: { type: "value", name: xCol },
            yAxis: { type: "value", name: yCol },
            series: groups.map((g, idx) => ({
                name: g,
                type: "scatter",
                data: rows.filter(r => String(r[groupCol] ?? "") === g).map(r => [Number(r[xCol]), Number(r[yCol])]),
                itemStyle: { color: PALETTE[idx % PALETTE.length] },
            })),
            legend: { show: true },
            tooltip: { trigger: "item" },
        };
    }

    return {
        xAxis: { type: "value", name: truncateLabel(xCol) },
        yAxis: { type: "value", name: truncateLabel(yCol) },
        series: [{
            type: "scatter",
            data: rows.map(r => [Number(r[xCol]), Number(r[yCol])]),
            itemStyle: { color: PALETTE[0] },
        }],
        tooltip: { trigger: "item" },
    };
}

// ── Aggregation Helper ────────────────────────────────────────────────────────
function aggregate(rows: Record<string, any>[], col: string, agg: string): number {
    if (!col || rows.length === 0) return rows.length; // fallback = count
    if (agg === "count") return rows.length;
    const nums = rows.map(r => Number(r[col] ?? 0)).filter(n => !isNaN(n));
    if (nums.length === 0) return 0;
    if (agg === "sum") return nums.reduce((a, b) => a + b, 0);
    if (agg === "avg") return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
    if (agg === "max") return Math.max(...nums);
    if (agg === "min") return Math.min(...nums);
    return nums[0]; // none/first
}

// ── Chart type groups (for the switcher) ─────────────────────────────────────
export const AXIS_TYPES: SupportedType[] = ["bar", "line", "area", "horizontal_bar", "scatter", "stacked_bar", "radar"];
export const PIE_TYPES: SupportedType[] = ["pie", "donut"];
export const HIERARCHY_TYPES: SupportedType[] = ["treemap", "funnel"];
export const ALL_TYPES: SupportedType[] = [...AXIS_TYPES, ...PIE_TYPES, ...HIERARCHY_TYPES];

export function getCompatibleTypes(currentType: string): SupportedType[] {
    if (PIE_TYPES.includes(currentType as SupportedType)) return PIE_TYPES;
    if (HIERARCHY_TYPES.includes(currentType as SupportedType)) return HIERARCHY_TYPES;
    return AXIS_TYPES;
}

export const TYPE_ICONS: Record<string, string> = {
    bar: "bar2", line: "line", area: "area", scatter: "scatter",
    pie: "pie", donut: "donut", horizontal_bar: "hbar",
    stacked_bar: "stack", radar: "radar", treemap: "treemap", funnel: "funnel",
};
