"use client";
import { useState, useMemo, useCallback, useRef, type ReactNode } from "react";
import ReactECharts, { type EChartsInstance } from "echarts-for-react";
import * as echarts from "echarts";
import { Maximize2, Download, Layers, X, ChevronDown } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { regenerateChartOption, AXIS_TYPES, PIE_TYPES, HIERARCHY_TYPES, type SupportedType } from "@/lib/chart-regenerator";
import type { VisualizerBlock } from "@/components/ChartRenderer";
import DataTable from "@/components/DataTable";

// ── Label truncation helper ──────────────────────────────────────────────────
const MAX_LABEL = 22;
const truncate = (s: string) => (!s || s.length <= MAX_LABEL ? s : s.slice(0, MAX_LABEL - 1).trimEnd() + "…");

// ── Register ECharts themes here so they work even when ChartRenderer is only type-imported ──
echarts.registerTheme("datatalk_dark", {
    backgroundColor: "transparent",
    textStyle: { color: "#94a3b8" },
    title: { textStyle: { color: "#e2e8f0", fontSize: 13 }, subtextStyle: { color: "#64748b" } },
    legend: { textStyle: { color: "#94a3b8", fontSize: 11 } },
    tooltip: { backgroundColor: "rgba(13,13,22,0.97)", borderColor: "rgba(124,111,255,0.30)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
    categoryAxis: { axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } }, axisLabel: { color: "#64748b", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
    valueAxis:    { axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } }, axisLabel: { color: "#64748b", fontSize: 11 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
    color: ["#7C6FFF", "#00C9B1", "#F59E0B", "#6366F1", "#EC4899", "#10B981", "#3B82F6", "#F97316"],
});
echarts.registerTheme("datatalk_light", {
    backgroundColor: "transparent",
    textStyle: { color: "#374151" },
    title: { textStyle: { color: "#111827", fontSize: 13 }, subtextStyle: { color: "#6B7280" } },
    legend: { textStyle: { color: "#4B5563", fontSize: 11 } },
    tooltip: { backgroundColor: "rgba(255,255,255,0.97)", borderColor: "rgba(108,95,230,0.30)", textStyle: { color: "#1F2937", fontSize: 12 } },
    categoryAxis: { axisLine: { lineStyle: { color: "#E5E7EB" } }, axisLabel: { color: "#6B7280", fontSize: 11 }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    valueAxis:    { axisLine: { lineStyle: { color: "#E5E7EB" } }, axisLabel: { color: "#6B7280", fontSize: 11 }, splitLine: { lineStyle: { color: "#F3F4F6" } } },
    color: ["#7C6FFF", "#00C9B1", "#F59E0B", "#6366F1", "#EC4899", "#10B981", "#3B82F6", "#F97316"],
});


interface ChartCardProps {
    block: VisualizerBlock;
    index: number;
    groupId: string;
    isDark: boolean;
    onDrilldown?: (column: string, value: string) => void;
    /** Pass explicit rows (inline chat mode) instead of reading from global studio context */
    inlineRows?: Record<string, any>[];
}

const CHART_TYPE_ICONS: { type: SupportedType; label: string; icon: ReactNode }[] = [
    { type: "bar",          label: "Bar",       icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="6" width="3" height="10"/><rect x="6" y="3" width="3" height="13"/><rect x="11" y="1" width="3" height="15"/></svg> },
    { type: "line",         label: "Line",      icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,14 5,6 9,10 13,2"/></svg> },
    { type: "area",         label: "Area",      icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" opacity=".8"><polygon points="1,14 5,6 9,10 13,2 15,14"/></svg> },
    { type: "scatter",      label: "Scatter",   icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="12" r="2"/><circle cx="8" cy="6" r="2"/><circle cx="13" cy="3" r="2"/><circle cx="6" cy="11" r="1.5"/></svg> },
    { type: "horizontal_bar", label: "H-Bar",  icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="10" height="3"/><rect x="0" y="6" width="13" height="3"/><rect x="0" y="11" width="7" height="3"/></svg> },
    { type: "stacked_bar",  label: "Stacked",  icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="10" width="4" height="5" opacity=".5"/><rect x="2" y="6" width="4" height="4" opacity=".8"/><rect x="2" y="3" width="4" height="3"/><rect x="8" y="8" width="4" height="7" opacity=".5"/><rect x="8" y="5" width="4" height="3" opacity=".8"/><rect x="8" y="2" width="4" height="3"/></svg> },
    { type: "radar",        label: "Radar",    icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="8,1 15,12 1,12"/><polygon points="8,4 12,11 4,11" opacity=".5"/></svg> },
    { type: "pie",          label: "Pie",       icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><line x1="8" y1="8" x2="14" y2="8"/><line x1="8" y1="8" x2="11" y2="3"/></svg> },
    { type: "donut",        label: "Donut",    icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/></svg> },
    { type: "treemap",      label: "Treemap",  icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="8" height="8" opacity=".8"/><rect x="10" y="1" width="5" height="4" opacity=".6"/><rect x="10" y="6" width="5" height="3" opacity=".4"/><rect x="1" y="10" width="14" height="5" opacity=".3"/></svg> },
    { type: "funnel",       label: "Funnel",   icon: <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><polygon points="1,2 15,2 11,6 5,6" opacity=".5"/><polygon points="5,7 11,7 9,11 7,11" opacity=".7"/><polygon points="7,12 9,12 8,15 8,15" opacity="1"/></svg> },
];

export default function ChartCard({ block, index, groupId, isDark, onDrilldown, inlineRows }: ChartCardProps) {
    const { filteredRows: globalFilteredRows, activeChartType, setChartType, applyClickFilter, studioData, setDrilldown } = useStudio();
    // In inline-chat mode use per-message rows; in Studio panel use global filtered rows
    const filteredRows = inlineRows ?? globalFilteredRows;
    const [fullscreen, setFullscreen] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const chartRef = useRef<EChartsInstance | null>(null);

    const currentType = (activeChartType[index] || block.chart_type || "bar") as SupportedType;
    const isTable = block.library === "table";
    const isKpi = block.library === "kpi";

    // Which chart type switcher group to show
    const compatibleTypes = useMemo(() => {
        if (PIE_TYPES.includes(currentType)) return CHART_TYPE_ICONS.filter(t => PIE_TYPES.includes(t.type));
        if (HIERARCHY_TYPES.includes(currentType)) return CHART_TYPE_ICONS.filter(t => HIERARCHY_TYPES.includes(t.type));
        return CHART_TYPE_ICONS.filter(t => AXIS_TYPES.includes(t.type));
    }, [currentType]);

    // Regenerate option from filtered rows (live filtering engine)
    const echartsOption = useMemo(() => {
        if (isTable || isKpi) return null;
        const regenerated = block.meta ? regenerateChartOption(block, filteredRows, currentType) : null;
        const baseOption = regenerated || block.config || null;
        if (!baseOption) return null;

        // ── Classify chart type ──────────────────────────────────────────
        const isPie     = currentType === "pie" || currentType === "donut";
        const isHBar    = currentType === "horizontal_bar";
        const isArea    = currentType === "area";
        const isScatter = currentType === "scatter";
        const isRadar   = currentType === "radar";
        const isTreemap = currentType === "treemap";
        const isFunnel  = currentType === "funnel";
        const isAxisChart    = !isPie && !isScatter && !isRadar && !isTreemap && !isFunnel;
        const isItemTooltip  = isPie || isScatter || isRadar || isTreemap || isFunnel;

        // ── Series enhancer ──────────────────────────────────────────────
        const enhanceSeries = (series: any[]) => series.map((s: any) => {
            const e = { ...s };
            if (s.type === "bar") {
                if (!e.itemStyle?.color?.type) {
                    e.itemStyle = {
                        borderRadius: isHBar ? [0, 6, 6, 0] : [6, 6, 0, 0],
                        color: isHBar
                            ? { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "rgba(124,111,255,0.45)" }, { offset: 1, color: "#7C6FFF" }] }
                            : { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#7C6FFF" }, { offset: 1, color: "rgba(124,111,255,0.3)" }] },
                        ...e.itemStyle,
                    };
                }
                if (!e.emphasis) e.emphasis = { itemStyle: { color: "#00C9B1", shadowBlur: 12, shadowColor: "rgba(0,201,177,0.4)" } };
                if (!e.label)    e.label    = { show: true, position: isHBar ? "right" : "top", fontSize: 11, fontWeight: "bold" };
                if (!e.barMaxWidth) e.barMaxWidth = isHBar ? 40 : 48;
            }
            if (s.type === "line" || currentType === "line" || isArea) {
                e.smooth = e.smooth ?? true;
                e.symbol = e.symbol ?? "circle";
                e.symbolSize = e.symbolSize ?? 6;
                e.emphasis = e.emphasis ?? { focus: "series" };
                if (isArea && !e.areaStyle) {
                    e.areaStyle = { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: "rgba(124,111,255,0.35)" }, { offset: 1, color: "rgba(124,111,255,0.02)" }] } };
                }
            }
            if (isPie) {
                e.radius    = currentType === "donut" ? (e.radius ?? ["42%", "70%"]) : (e.radius ?? "65%");
                e.label     = e.label ?? { show: true, formatter: "{b}\n{d}%", fontSize: 11 };
                e.labelLine = e.labelLine ?? { length: 12, length2: 8 };
                e.emphasis  = e.emphasis ?? { itemStyle: { shadowBlur: 16, shadowColor: "rgba(0,0,0,0.3)" }, scaleSize: 8 };
            }
            if (isScatter) {
                e.symbolSize = e.symbolSize ?? 10;
                e.emphasis   = e.emphasis ?? { symbolSize: 16, itemStyle: { shadowBlur: 12, shadowColor: "rgba(124,111,255,0.5)" } };
            }
            if (isTreemap) {
                e.leafDepth  = e.leafDepth  ?? 1;
                e.breadcrumb = e.breadcrumb ?? { show: false };
                e.roam       = e.roam       ?? false;
                e.label      = e.label      ?? { show: true, fontSize: 12, fontWeight: "bold", color: "#fff" };
                e.upperLabel = e.upperLabel ?? { show: false };
                if (!e.itemStyle) e.itemStyle = { borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", gapWidth: 2 };
                e.emphasis   = e.emphasis   ?? { label: { fontSize: 14 }, itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } };
            }
            if (isFunnel) {
                e.label     = e.label     ?? { show: true, position: "inside", fontSize: 12, fontWeight: "bold", color: "#fff" };
                e.itemStyle = e.itemStyle ?? { borderWidth: 1, borderColor: "#fff" };
                e.emphasis  = e.emphasis  ?? { label: { fontSize: 14 } };
            }
            return e;
        });

        // ── Smart label truncation for axes ─────────────────────────────
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

        const patchedXAxis = baseOption.xAxis ? patchAxis(baseOption.xAxis, baseOption.xAxis?.type === "category", false) : baseOption.xAxis;
        const patchedYAxis = baseOption.yAxis ? patchAxis(baseOption.yAxis, baseOption.yAxis?.type === "category", true)  : baseOption.yAxis;

        return {
            ...baseOption,
            xAxis:  patchedXAxis,
            yAxis:  patchedYAxis,
            series: Array.isArray(baseOption.series) ? enhanceSeries(baseOption.series) : baseOption.series,
            tooltip: isItemTooltip
                ? {
                    trigger: "item",
                    ...(isPie ? { formatter: "{b}: <b>{c}</b> ({d}%)" } : {}),
                    ...(typeof baseOption.tooltip === "object" ? baseOption.tooltip : {}),
                  }
                : {
                    trigger: "axis",
                    axisPointer: { type: "shadow", shadowStyle: { color: "rgba(124,111,255,0.06)" } },
                    ...(typeof baseOption.tooltip === "object" ? baseOption.tooltip : {}),
                  },
            grid: isAxisChart ? {
                left: "5%", right: "5%", top: "18%", bottom: isHBar ? "8%" : "12%", containLabel: true,
                ...(typeof baseOption.grid === "object" ? baseOption.grid : {}),
            } : baseOption.grid,
        };
    }, [block, filteredRows, currentType, isTable, isKpi]);

    // Check if the resulting chart data is completely empty or all zeroes
    const isEmptyData = useMemo(() => {
        if (isTable || isKpi || !echartsOption || !echartsOption.series) return false;
        const seriesArr = Array.isArray(echartsOption.series) ? echartsOption.series : [echartsOption.series];
        if (seriesArr.length === 0) return true;
        
        return seriesArr.every((s: any) => {
            if (!Array.isArray(s.data) || s.data.length === 0) return true;
            return s.data.every((d: any) => {
                const val = typeof d === "object" && d !== null ? d.value : d;
                // If the value is an array (scatter usually), check inside
                if (Array.isArray(val)) return val.length === 0 || val.every(v => v === 0);
                return val === 0 || val === null || val === undefined || val === "";
            });
        });
    }, [echartsOption, isTable, isKpi]);


    // Cross-filter click handler
    const handleChartClick = useCallback((params: any) => {
        const clickedValue = String(params.name ?? params.value ?? "");
        const meta = block.meta;

        // Only apply global cross-filter when we are in the Studio panel (no local handler).
        // In inline-chat mode (onDrilldown provided) we must NOT touch global filter state,
        // otherwise the chart stays filtered after the drill modal is dismissed.
        if (!onDrilldown && meta) {
            const colToFilter = meta.category_col || meta.x_col || meta.group_col;
            if (colToFilter && clickedValue) {
                applyClickFilter(colToFilter, clickedValue);
            }
        }

        // Drill-down: local modal (inline) OR global drawer (Studio panel)
        if (clickedValue) {
            if (onDrilldown) {
                const col = block.meta?.x_col || block.meta?.category_col || block.meta?.group_col || "value";
                onDrilldown(col, clickedValue);
            } else if (studioData) {
                const relatedRows = filteredRows.filter(r =>
                    Object.values(r).some(v => String(v) === clickedValue)
                );
                setDrilldown({
                    column: block.meta?.x_col || block.meta?.category_col || "value",
                    value: clickedValue,
                    rows: relatedRows.slice(0, 50),
                    originalSql: studioData.sql,
                });
            }
        }
    }, [block.meta, applyClickFilter, studioData, filteredRows, setDrilldown, onDrilldown]);

    // Export PNG
    const exportPng = useCallback(() => {
        if (!chartRef.current) return;
        const url = chartRef.current.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "transparent" });
        const a = document.createElement("a"); a.href = url; a.download = `${block.title || "chart"}.png`; a.click();
    }, [block.title]);

    // Title extraction
    let headerTitle = block.title || "Visualization";
    if (typeof headerTitle === "object" && (headerTitle as any).text) headerTitle = (headerTitle as any).text;

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
                    {((echartsOption as any)?._truncated) && <span className="text-[9px] bg-foreground/10 px-1.5 py-0.5 rounded-md normal-case font-semibold tracking-normal text-muted-foreground">Top 15</span>}
                </span>

                {/* Type switcher — clearer clickable pill */}
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
                                className="absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 rounded-xl shadow-xl animate-fadein"
                                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border-strong)", backdropFilter: "blur(16px)", minWidth: 120 }}
                                onMouseLeave={() => setShowTypePicker(false)}
                            >
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/40 px-2 pt-0.5 pb-1">Switch to</p>
                                {compatibleTypes.map(ct => (
                                    <button
                                        key={ct.type}
                                        onClick={() => { setChartType(index, ct.type); setShowTypePicker(false); }}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all"
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
                        )}
                    </div>
                )}

                {/* Action buttons */}
                {!isTable && !isKpi && (
                    <button onClick={exportPng} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors" title="Export PNG">
                        <Download className="w-3 h-3" />
                    </button>
                )}
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
                {/* Empty State Overlay */}
                {!isTable && !isKpi && isEmptyData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-10 bg-[var(--glass-bg)]/80 backdrop-blur-sm">
                        <div className="w-10 h-10 mb-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] flex items-center justify-center text-muted-foreground/60">
                            <Layers className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No data available</p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[80%]">
                            The applied filters resulted in empty or zeroed data for this view.
                        </p>
                    </div>
                )}

                {/* ECharts */}
                {!isTable && !isKpi && echartsOption && !isEmptyData && (
                    <ReactECharts
                        ref={(e) => { if (e) chartRef.current = e.getEchartsInstance(); }}
                        option={{
                            ...echartsOption,
                            backgroundColor: "transparent",
                            animation: true,
                            animationDuration: 500,
                            dataZoom: (currentType !== "pie" && currentType !== "donut" && currentType !== "treemap" && currentType !== "funnel" && currentType !== "radar") ? [
                                { type: "inside", start: 0, end: 100 },
                            ] : undefined,
                            toolbox: {
                                show: true,
                                right: 8, top: 4,
                                feature: {
                                    saveAsImage: { show: false }, // we have custom export
                                    restore: { show: true },
                                    dataView: { show: true, readOnly: true },
                                },
                                iconStyle: { borderColor: accentColor, opacity: 0.7 },
                            },
                        }}
                        theme={isDark ? "datatalk_dark" : "datatalk_light"}
                        style={{ height: "100%", width: "100%", minHeight: 220 }}
                        opts={{ renderer: "canvas" }}
                        notMerge
                        onEvents={{
                            click: handleChartClick,
                            legendselectchanged: () => {},
                        }}
                    />
                )}

                {/* Table */}
                {isTable && block.config && (
                    <DataTable config={block.config} />
                )}

                {/* KPI */}
                {isKpi && block.config && (
                    <KpiDisplay config={block.config} title={String(headerTitle)} />
                )}
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
    const delta = config.delta;
    const dir = config.delta_direction || "neutral";
    const deltaColor = dir === "up" ? "#16A34A" : dir === "down" ? "#DC2626" : "var(--color-muted-foreground)";

    return (
        <div className="h-full flex flex-col items-center justify-center py-6">
            <span className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#7C6FFF" }}>{title}</span>
            <span className="text-5xl font-extrabold" style={{ background: "linear-gradient(135deg,#7C6FFF,#00C9B1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {String(value)}
            </span>
            {delta && (
                <div className="flex items-center gap-1 mt-3 text-sm font-semibold" style={{ color: deltaColor }}>
                    {dir === "up" ? "↑" : dir === "down" ? "↓" : "—"} {delta}
                </div>
            )}
        </div>
    );
}
