"use client";

import { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import DataTable from "./DataTable";

// Register dark theme
echarts.registerTheme("datatalk_dark", {
    backgroundColor: "transparent",
    textStyle: { color: "#94a3b8" },
    title: {
        textStyle: { color: "#e2e8f0", fontSize: 13, fontWeight: 600 },
        subtextStyle: { color: "#64748b", fontSize: 11 },
    },
    legend: {
        textStyle: { color: "#94a3b8", fontSize: 11 },
    },
    tooltip: {
        backgroundColor: "rgba(13, 13, 22, 0.95)",
        borderColor: "rgba(124, 111, 255, 0.3)",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
    },
    categoryAxis: {
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisTick: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisLabel: { color: "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    valueAxis: {
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisTick: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisLabel: { color: "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
});

export interface VisualizerBlock {
    library: string;
    title?: string;
    chart_type?: string;
    config?: any;
    [key: string]: any;
}

interface ChartRendererProps {
    block: VisualizerBlock;
}

export default function ChartRenderer({ block }: ChartRendererProps) {
    if (!block) return null;

    // Dispatch KPI to DashboardPanel (rendered outside this card)
    if (block.library === "kpi" || block.chart_type === "kpi_card") {
        return null;
    }

    const { title, chart_type, config } = block;
    const library = block.library || "echarts";

    // Handle ECharts
    const echartsOption = useMemo(() => {
        if (library !== "echarts") return null;
        
        // Support both nested `config` and legacy flat structures
        const baseOption = config || block;
        
        return {
            ...baseOption,
            backgroundColor: "transparent",
            animation: true,
            animationDuration: 800,
            animationEasing: "cubicOut",
            animationDurationUpdate: 500,
            tooltip: {
                trigger: chart_type === "pie" ? "item" : "axis",
                backgroundColor: "rgba(13, 13, 22, 0.95)",
                borderColor: "rgba(124, 111, 255, 0.3)",
                borderWidth: 1,
                textStyle: { color: "#e2e8f0", fontSize: 12 },
                ...(typeof baseOption.tooltip === "object" ? baseOption.tooltip : {}),
            },
            grid: {
                left: "8%",
                right: "5%",
                top: "15%",
                bottom: "12%",
                containLabel: true,
                ...(typeof baseOption.grid === "object" ? baseOption.grid : {}),
            },
        };
    }, [block, library, chart_type, config]);

    // Handle Drill-down Events for ECharts
    const onChartClick = useCallback((params: any) => {
        console.log("[Analytical Drill-down] User clicked:", params.name, params.value);
        // Dispatch custom event that ChatWindow can catch if we want to auto-filter queries
        const drilldownEvent = new CustomEvent("chart-drilldown", {
            detail: { name: params.name, value: params.value, series: params.seriesName }
        });
        window.dispatchEvent(drilldownEvent);
    }, []);

    const onEvents = {
        'click': onChartClick
    };

    let headerTitle = "Visualization";
    if (typeof title === "string") {
        headerTitle = title;
    } else if (title && typeof title === "object" && (title as any).text) {
        headerTitle = (title as any).text;
    } else if (config && config.title?.text) {
        headerTitle = config.title.text;
    }

    return (
        <div
            className="w-full rounded-xl overflow-hidden shadow-lg flex flex-col"
            style={{
                background: "rgba(7, 7, 13, 0.7)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.07)",
            }}
        >
            {/* ── Header ───────────────────────────────────── */}
            <div
                className="flex items-center gap-2 px-4 py-2.5 shrink-0"
                style={{
                    background: "rgba(13,13,22,0.9)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                {library === "table" ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00C9B1" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                )}
                
                <span
                    className="text-[11px] font-bold uppercase tracking-wider truncate"
                    style={{ color: library === "table" ? "#00C9B1" : "#7C6FFF" }}
                >
                    {headerTitle}
                </span>
                <span
                    className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{
                        background: library === "table" ? "rgba(0,201,177,0.1)" : "rgba(124,111,255,0.1)",
                        color: library === "table" ? "rgba(0,201,177,0.8)" : "rgba(124,111,255,0.6)",
                        border: `1px solid ${library === "table" ? "rgba(0,201,177,0.2)" : "rgba(124,111,255,0.15)"}`,
                    }}
                >
                    {library === "echarts" ? chart_type || "chart" : library}
                </span>
            </div>

            {/* ── Render Dispatcher ────────────────────────── */}
            <div className={`p-2 ${library === "table" ? "max-h-[500px] overflow-y-auto custom-scrollbar" : ""}`}>
                {library === "echarts" && echartsOption && (
                    <ReactECharts
                        option={echartsOption}
                        theme="datatalk_dark"
                        style={{ height: 280, width: "100%" }}
                        opts={{ renderer: "canvas" }}
                        notMerge={true}
                        onEvents={onEvents}
                    />
                )}
                {library === "table" && config && (
                    <DataTable config={config} />
                )}
                {library !== "echarts" && library !== "table" && library !== "kpi" && (
                    <div className="h-[280px] flex items-center justify-center text-xs text-red-400">
                        Unsupported library or config format: {library}
                    </div>
                )}
            </div>
        </div>
    );
}
