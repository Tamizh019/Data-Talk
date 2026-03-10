"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { PlotlyConfig } from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ChartRendererProps {
    config: PlotlyConfig;
}

type ChartTypeOption = {
    key: string;
    label: string;
    icon: React.ReactNode;
    plotlyType: string;
    mode?: string;
};

const CHART_OPTIONS: ChartTypeOption[] = [
    {
        key: "bar",
        label: "Bar",
        plotlyType: "bar",
        icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
    },
    {
        key: "line",
        label: "Line",
        plotlyType: "scatter",
        mode: "lines+markers",
        icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 20 9 4 6 12 2 12" />
            </svg>
        ),
    },
    {
        key: "area",
        label: "Area",
        plotlyType: "scatter",
        mode: "lines",
        icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" /><path d="M3 15l6-6 4 4 5-5" />
            </svg>
        ),
    },
    {
        key: "scatter",
        label: "Scatter",
        plotlyType: "scatter",
        mode: "markers",
        icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="16" r="1.5" fill="currentColor" />
                <circle cx="12" cy="9" r="1.5" fill="currentColor" />
                <circle cx="17" cy="14" r="1.5" fill="currentColor" />
                <circle cx="5" cy="11" r="1.5" fill="currentColor" />
                <circle cx="15" cy="5" r="1.5" fill="currentColor" />
            </svg>
        ),
    },
    {
        key: "pie",
        label: "Pie",
        plotlyType: "pie",
        icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
        ),
    },
];

export default function ChartRenderer({ config }: ChartRendererProps) {
    if (!config?.data?.length) return null;

    // Detect the current chart type from the original backend config
    const originalType = (config.data[0] as { type?: string }).type ?? "bar";
    const [activeKey, setActiveKey] = useState<string>(
        originalType === "histogram" ? "bar" : originalType
    );

    const chartTitle = (config.layout as { title?: { text?: string } }).title?.text ?? "Chart";
    const originalTrace = config.data[0] as {
        type?: string;
        x?: unknown[];
        y?: unknown[];
        labels?: unknown[];
        values?: unknown[];
        name?: string;
        marker?: object;
    };

    const builtTrace = useMemo(() => {
        const option = CHART_OPTIONS.find((o) => o.key === activeKey);
        if (!option) return config.data;

        if (activeKey === "pie") {
            return [{
                type: "pie",
                labels: originalTrace.x ?? [],
                values: originalTrace.y ?? [],
                hole: 0.3,
                marker: { colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#7c3aed", "#4c1d95"] },
                textinfo: "label+percent",
                hovertemplate: "%{label}<br>%{value}<br>%{percent}<extra></extra>",
            }];
        }

        const trace: Record<string, unknown> = {
            type: option.plotlyType,
            x: originalTrace.x,
            y: originalTrace.y,
            name: originalTrace.name,
            marker: { color: "#6366f1", opacity: 0.9 },
        };

        if (option.mode) trace.mode = option.mode;

        if (activeKey === "line") {
            trace.line = { color: "#6366f1", width: 2 };
            trace.marker = { color: "#6366f1", size: 5 };
        }
        if (activeKey === "area") {
            trace.fill = "tozeroy";
            trace.fillcolor = "rgba(99,102,241,0.15)";
            trace.line = { color: "#6366f1", width: 2 };
        }

        return [trace];
    }, [activeKey, config.data, originalTrace]);

    const builtLayout = useMemo(() => {
        const base = config.layout as Record<string, unknown>;
        if (activeKey === "pie") {
            return { ...base, showlegend: true };
        }
        return base;
    }, [activeKey, config.layout]);

    return (
        <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 mt-3 shadow-sm">
            {/* ── Header ───────────────────────────────────── */}
            <div className="flex flex-col gap-0 border-b border-zinc-800">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80">
                    <div className="flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            {chartTitle}
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-600">Switch chart type →</span>
                </div>

                {/* ── Chart Type Switcher ───────────────────── */}
                <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900/40">
                    {CHART_OPTIONS.map((opt) => {
                        const isActive = activeKey === opt.key;
                        return (
                            <button
                                key={opt.key}
                                onClick={() => setActiveKey(opt.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all
                                    ${isActive
                                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 border border-transparent"
                                    }`}
                            >
                                {opt.icon}
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Chart ────────────────────────────────────── */}
            <Plot
                data={builtTrace as Plotly.Data[]}
                layout={{
                    ...(builtLayout as Partial<Plotly.Layout>),
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    font: { color: "#94a3b8", family: "Inter, sans-serif", size: 12 },
                    margin: { l: 52, r: 20, t: 20, b: 52 },
                    autosize: true,
                    hovermode: "x unified",
                    hoverlabel: {
                        bgcolor: "#18181b",
                        bordercolor: "#3f3f46",
                        font: { color: "#e4e4e7", size: 12 },
                    },
                }}
                config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d", "select2d"],
                }}
                style={{ width: "100%", minHeight: 300 }}
                useResizeHandler
            />
        </div>
    );
}
