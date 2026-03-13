"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

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

export interface EChartsConfig {
    chart_type: string;
    title?: string;
    [key: string]: unknown;
}

interface ChartRendererProps {
    config: EChartsConfig;
}

export default function ChartRenderer({ config }: ChartRendererProps) {
    if (!config) return null;

    // KPI Card is rendered separately (not an ECharts chart)
    if (config.chart_type === "kpi_card") {
        return null; // Handled by KpiCard component in DashboardPanel
    }

    const option = useMemo(() => {
        // Clone config and remove our custom fields + ECharts title (we render our own header)
        const { chart_type, title, ...echartsOption } = config;

        // Ensure animation is enabled with professional settings
        return {
            ...echartsOption,
            backgroundColor: "transparent",
            animation: true,
            animationDuration: 800,
            animationEasing: "cubicOut" as const,
            animationDurationUpdate: 500,
            // Ensure tooltip exists
            tooltip: {
                trigger: chart_type === "pie" ? "item" : "axis",
                backgroundColor: "rgba(13, 13, 22, 0.95)",
                borderColor: "rgba(124, 111, 255, 0.3)",
                borderWidth: 1,
                textStyle: { color: "#e2e8f0", fontSize: 12 },
                ...(typeof echartsOption.tooltip === "object" ? echartsOption.tooltip : {}),
            },
            // Professional grid margins
            grid: {
                left: "8%",
                right: "5%",
                top: "15%",
                bottom: "12%",
                containLabel: true,
                ...(typeof echartsOption.grid === "object" ? echartsOption.grid : {}),
            },
        };
    }, [config]);

    // ECharts title can be a string OR an object {text, textStyle} — extract safely
    const rawTitle = config.title;
    const chartTitle: string =
        typeof rawTitle === "string"
            ? rawTitle
            : rawTitle && typeof rawTitle === "object" && "text" in (rawTitle as object)
                ? String((rawTitle as Record<string, unknown>).text)
                : config.chart_type || "Chart";

    return (
        <div
            className="w-full rounded-xl overflow-hidden shadow-lg"
            style={{
                background: "rgba(7, 7, 13, 0.7)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.07)",
            }}
        >
            {/* ── Header ───────────────────────────────────── */}
            <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{
                    background: "rgba(13,13,22,0.9)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "#7C6FFF" }}
                >
                    {chartTitle}
                </span>
                <span
                    className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                        background: "rgba(124,111,255,0.1)",
                        color: "rgba(124,111,255,0.6)",
                        border: "1px solid rgba(124,111,255,0.15)",
                    }}
                >
                    {config.chart_type}
                </span>
            </div>

            {/* ── Chart ────────────────────────────────────── */}
            <div className="p-2">
                <ReactECharts
                    option={option}
                    theme="datatalk_dark"
                    style={{ height: 280, width: "100%" }}
                    opts={{ renderer: "canvas" }}
                    notMerge={true}
                />
            </div>
        </div>
    );
}
