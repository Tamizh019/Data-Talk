"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Layers, Download } from "lucide-react";
import DataTable from "./DataTable";

// ── Lazy-load Plotly (SSR disabled — Plotly needs browser APIs) ──────────────
const Plot = dynamic(
    async () => {
        const Plotly = await import("plotly.js-dist-min");
        const createPlotlyComponent = (await import("react-plotly.js")).default;
        // react-plotly.js default export IS the component when using the main package
        // but with factory we need to call it
        if (typeof createPlotlyComponent === "function" && createPlotlyComponent.length > 0) {
            return (await import("react-plotly.js/factory")).default(Plotly.default || Plotly);
        }
        return createPlotlyComponent;
    },
    {
        ssr: false,
        loading: () => (
            <div className="h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[#7C6FFF] border-t-transparent animate-spin" />
                    <span className="text-[11px] text-muted-foreground font-medium">Loading chart…</span>
                </div>
            </div>
        ),
    }
) as any;

// ── Brand palette ────────────────────────────────────────────────────────────
const PALETTE = ["#7C6FFF", "#00C9B1", "#FF6B6B", "#FFB347", "#4ECDC4", "#45B7D1", "#96CEB4", "#A855F7", "#F59E0B", "#EC4899"];

export interface VisualizerBlock {
    library: string;
    title?: string;
    chart_type?: string;
    config?: any;
    meta?: any;
    [key: string]: any;
}

interface ChartRendererProps {
    block: VisualizerBlock;
}

// ── Merge user layout with our premium defaults ──────────────────────────────
function mergeLayout(userLayout: any, isDark: boolean): any {
    const defaults: any = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "Inter, system-ui, sans-serif", color: isDark ? "#94a3b8" : "#4B5563", size: 12 },
        margin: { l: 50, r: 30, t: 30, b: 50 },
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
        legend: {
            font: { color: isDark ? "#94a3b8" : "#4B5563", size: 11 },
        },
        modebar: {
            bgcolor: "transparent",
            color: isDark ? "rgba(148,163,184,0.5)" : "rgba(107,114,128,0.5)",
            activecolor: "#7C6FFF",
        },
        autosize: true,
    };

    // Deep merge user layout over defaults
    const merged = { ...defaults };
    if (userLayout && typeof userLayout === "object") {
        for (const key of Object.keys(userLayout)) {
            if (key === "template") continue; // skip template, we use our own
            if (typeof userLayout[key] === "object" && !Array.isArray(userLayout[key]) && merged[key] && typeof merged[key] === "object") {
                merged[key] = { ...merged[key], ...userLayout[key] };
            } else {
                merged[key] = userLayout[key];
            }
        }
    }
    return merged;
}

export default function ChartRenderer({ block }: ChartRendererProps) {
    if (!block) return null;
    if (block.library === "kpi" || block.chart_type === "kpi_card") return null;

    const { title, chart_type, config } = block;
    const library = block.library || "plotly";

    // ── Dark mode detection ──────────────────────────────────────────────────
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const checkDark = () =>
            setIsDark(mq.matches || document.documentElement.classList.contains("dark"));
        checkDark();
        mq.addEventListener("change", checkDark);
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => {
            mq.removeEventListener("change", checkDark);
            observer.disconnect();
        };
    }, []);

    // ── Build Plotly config ──────────────────────────────────────────────────
    const plotlyData = useMemo(() => {
        if (library !== "plotly") return null;
        const cfg = config || {};
        const data = Array.isArray(cfg.data) ? cfg.data : [];
        const layout = mergeLayout(cfg.layout, isDark);
        return { data, layout };
    }, [config, library, isDark]);

    // ── Check for empty data ────────────────────────────────────────────────
    const isEmptyData = useMemo(() => {
        if (library !== "plotly" || !plotlyData) return false;
        const { data } = plotlyData;
        if (!Array.isArray(data) || data.length === 0) return true;
        return data.every((trace: any) => {
            // A trace is empty only if it has no data points at all
            const hasX = Array.isArray(trace.x) && trace.x.length > 0;
            const hasY = Array.isArray(trace.y) && trace.y.length > 0;
            const hasValues = Array.isArray(trace.values) && trace.values.length > 0;
            const hasLabels = Array.isArray(trace.labels) && trace.labels.length > 0;
            const hasZ = Array.isArray(trace.z) && trace.z.length > 0;
            const hasR = Array.isArray(trace.r) && trace.r.length > 0;
            const isIndicator = trace.type === "indicator";
            return !hasX && !hasY && !hasValues && !hasLabels && !hasZ && !hasR && !isIndicator;
        });
    }, [plotlyData, library]);

    const onChartClick = useCallback((event: any) => {
        const point = event?.points?.[0];
        if (!point) return;
        const name = point.label || point.x || point.y || "";
        const value = point.value || point.y || point.x || "";
        window.dispatchEvent(new CustomEvent("chart-drilldown", {
            detail: { name: String(name), value, series: point.data?.name || "" },
        }));
    }, []);

    // ── Header title extraction ─────────────────────────────────────────────
    let headerTitle = "Visualization";
    if (typeof title === "string") headerTitle = title;
    else if (title && typeof title === "object" && (title as any).text) headerTitle = (title as any).text;
    else if (config?.layout?.title?.text) headerTitle = config.layout.title.text;

    // ── Download Handlers ───────────────────────────────────────────────────
    const [graphDiv, setGraphDiv] = useState<any>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleDownloadHTML = useCallback(() => {
        if (!plotlyData || library !== "plotly") return;
        const titleStr = headerTitle || "chart";
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${titleStr}</title>
    <script src="https://cdn.plot.ly/plotly-2.30.0.min.js"></script>
    <style>
        body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: ${isDark ? '#0F1117' : '#ffffff'}; color: ${isDark ? '#e2e8f0' : '#1F2937'}; transition: all 0.3s ease; }
        body.dark-mode { background: #0F1117; color: #e2e8f0; }
        #chart-container { width: 100%; height: 85vh; }
        .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        button { padding: 8px 16px; cursor: pointer; border-radius: 6px; border: 1px solid #ccc; background: #fff; font-weight: 500; }
        body.dark-mode button { background: #1f2937; border-color: #374151; color: #fff; }
    </style>
</head>
<body class="${isDark ? 'dark-mode' : ''}">
    <div class="controls">
        <h2 style="margin:0;">${titleStr}</h2>
        <button onclick="document.body.classList.toggle('dark-mode')">Toggle Dark Theme</button>
    </div>
    <div id="chart-container"></div>
    <script>
        const rawData = ${JSON.stringify(plotlyData.data || [])};
        const layout = ${JSON.stringify(plotlyData.layout || {})};
        layout.autosize = true;
        layout.paper_bgcolor = 'transparent';
        layout.plot_bgcolor = 'transparent';
        
        Plotly.newPlot('chart-container', rawData, layout, {responsive: true});
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
        setShowExportMenu(false);
    }, [plotlyData, library, headerTitle, isDark]);

    const handleDownloadSVG = useCallback(async () => {
        if (!graphDiv || library !== "plotly") return;
        const Plotly = await import("plotly.js-dist-min");
        (Plotly as any).downloadImage(graphDiv, { format: "svg", filename: (headerTitle || "chart").replace(/[^a-z0-9]/gi, '_').toLowerCase() });
        setShowExportMenu(false);
    }, [graphDiv, library, headerTitle]);

    const handleDownloadPNG = useCallback(async () => {
        if (!graphDiv || library !== "plotly") return;
        const Plotly = await import("plotly.js-dist-min");
        (Plotly as any).downloadImage(graphDiv, { format: "png", scale: 2, filename: (headerTitle || "chart").replace(/[^a-z0-9]/gi, '_').toLowerCase() });
        setShowExportMenu(false);
    }, [graphDiv, library, headerTitle]);

    const isTable = library === "table";
    const accentColor = isTable ? "#00C9B1" : "#7C6FFF";
    const tagBg = isTable ? "rgba(0,201,177,0.10)" : "rgba(124,111,255,0.10)";
    const tagBorder = isTable ? "rgba(0,201,177,0.25)" : "rgba(124,111,255,0.20)";

    const chartHeight = 320;

    return (
        <div
            className="w-full rounded-xl overflow-hidden flex flex-col transition-colors duration-300"
            style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-md)",
            }}
        >
            {/* ── Header ── */}
            <div
                className="flex items-center gap-2 px-4 py-2.5 shrink-0"
                style={{
                    background: "var(--glass-bg-hover)",
                    borderBottom: "1px solid var(--glass-border)",
                }}
            >
                {isTable ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                )}
                <span
                    className="text-[11px] font-bold uppercase tracking-wider truncate"
                    style={{ color: accentColor }}
                >
                    {headerTitle}
                </span>
                <span
                    className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0 uppercase tracking-wider"
                    style={{ background: tagBg, color: accentColor, border: `1px solid ${tagBorder}` }}
                >
                    {isTable ? "table" : chart_type || "chart"}
                </span>

                {/* ── Export Dropdown ── */}
                {library === "plotly" && !isEmptyData && (
                    <div className="relative ml-2 pl-2 border-l border-[var(--glass-border)]">
                        <button
                            onClick={() => setShowExportMenu(e => !e)}
                            title="Export chart"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                            style={{
                                border: showExportMenu ? "1px solid rgba(124,111,255,0.4)" : "1px solid var(--glass-border)",
                                background: showExportMenu ? "rgba(124,111,255,0.12)" : "transparent",
                                color: showExportMenu ? "#7C6FFF" : "var(--color-muted-foreground)",
                            }}
                        >
                            <Download className="w-3 h-3" />
                            <span>Export</span>
                        </button>
                        {showExportMenu && (
                            <div
                                className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-xl overflow-hidden"
                                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(16px)", minWidth: 170 }}
                                onMouseLeave={() => setShowExportMenu(false)}
                            >
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/40 px-3 pt-2 pb-1">Export As</p>
                                {([
                                    { label: "Interactive HTML", desc: "Fully interactive", color: "#00C9B1", onClick: handleDownloadHTML },
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
            </div>

            {/* ── Content ── */}
            <div className={`p-2 relative ${isTable ? "max-h-[500px] overflow-y-auto" : ""}`}>
                {/* Empty State Overlay */}
                {library === "plotly" && isEmptyData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 bg-[var(--glass-bg)]/80 backdrop-blur-sm" style={{ height: chartHeight }}>
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
                {library === "plotly" && plotlyData && !isEmptyData && (
                    <Plot
                        data={plotlyData.data}
                        layout={plotlyData.layout}
                        config={{
                            responsive: true,
                            displayModeBar: true,
                            modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
                            displaylogo: false,
                            toImageButtonOptions: { format: "svg", scale: 1 },
                        }}
                        style={{ width: "100%", height: chartHeight }}
                        useResizeHandler={true}
                        onClick={onChartClick}
                        onInitialized={(_figure: any, gd: any) => setGraphDiv(gd)}
                        onUpdate={(_figure: any, gd: any) => setGraphDiv(gd)}
                    />
                )}

                {/* Table */}
                {isTable && config && <DataTable config={config} />}

                {/* Unsupported */}
                {library !== "plotly" && library !== "table" && library !== "kpi" && (
                    <div className="h-[300px] flex items-center justify-center text-xs text-destructive">
                        Unsupported format: {library}
                    </div>
                )}
            </div>
        </div>
    );
}
