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
                hole: 0.35,
                marker: { colors: ["#312e81", "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"] },
                textinfo: "label+percent",
                textfont: { color: "#E2E8F0", size: 11 },
                hovertemplate: "%{label}<br>%{value}<br>%{percent}<extra></extra>",
            }];
        }

        const trace: Record<string, unknown> = {
            type: option.plotlyType,
            x: originalTrace.x,
            y: originalTrace.y,
            name: originalTrace.name,
            marker: { color: "#6366f1", opacity: 0.9 }, // Professional solid Indigo 500
        };

        if (option.mode) trace.mode = option.mode;

        if (activeKey === "line") {
            trace.line = { color: "#6366f1", width: 2.5, shape: "spline" };
            trace.marker = { color: "#6366f1", size: 6 };
        }
        if (activeKey === "scatter") {
            trace.marker = { color: "#6366f1", size: 8, opacity: 0.85 };
        }
        if (activeKey === "area") {
            trace.fill = "tozeroy";
            trace.fillcolor = "rgba(99,102,241,0.15)";
            trace.line = { color: "#6366f1", width: 2, shape: "spline" };
        }

        return [trace];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey, config.data, originalTrace]);

    const builtLayout = useMemo(() => {
        const base = config.layout as Record<string, unknown>;
        if (activeKey === "pie") {
            return { ...base, showlegend: true };
        }
        return base;
    }, [activeKey, config.layout]);

    return (
        <div
            className="w-full rounded-xl overflow-hidden mt-3 shadow-lg"
            style={{
                background: "rgba(7, 7, 13, 0.7)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.07)",
            }}
        >
            {/* ── Header ───────────────────────────────────── */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: "rgba(13,13,22,0.9)" }}
                >
                    <div className="flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#7C6FFF" }}>
                            {chartTitle}
                        </span>
                    </div>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>Switch chart type →</span>
                </div>

                {/* Chart Type Switcher */}
                <div
                    className="flex items-center gap-1 px-3 py-1.5"
                    style={{ background: "rgba(13,13,22,0.5)" }}
                >
                    {CHART_OPTIONS.map((opt) => {
                        const isActive = activeKey === opt.key;
                        return (
                            <button
                                key={opt.key}
                                onClick={() => setActiveKey(opt.key)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                                style={{
                                    background: isActive ? "rgba(124,111,255,0.15)" : "transparent",
                                    color: isActive ? "#7C6FFF" : "rgba(255,255,255,0.3)",
                                    border: `1px solid ${isActive ? "rgba(124,111,255,0.3)" : "transparent"}`,
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
                                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                    }
                                }}
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
                    font: { color: "#94a3b8", family: "Inter, sans-serif", size: 11 },
                    margin: { l: 52, r: 20, t: 20, b: 52 },
                    autosize: true,
                    hovermode: "x unified",
                    hoverlabel: {
                        bgcolor: "rgba(13,13,22,0.95)",
                        bordercolor: "rgba(0,201,177,0.4)",
                        font: { color: "#E2E8F0", size: 12 },
                    },
                    xaxis: {
                        gridcolor: "rgba(255,255,255,0.04)",
                        zerolinecolor: "rgba(255,255,255,0.07)",
                        tickfont: { color: "#64748b", size: 11 },
                        linecolor: "rgba(255,255,255,0.05)",
                    },
                    yaxis: {
                        gridcolor: "rgba(255,255,255,0.04)",
                        zerolinecolor: "rgba(255,255,255,0.07)",
                        tickfont: { color: "#64748b", size: 11 },
                        linecolor: "rgba(255,255,255,0.05)",
                    },
                    bargap: 0.3,
                    bargroupgap: 0.1,
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
