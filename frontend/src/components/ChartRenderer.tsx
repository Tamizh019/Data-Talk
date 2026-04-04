"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Layers } from "lucide-react";
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
                            toImageButtonOptions: { format: "png", scale: 2 },
                        }}
                        style={{ width: "100%", height: chartHeight }}
                        useResizeHandler={true}
                        onClick={onChartClick}
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
