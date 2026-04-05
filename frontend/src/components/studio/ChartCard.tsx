"use client";
import { useState, useMemo, useCallback, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Maximize2, Download, Layers, X, ChevronDown } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { regenerateChartOption, AXIS_TYPES, PIE_TYPES, HIERARCHY_TYPES, SPECIAL_TYPES, type SupportedType } from "@/lib/chart-regenerator";
import type { VisualizerBlock } from "@/components/ChartRenderer";
import DataTable from "@/components/DataTable";

// ── Lazy-load Plotly ─────────────────────────────────────────────────────────
const Plot = dynamic(
    async () => {
        const Plotly = await import("plotly.js-dist-min");
        const createPlotlyComponent = (await import("react-plotly.js")).default;
        if (typeof createPlotlyComponent === "function" && createPlotlyComponent.length > 0) {
            return (await import("react-plotly.js/factory")).default(Plotly.default || Plotly);
        }
        return createPlotlyComponent;
    },
    {
        ssr: false,
        loading: () => (
            <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-[#7C6FFF] border-t-transparent animate-spin" />
            </div>
        ),
    }
) as any;

// ── Brand palette ────────────────────────────────────────────────────────────
const PALETTE = ["#7C6FFF", "#00C9B1", "#FF6B6B", "#FFB347", "#4ECDC4", "#45B7D1", "#96CEB4", "#A855F7", "#F59E0B", "#EC4899"];

// ── Premium layout defaults ─────────────────────────────────────────────────
function mergeLayout(userLayout: any, isDark: boolean): any {
    const defaults: any = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "Inter, system-ui, sans-serif", color: isDark ? "#94a3b8" : "#4B5563", size: 12 },
        margin: { l: 50, r: 30, t: 20, b: 50 },
        colorway: PALETTE,
        hoverlabel: {
            bgcolor: isDark ? "rgba(13,13,22,0.95)" : "rgba(255,255,255,0.97)",
            bordercolor: "rgba(124,111,255,0.3)",
            font: { color: isDark ? "#e2e8f0" : "#1F2937", size: 12 },
        },
        xaxis: {
            gridcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
            zerolinecolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
            tickfont: { color: isDark ? "#64748b" : "#6B7280", size: 11 },
        },
        yaxis: {
            gridcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
            zerolinecolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
            tickfont: { color: isDark ? "#64748b" : "#6B7280", size: 11 },
        },
        modebar: {
            bgcolor: "transparent",
            color: isDark ? "rgba(148,163,184,0.4)" : "rgba(107,114,128,0.4)",
            activecolor: "#7C6FFF",
        },
        autosize: true,
    };

    const merged = { ...defaults };
    if (userLayout && typeof userLayout === "object") {
        for (const key of Object.keys(userLayout)) {
            if (key === "template") continue;
            if (typeof userLayout[key] === "object" && !Array.isArray(userLayout[key]) && merged[key] && typeof merged[key] === "object") {
                merged[key] = { ...merged[key], ...userLayout[key] };
            } else {
                merged[key] = userLayout[key];
            }
        }
    }
    return merged;
}

// ── Chart type icon entries ─────────────────────────────────────────────────
interface TypeEntry { type: SupportedType; label: string; icon: ReactNode; group: string; }

const CHART_TYPE_ICONS: TypeEntry[] = [
    // Basic
    { type: "bar",            label: "Bar",         group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="6" width="3" height="10"/><rect x="6" y="3" width="3" height="13"/><rect x="11" y="1" width="3" height="15"/></svg> },
    { type: "horizontal_bar", label: "H-Bar",       group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="10" height="3"/><rect x="0" y="6" width="13" height="3"/><rect x="0" y="11" width="7" height="3"/></svg> },
    { type: "grouped_bar",    label: "Grouped",     group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="5" width="3" height="11" opacity=".6"/><rect x="5" y="2" width="3" height="14"/><rect x="9" y="7" width="3" height="9" opacity=".6"/><rect x="13" y="4" width="3" height="12"/></svg> },
    { type: "stacked_bar",    label: "Stacked",     group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="10" width="4" height="5" opacity=".5"/><rect x="2" y="6" width="4" height="4" opacity=".8"/><rect x="2" y="3" width="4" height="3"/><rect x="8" y="8" width="4" height="7" opacity=".5"/><rect x="8" y="5" width="4" height="3" opacity=".8"/><rect x="8" y="2" width="4" height="3"/></svg> },
    { type: "line",           label: "Line",        group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,14 5,6 9,10 13,2"/></svg> },
    { type: "area",           label: "Area",        group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" opacity=".6"><polygon points="1,14 5,6 9,10 13,2 15,14"/></svg> },
    { type: "scatter",        label: "Scatter",     group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="12" r="2"/><circle cx="8" cy="6" r="2"/><circle cx="13" cy="3" r="2"/><circle cx="6" cy="11" r="1.5"/></svg> },
    { type: "bubble",         label: "Bubble",      group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" opacity=".7"><circle cx="4" cy="11" r="3"/><circle cx="9" cy="5" r="2.5"/><circle cx="13" cy="9" r="1.5"/></svg> },
    { type: "waterfall",      label: "Waterfall",   group: "Basic", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="3" height="6"/><rect x="5" y="4" width="3" height="4" opacity=".6"/><rect x="9" y="1" width="3" height="7" opacity=".8"/><rect x="13" y="3" width="3" height="11"/></svg> },
    // Statistical
    { type: "histogram",      label: "Histogram",   group: "Stats", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="10" width="3" height="6"/><rect x="3" y="6" width="3" height="10"/><rect x="6" y="2" width="3" height="14"/><rect x="9" y="5" width="3" height="11"/><rect x="12" y="9" width="3" height="7"/></svg> },
    { type: "box",            label: "Box",         group: "Stats", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="8" height="8" rx="1"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="8" y1="2" x2="8" y2="4"/><line x1="8" y1="12" x2="8" y2="14"/></svg> },
    { type: "violin",         label: "Violin",      group: "Stats", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8,2 Q12,5 12,8 Q12,11 8,14 Q4,11 4,8 Q4,5 8,2"/></svg> },
    // Proportional
    { type: "pie",            label: "Pie",         group: "Parts", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><line x1="8" y1="8" x2="14" y2="8"/><line x1="8" y1="8" x2="11" y2="3"/></svg> },
    { type: "donut",          label: "Donut",       group: "Parts", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/></svg> },
    { type: "sunburst",       label: "Sunburst",    group: "Parts", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="6"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="13" y1="5" x2="10.5" y2="6.5"/></svg> },
    // Hierarchy
    { type: "treemap",        label: "Treemap",     group: "Flow", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="8" height="8" opacity=".8"/><rect x="10" y="1" width="5" height="4" opacity=".6"/><rect x="10" y="6" width="5" height="3" opacity=".4"/><rect x="1" y="10" width="14" height="5" opacity=".3"/></svg> },
    { type: "funnel",         label: "Funnel",      group: "Flow", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><polygon points="1,2 15,2 11,6 5,6" opacity=".5"/><polygon points="5,7 11,7 9,11 7,11" opacity=".7"/><polygon points="7,12 9,12 8,15 8,15" opacity="1"/></svg> },
    // Special
    { type: "heatmap",        label: "Heatmap",     group: "Special", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="5" height="5" opacity=".3"/><rect x="5" y="0" width="5" height="5" opacity=".7"/><rect x="10" y="0" width="5" height="5" opacity=".5"/><rect x="0" y="5" width="5" height="5" opacity=".9"/><rect x="5" y="5" width="5" height="5" opacity=".4"/><rect x="10" y="5" width="5" height="5" opacity=".8"/><rect x="0" y="10" width="5" height="5" opacity=".6"/><rect x="5" y="10" width="5" height="5" opacity=".2"/><rect x="10" y="10" width="5" height="5" opacity="1"/></svg> },
    { type: "radar",          label: "Radar",       group: "Special", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,1 15,12 1,12"/><polygon points="8,4 12,11 4,11" opacity=".5"/></svg> },
    { type: "gauge",          label: "Gauge",       group: "Special", icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2,12 A7,7 0 0,1 14,12"/><line x1="8" y1="12" x2="11" y2="5" strokeWidth="2"/></svg> },
];

interface ChartCardProps {
    block: VisualizerBlock;
    index: number;
    groupId: string;
    isDark: boolean;
    onDrilldown?: (column: string, value: string) => void;
    inlineRows?: Record<string, any>[];
}

export default function ChartCard({ block, index, groupId, isDark, onDrilldown, inlineRows }: ChartCardProps) {
    const { filteredRows: globalFilteredRows, activeChartType, setChartType, applyClickFilter, studioData, setDrilldown } = useStudio();
    const filteredRows = inlineRows ?? globalFilteredRows;
    const [fullscreen, setFullscreen] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [graphDiv, setGraphDiv] = useState<any>(null);

    const currentType = (activeChartType[index] || block.chart_type || "bar") as SupportedType;
    const isTable = block.library === "table";
    const isKpi = block.library === "kpi";

    // Show all chart types, grouped—not just the compatible subset
    const allTypeGroups = useMemo(() => {
        const groups: Record<string, typeof CHART_TYPE_ICONS> = {};
        for (const entry of CHART_TYPE_ICONS) {
            if (!groups[entry.group]) groups[entry.group] = [];
            groups[entry.group].push(entry);
        }
        return groups;
    }, []);

    // ── Regenerate Plotly config from filtered rows ──────────────────────────
    const plotlyConfig = useMemo(() => {
        if (isTable || isKpi) return null;
        // Phase 1: try regenerating from filtered rows + current type
        const regenerated = block.meta ? regenerateChartOption(block, filteredRows, currentType) : null;
        // Phase 2: fall back to raw backend config if regeneration yields nothing
        const baseConfig = regenerated || block.config || null;
        if (!baseConfig) return null;

        const data = Array.isArray(baseConfig.data) ? baseConfig.data : [];
        // If regenerated data traces are all empty, try backend's original config
        const allEmpty = data.length > 0 && data.every((t: any) => {
            const len = (a: any) => Array.isArray(a) ? a.length : 0;
            return !len(t.x) && !len(t.y) && !len(t.values) && !len(t.labels) && !len(t.z) && !len(t.r) && t.type !== "indicator";
        });
        if (allEmpty && block.config?.data) {
            // Use original backend Plotly config as-is
            return { data: block.config.data, layout: mergeLayout(block.config.layout, isDark), _truncated: false };
        }

        const layout = mergeLayout(baseConfig.layout, isDark);
        return { data, layout, _truncated: baseConfig._truncated };
    }, [block, filteredRows, currentType, isTable, isKpi, isDark]);

    // ── Empty data check ────────────────────────────────────────────────────
    const isEmptyData = useMemo(() => {
        if (isTable || isKpi || !plotlyConfig) return false;
        const { data } = plotlyConfig;
        if (!Array.isArray(data) || data.length === 0) return true;
        return data.every((trace: any) => {
            const hasX = Array.isArray(trace.x) && trace.x.length > 0;
            const hasY = Array.isArray(trace.y) && trace.y.length > 0;
            const hasValues = Array.isArray(trace.values) && trace.values.length > 0;
            const hasLabels = Array.isArray(trace.labels) && trace.labels.length > 0;
            const hasZ = Array.isArray(trace.z) && trace.z.length > 0;
            const hasR = Array.isArray(trace.r) && trace.r.length > 0;
            const isIndicator = trace.type === "indicator";
            return !hasX && !hasY && !hasValues && !hasLabels && !hasZ && !hasR && !isIndicator;
        });
    }, [plotlyConfig, isTable, isKpi]);

    // ── Chart click handler ─────────────────────────────────────────────────
    const handleChartClick = useCallback((event: any) => {
        const point = event?.points?.[0];
        if (!point) return;
        const clickedValue = String(point.label || point.x || point.y || "");
        const meta = block.meta;

        if (!onDrilldown && meta) {
            const colToFilter = meta.category_col || meta.x_col || meta.group_col;
            if (colToFilter && clickedValue) applyClickFilter(colToFilter, clickedValue);
        }

        if (clickedValue) {
            if (onDrilldown) {
                const col = meta?.x_col || meta?.category_col || meta?.group_col || "value";
                onDrilldown(col, clickedValue);
            } else if (studioData) {
                const relatedRows = filteredRows.filter(r => Object.values(r).some(v => String(v) === clickedValue));
                setDrilldown({
                    column: meta?.x_col || meta?.category_col || "value",
                    value: clickedValue,
                    rows: relatedRows.slice(0, 50),
                    originalSql: studioData.sql,
                });
            }
        }
    }, [block.meta, applyClickFilter, studioData, filteredRows, setDrilldown, onDrilldown]);

    // Title extraction
    let headerTitle = block.title || "Visualization";
    if (typeof headerTitle === "object" && (headerTitle as any).text) headerTitle = (headerTitle as any).text;

    // ── Export Handlers ────────────────────────────────────────────────────
    const handleDownloadHTML = useCallback(() => {
        if (!plotlyConfig) return;
        const titleStr = String(headerTitle) || "chart";
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${titleStr}</title>
    <script src="https://cdn.plot.ly/plotly-2.30.0.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: ${isDark ? '#0F1117' : '#ffffff'}; color: ${isDark ? '#e2e8f0' : '#1F2937'}; transition: all 0.3s ease; }
        body.dark-mode { background: #0F1117; color: #e2e8f0; }
        h2 { margin: 0 0 16px 0; font-size: 18px; }
        #chart-container { width: 100%; height: 85vh; }
        .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        button { padding: 8px 16px; cursor: pointer; border-radius: 6px; border: 1px solid #ccc; background: #fff; font-weight: 500; font-size: 13px; }
        body.dark-mode button { background: #1f2937; border-color: #374151; color: #e2e8f0; }
    </style>
</head>
<body class="${isDark ? 'dark-mode' : ''}">
    <div class="controls">
        <h2>${titleStr}</h2>
        <button onclick="document.body.classList.toggle('dark-mode')">Toggle Dark Theme</button>
    </div>
    <div id="chart-container"></div>
    <script>
        const rawData = ${JSON.stringify(plotlyConfig.data || [])};
        const layout = ${JSON.stringify(plotlyConfig.layout || {})};
        layout.autosize = true;
        layout.paper_bgcolor = 'transparent';
        layout.plot_bgcolor = 'transparent';
        Plotly.newPlot('chart-container', rawData, layout, { responsive: true });
    </script>
</body>
</html>`;
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${titleStr.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [plotlyConfig, headerTitle, isDark]);

    const handleDownloadSVG = useCallback(async () => {
        if (!graphDiv) return;
        const Plotly = await import("plotly.js-dist-min");
        (Plotly as any).downloadImage(graphDiv, { format: "svg", filename: String(headerTitle || "chart").replace(/[^a-z0-9]/gi, '_').toLowerCase() });
        setShowExportMenu(false);
    }, [graphDiv, headerTitle]);

    const handleDownloadPNG = useCallback(async () => {
        if (!graphDiv) return;
        const Plotly = await import("plotly.js-dist-min");
        (Plotly as any).downloadImage(graphDiv, { format: "png", scale: 2, filename: String(headerTitle || "chart").replace(/[^a-z0-9]/gi, '_').toLowerCase() });
        setShowExportMenu(false);
    }, [graphDiv, headerTitle]);

    const accentColor = isTable ? "#00C9B1" : "#7C6FFF";

    const cardContent = (
        <div
            className="w-full h-full flex flex-col overflow-hidden rounded-xl transition-colors duration-300"
            style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-md)",
                minHeight: isKpi ? 100 : isTable ? 200 : 260,
            }}
        >
            {/* ── Header ── */}
            <div
                className="flex items-center gap-2 px-3 py-2 shrink-0"
                style={{ background: "var(--glass-bg-hover)", borderBottom: "1px solid var(--glass-border)" }}
            >
                <span className="text-[11px] font-bold uppercase tracking-wider truncate flex-1 flex items-center gap-1.5" style={{ color: accentColor }}>
                    {String(headerTitle)}
                    {plotlyConfig?._truncated && <span className="text-[9px] bg-foreground/10 px-1.5 py-0.5 rounded-md normal-case font-semibold tracking-normal text-muted-foreground">Top 15</span>}
                </span>

                {/* Type switcher */}
                {!isTable && !isKpi && block.meta && (
                    <div className="relative">
                        <button
                            onClick={() => setShowTypePicker(p => !p)}
                            title="Switch chart type"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:text-foreground"
                            style={{
                                background: showTypePicker ? "rgba(124,111,255,0.18)" : "var(--glass-bg-hover)",
                                border: showTypePicker ? "1px solid rgba(124,111,255,0.40)" : "1px solid var(--glass-border)",
                                color: showTypePicker ? "#7C6FFF" : "var(--color-muted-foreground)",
                            }}
                        >
                            {CHART_TYPE_ICONS.find(c => c.type === currentType)?.icon ?? <Layers className="w-3 h-3" />}
                            <span>{currentType}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showTypePicker ? "rotate-180" : ""}`} />
                        </button>
                        {showTypePicker && (
                            <div
                                className="absolute right-0 top-full mt-1.5 z-50 flex flex-col p-1.5 rounded-xl shadow-xl animate-fadein"
                                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border-strong)", backdropFilter: "blur(16px)", minWidth: 150, maxHeight: 340, overflowY: "auto" }}
                                onMouseLeave={() => setShowTypePicker(false)}
                            >
                                {Object.entries(allTypeGroups).map(([group, types]) => (
                                    <div key={group}>
                                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/40 px-2 pt-1.5 pb-0.5">{group}</p>
                                        {types.map(ct => (
                                            <button
                                                key={ct.type}
                                                onClick={() => { setChartType(index, ct.type); setShowTypePicker(false); }}
                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all w-full"
                                                style={{
                                                    background: currentType === ct.type ? "rgba(124,111,255,0.15)" : "transparent",
                                                    color: currentType === ct.type ? "#7C6FFF" : "var(--color-muted-foreground)",
                                                }}
                                            >
                                                {ct.icon}
                                                <span>{ct.label}</span>
                                                {currentType === ct.type && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C6FFF]" />}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Export Dropdown */}
                {!isTable && !isKpi && plotlyConfig && !isEmptyData && (
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(e => !e)}
                            title="Export chart"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                            style={{
                                border: showExportMenu ? "1px solid rgba(124,111,255,0.4)" : "1px solid var(--glass-border)",
                                background: showExportMenu ? "rgba(124,111,255,0.12)" : "transparent",
                                color: showExportMenu ? "#7C6FFF" : undefined,
                            }}
                        >
                            <Download className="w-3 h-3" />
                            <span>Export</span>
                        </button>
                        {showExportMenu && (
                            <div
                                className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-xl animate-fadein overflow-hidden"
                                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border-strong)", backdropFilter: "blur(16px)", minWidth: 170 }}
                                onMouseLeave={() => setShowExportMenu(false)}
                            >
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/40 px-3 pt-2 pb-1">Export As</p>
                                {([
                                    { label: "Interactive HTML", desc: "Fully interactive", color: "#00C9B1", onClick: () => { handleDownloadHTML(); setShowExportMenu(false); } },
                                    { label: "SVG Vector", desc: "Scalable image", color: "#7C6FFF", onClick: handleDownloadSVG },
                                    { label: "PNG Image", desc: "High-res 2x", color: "#FFB347", onClick: handleDownloadPNG },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.label}
                                        onClick={opt.onClick}
                                        className="flex flex-col items-start w-full px-3 py-2 text-left transition-colors hover:bg-foreground/5"
                                    >
                                        <span className="text-[11px] font-semibold" style={{ color: opt.color }}>{opt.label}</span>
                                        <span className="text-[9px] text-muted-foreground">{opt.desc}</span>
                                    </button>
                                ))}
                                <div className="pb-1" />
                            </div>
                        )}
                    </div>
                )}

                {/* Fullscreen */}
                <button
                    onClick={() => setFullscreen(f => !f)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
                    title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                    <Maximize2 className="w-3 h-3" />
                </button>
            </div>

            {/* ── Content ── */}
            <div className={`flex-1 min-h-0 ${isTable ? "overflow-y-auto p-2" : "p-1"} relative`}>
                {/* Empty State */}
                {!isTable && !isKpi && isEmptyData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 bg-[var(--glass-bg)]/80 backdrop-blur-sm">
                        <div className="w-10 h-10 mb-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] flex items-center justify-center text-muted-foreground/60">
                            <Layers className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No data available</p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[80%]">
                            The applied filters resulted in empty data for this view.
                        </p>
                    </div>
                )}

                {/* Plotly Chart */}
                {!isTable && !isKpi && plotlyConfig && !isEmptyData && (
                    <Plot
                        data={plotlyConfig.data}
                        layout={plotlyConfig.layout}
                        config={{
                            responsive: true,
                            displayModeBar: true,
                            modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
                            displaylogo: false,
                            toImageButtonOptions: { format: "svg", scale: 1 },
                        }}
                        style={{ height: "100%", width: "100%", minHeight: 220 }}
                        useResizeHandler={true}
                        onClick={handleChartClick}
                        onInitialized={(_figure: any, gd: any) => setGraphDiv(gd)}
                        onUpdate={(_figure: any, gd: any) => setGraphDiv(gd)}
                    />
                )}

                {/* Table */}
                {isTable && block.config && <DataTable config={block.config} />}

                {/* KPI */}
                {isKpi && block.config && <KpiDisplay config={block.config} title={String(headerTitle)} />}
            </div>
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 animate-fadein" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
                <div className="relative w-full max-w-5xl h-[80vh]">
                    <button onClick={() => setFullscreen(false)} className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-[12px] font-medium">
                        <X className="w-4 h-4" /> Close
                    </button>
                    {cardContent}
                </div>
            </div>
        );
    }

    return cardContent;
}

// ── Inline KPI Display ────────────────────────────────────────────────────────
function KpiDisplay({ config, title }: { config: any; title: string }) {
    const value = config.formatted_value ?? config.value ?? "—";
    const trendLabel = config.trend ?? config.delta;
    const direction = config.trend_direction ?? config.delta_direction ?? "neutral";
    const isUp = direction === "up";
    const isDown = direction === "down";
    const trendColor = isUp ? "#16A34A" : isDown ? "#DC2626" : "var(--color-muted-foreground)";

    return (
        <div className="h-full flex flex-col items-center justify-center py-4">
            <span className="text-5xl font-extrabold" style={{ background: "linear-gradient(135deg,#7C6FFF,#00C9B1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {String(value)}
            </span>
            {trendLabel && (
                <div className="flex items-center gap-1 mt-3 text-sm font-semibold" style={{ color: trendColor }}>
                    {isUp ? "↑" : isDown ? "↓" : "—"} {trendLabel}
                </div>
            )}
        </div>
    );
}
