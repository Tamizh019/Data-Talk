"use client";

import { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import DataTable from "./DataTable";

// ── Dark theme (used in dark mode) ──────────────────────────────────────────
echarts.registerTheme("datatalk_dark", {
    backgroundColor: "transparent",
    textStyle: { color: "#94a3b8" },
    title: {
        textStyle: { color: "#e2e8f0", fontSize: 13, fontWeight: 600 },
        subtextStyle: { color: "#64748b", fontSize: 11 },
    },
    legend: { textStyle: { color: "#94a3b8", fontSize: 11 } },
    tooltip: {
        backgroundColor: "rgba(13, 13, 22, 0.97)",
        borderColor: "rgba(124, 111, 255, 0.30)",
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
    color: ["#7C6FFF", "#00C9B1", "#F59E0B", "#6366F1", "#EC4899", "#10B981"],
});

// ── Light theme (used in light mode) ────────────────────────────────────────
echarts.registerTheme("datatalk_light", {
    backgroundColor: "transparent",
    textStyle: { color: "#374151" },
    title: {
        textStyle: { color: "#111827", fontSize: 13, fontWeight: 600 },
        subtextStyle: { color: "#6B7280", fontSize: 11 },
    },
    legend: { textStyle: { color: "#4B5563", fontSize: 11 } },
    tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.97)",
        borderColor: "rgba(108, 95, 230, 0.30)",
        textStyle: { color: "#1F2937", fontSize: 12 },
    },
    categoryAxis: {
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisTick: { lineStyle: { color: "#E5E7EB" } },
        axisLabel: { color: "#6B7280", fontSize: 11 },
        splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    valueAxis: {
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisTick: { lineStyle: { color: "#E5E7EB" } },
        axisLabel: { color: "#6B7280", fontSize: 11 },
        splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    color: ["#7C6FFF", "#00C9B1", "#F59E0B", "#6366F1", "#EC4899", "#10B981"],
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
    if (block.library === "kpi" || block.chart_type === "kpi_card") return null;

    const { title, chart_type, config } = block;
    const library = block.library || "echarts";

    const echartsOption = useMemo(() => {
        if (library !== "echarts") return null;
        
        // Recursively strip exact color properties so the Theme can manage them
        const stripThemeOverrides = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(stripThemeOverrides);
            if (obj !== null && typeof obj === "object") {
                const cleaned: any = {};
                for (const key in obj) {
                    if (key === "textStyle" || key === "axisLine" || key === "splitLine") continue;
                    if (key === "axisLabel" || key === "label") {
                        const lbl = { ...obj[key] };
                        delete lbl.color;
                        cleaned[key] = stripThemeOverrides(lbl);
                    } else if (key === "backgroundColor") {
                        continue;
                    } else {
                        cleaned[key] = stripThemeOverrides(obj[key]);
                    }
                }
                return cleaned;
            }
            return obj;
        };

        const baseOption = stripThemeOverrides(config || block);
        const isPie = chart_type === "pie" || chart_type === "donut";
        const isHBar = chart_type === "horizontal_bar";
        const isArea = chart_type === "area";
        const isLine = chart_type === "line";
        const isScatter = chart_type === "scatter";

        // ── Tableau-grade series enhancer ───────────────────────────────────
        const enhanceSeries = (series: any[]) => series.map((s: any) => {
            const enhanced = { ...s };

            if (s.type === "bar") {
                // Gradient fill + rounded tops
                if (!enhanced.itemStyle?.color?.type) {
                    enhanced.itemStyle = {
                        borderRadius: isHBar ? [0, 6, 6, 0] : [6, 6, 0, 0],
                        color: isHBar
                            ? { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "rgba(124,111,255,0.45)" }, { offset: 1, color: "#7C6FFF" }] }
                            : { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#7C6FFF" }, { offset: 1, color: "rgba(124,111,255,0.3)" }] },
                        ...enhanced.itemStyle,
                    };
                }
                // Emphasis glow
                if (!enhanced.emphasis) {
                    enhanced.emphasis = { itemStyle: { color: "#00C9B1", shadowBlur: 12, shadowColor: "rgba(0,201,177,0.4)" } };
                }
                // Labels
                if (!enhanced.label) {
                    enhanced.label = { show: true, position: isHBar ? "right" : "top", fontSize: 11, fontWeight: "bold" };
                }
                if (!enhanced.barMaxWidth) enhanced.barMaxWidth = isHBar ? 40 : 48;
            }

            if (s.type === "line" || isArea) {
                enhanced.smooth = enhanced.smooth ?? true;
                enhanced.symbol = enhanced.symbol ?? "circle";
                enhanced.symbolSize = enhanced.symbolSize ?? 6;
                enhanced.emphasis = enhanced.emphasis ?? { focus: "series" };
                if (isArea && !enhanced.areaStyle) {
                    enhanced.areaStyle = {
                        color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [{ offset: 0, color: "rgba(124,111,255,0.35)" }, { offset: 1, color: "rgba(124,111,255,0.02)" }] }
                    };
                }
            }

            if (isPie) {
                enhanced.radius = chart_type === "donut"
                    ? (enhanced.radius ?? ["42%", "70%"])
                    : (enhanced.radius ?? "65%");
                enhanced.label = enhanced.label ?? { show: true, formatter: "{b}\n{d}%", fontSize: 11 };
                enhanced.labelLine = enhanced.labelLine ?? { length: 12, length2: 8 };
                enhanced.emphasis = enhanced.emphasis ?? { itemStyle: { shadowBlur: 16, shadowColor: "rgba(0,0,0,0.3)" }, scaleSize: 8 };
            }

            if (isScatter) {
                enhanced.symbolSize = enhanced.symbolSize ?? 10;
                enhanced.emphasis = enhanced.emphasis ?? { symbolSize: 16, itemStyle: { shadowBlur: 12, shadowColor: "rgba(124,111,255,0.5)" } };
            }

            return enhanced;
        });

        const enhancedSeries = Array.isArray(baseOption.series)
            ? enhanceSeries(baseOption.series)
            : baseOption.series;

        return {
            ...baseOption,
            series: enhancedSeries,
            backgroundColor: "transparent",
            animation: true,
            animationDuration: 900,
            animationEasing: "cubicOut",
            animationDurationUpdate: 500,
            tooltip: {
                trigger: isPie ? "item" : "axis",
                axisPointer: isPie ? undefined : { type: "shadow", shadowStyle: { color: "rgba(124,111,255,0.06)" } },
                formatter: isPie ? "{b}: <b>{c}</b> ({d}%)" : undefined,
                ...(typeof baseOption.tooltip === "object" ? baseOption.tooltip : {}),
            },
            grid: isPie || isScatter ? baseOption.grid : {
                left: "5%", right: "5%", top: "18%", bottom: "8%", containLabel: true,
                ...(typeof baseOption.grid === "object" ? baseOption.grid : {}),
            },
        };
    }, [block, library, chart_type, config]);


    const onChartClick = useCallback((params: any) => {
        window.dispatchEvent(new CustomEvent("chart-drilldown", {
            detail: { name: params.name, value: params.value, series: params.seriesName },
        }));
    }, []);

    let headerTitle = "Visualization";
    if (typeof title === "string") headerTitle = title;
    else if (title && typeof title === "object" && (title as any).text) headerTitle = (title as any).text;
    else if (config?.title?.text) headerTitle = config.title.text;

    const isTable = library === "table";
    const accentColor = isTable ? "#00C9B1" : "#7C6FFF";
    const tagBg = isTable ? "rgba(0,201,177,0.10)" : "rgba(124,111,255,0.10)";
    const tagBorder = isTable ? "rgba(0,201,177,0.25)" : "rgba(124,111,255,0.20)";

    // Detect current theme from html element
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const echartsTheme = isDark ? "datatalk_dark" : "datatalk_light";

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
            <div className={`p-2 ${isTable ? "max-h-[500px] overflow-y-auto" : ""}`}>
                {library === "echarts" && echartsOption && (
                    <ReactECharts
                        option={echartsOption}
                        theme={echartsTheme}
                        style={{ height: 280, width: "100%" }}
                        opts={{ renderer: "canvas" }}
                        notMerge={true}
                        onEvents={{ click: onChartClick }}
                    />
                )}
                {isTable && config && <DataTable config={config} />}
                {library !== "echarts" && library !== "table" && library !== "kpi" && (
                    <div className="h-[280px] flex items-center justify-center text-xs text-destructive">
                        Unsupported format: {library}
                    </div>
                )}
            </div>
        </div>
    );
}
