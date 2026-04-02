"use client";

import { useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { Layers } from "lucide-react";
import DataTable from "./DataTable";

// ── Label truncation helper ──────────────────────────────────────────────────
const MAX_LABEL = 22;
const truncate = (s: string) => (!s || s.length <= MAX_LABEL ? s : s.slice(0, MAX_LABEL - 1).trimEnd() + "…");

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

        // ── Classify chart type ──────────────────────────────────────────
        const isPie      = chart_type === "pie" || chart_type === "donut";
        const isHBar     = chart_type === "horizontal_bar";
        const isArea     = chart_type === "area";
        const isScatter  = chart_type === "scatter";
        const isRadar    = chart_type === "radar";
        const isTreemap  = chart_type === "treemap";
        const isFunnel   = chart_type === "funnel";
        // Types that need axis-mode tooltip and grid
        const isAxisChart = !isPie && !isScatter && !isRadar && !isTreemap && !isFunnel;
        // Types that need item-mode tooltip (no axis)
        const isItemTooltip = isPie || isScatter || isRadar || isTreemap || isFunnel;

        // ── Series enhancer ──────────────────────────────────────────────
        const enhanceSeries = (series: any[]) => series.map((s: any) => {
            const enhanced = { ...s };

            if (s.type === "bar") {
                if (!enhanced.itemStyle?.color?.type) {
                    enhanced.itemStyle = {
                        borderRadius: isHBar ? [0, 6, 6, 0] : [6, 6, 0, 0],
                        color: isHBar
                            ? { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "rgba(124,111,255,0.45)" }, { offset: 1, color: "#7C6FFF" }] }
                            : { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#7C6FFF" }, { offset: 1, color: "rgba(124,111,255,0.3)" }] },
                        ...enhanced.itemStyle,
                    };
                }
                if (!enhanced.emphasis) enhanced.emphasis = { itemStyle: { color: "#00C9B1", shadowBlur: 12, shadowColor: "rgba(0,201,177,0.4)" } };
                if (!enhanced.label)    enhanced.label    = { show: true, position: isHBar ? "right" : "top", fontSize: 11, fontWeight: "bold" };
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
                    ? (enhanced.radius ?? ["40%", "60%"])
                    : (enhanced.radius ?? "50%");
                enhanced.center     = enhanced.center ?? ["40%", "50%"];
                enhanced.itemStyle  = { ...enhanced.itemStyle, borderRadius: 4, borderColor: "transparent", borderWidth: 2 };
                enhanced.label      = enhanced.label ?? { show: true, formatter: (p: any) => `${truncate(p.name)}\n${p.percent}%`, fontSize: 10 };
                enhanced.labelLine  = enhanced.labelLine ?? { length: 8, length2: 10, smooth: true };
                enhanced.emphasis   = enhanced.emphasis ?? { itemStyle: { shadowBlur: 16, shadowColor: "rgba(0,0,0,0.3)" }, scaleSize: 6 };
            }

            if (isScatter) {
                enhanced.symbolSize = enhanced.symbolSize ?? 10;
                enhanced.emphasis   = enhanced.emphasis ?? { symbolSize: 16, itemStyle: { shadowBlur: 12, shadowColor: "rgba(124,111,255,0.5)" } };
            }

            if (isTreemap) {
                enhanced.leafDepth  = enhanced.leafDepth  ?? 1;
                enhanced.breadcrumb = enhanced.breadcrumb ?? { show: false };
                enhanced.roam       = enhanced.roam       ?? false;
                enhanced.label      = enhanced.label      ?? { show: true, fontSize: 12, fontWeight: "bold", color: "#fff" };
                enhanced.upperLabel = enhanced.upperLabel ?? { show: false };
                // itemStyle at series level only (NOT per data node — that causes ECharts 'push' crash)
                if (!enhanced.itemStyle) enhanced.itemStyle = { borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", gapWidth: 2 };
                enhanced.emphasis   = enhanced.emphasis   ?? { label: { fontSize: 14 }, itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } };
            }

            if (isFunnel) {
                enhanced.label    = enhanced.label    ?? { show: true, position: "inside", fontSize: 12, fontWeight: "bold", color: "#fff" };
                enhanced.itemStyle = enhanced.itemStyle ?? { borderWidth: 1, borderColor: "#fff" };
                enhanced.emphasis  = enhanced.emphasis  ?? { label: { fontSize: 14 } };
            }

            return enhanced;
        });

        const enhancedSeries = Array.isArray(baseOption.series)
            ? enhanceSeries(baseOption.series)
            : baseOption.series;

        // ── Smart axis label truncation ──────────────────────────────────
        const patchAxis = (axis: any, isCategory: boolean, isHoriz = false) => {
            if (!axis || !isCategory) return axis;
            const patched = { ...axis };
            const catCount = Array.isArray(patched.data) ? patched.data.length : 0;
            const maxLen   = Array.isArray(patched.data) ? Math.max(...patched.data.map((d: any) => String(d).length)) : 0;
            patched.axisLabel = {
                ...patched.axisLabel,
                formatter: (v: string) => truncate(v),
                rotate: !isHoriz && (catCount > 6 || maxLen > 15) ? 25 : 0,
                fontSize: 11,
                overflow: "truncate",
                width: isHoriz ? 120 : 80,
            };
            return patched;
        };

        const xAxis = baseOption.xAxis ? patchAxis(baseOption.xAxis, baseOption.xAxis?.type === "category", false) : baseOption.xAxis;
        const yAxis = baseOption.yAxis ? patchAxis(baseOption.yAxis, baseOption.yAxis?.type === "category", true)  : baseOption.yAxis;

        // ── Tooltip — per type ───────────────────────────────────────────
        const tooltipOverride = isItemTooltip
            ? {
                trigger: "item",
                ...(isPie ? { formatter: "{b}: <b>{c}</b> ({d}%)" } : {}),
                ...(typeof baseOption.tooltip === "object" ? baseOption.tooltip : {}),
              }
            : {
                trigger: "axis",
                axisPointer: { type: "shadow", shadowStyle: { color: "rgba(124,111,255,0.06)" } },
                ...(typeof baseOption.tooltip === "object" ? baseOption.tooltip : {}),
              };

        // ── Legend ───────────────────────────────────────────────────────
        const legendOverride = {
            type: "scroll",
            orient: isPie ? "vertical" : "horizontal",
            right: isPie ? 5 : "auto",
            top: isPie ? 20 : "auto",
            bottom: !isPie ? 0 : "auto",
            formatter: (name: string) => truncate(name),
            textStyle: { width: 100, overflow: "truncate" as const },
            ...(typeof baseOption.legend === "object" ? baseOption.legend : {}),
        };

        // ── Grid — only for axis-based charts ───────────────────────────
        const gridOverride = isAxisChart ? {
            left: "5%", right: "5%", top: "18%",
            bottom: isHBar ? "8%" : "12%",
            containLabel: true,
            ...(typeof baseOption.grid === "object" ? baseOption.grid : {}),
        } : baseOption.grid;

        return {
            ...baseOption,
            xAxis,
            yAxis,
            series: enhancedSeries,
            backgroundColor: "transparent",
            animation: true,
            animationDuration: 900,
            animationEasing: "cubicOut",
            animationDurationUpdate: 500,
            legend: legendOverride,
            tooltip: tooltipOverride,
            grid: gridOverride,
        };
    }, [block, library, chart_type, config]);

    // Check if the resulting chart data is completely empty or all zeroes
    const isEmptyData = useMemo(() => {
        if (library === "table" || library === "kpi" || !echartsOption || !echartsOption.series) return false;
        const seriesArr = Array.isArray(echartsOption.series) ? echartsOption.series : [echartsOption.series];
        if (seriesArr.length === 0) return true;
        
        return seriesArr.every((s: any) => {
            if (!Array.isArray(s.data) || s.data.length === 0) return true;
            return s.data.every((d: any) => {
                const val = typeof d === "object" && d !== null ? d.value : d;
                if (Array.isArray(val)) return val.length === 0 || val.every(v => v === 0);
                return val === 0 || val === null || val === undefined || val === "";
            });
        });
    }, [echartsOption, library]);

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
            <div className={`p-2 relative ${isTable ? "max-h-[500px] overflow-y-auto" : ""}`}>
                {/* Empty State Overlay */}
                {library === "echarts" && isEmptyData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 bg-[var(--glass-bg)]/80 backdrop-blur-sm h-[280px]">
                        <div className="w-10 h-10 mb-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] flex items-center justify-center text-muted-foreground/60">
                            <Layers className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No data available</p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[80%]">
                            This metric currently has no data.
                        </p>
                    </div>
                )}

                {library === "echarts" && echartsOption && !isEmptyData && (
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
