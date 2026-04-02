"use client";
/**
 * DashboardStudio — Full-width chart canvas with inline horizontal filter bar.
 * No left sidebar. Filters appear above charts in a compact pill/slider row.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GridLayoutModule = require("react-grid-layout");
const GL = (GridLayoutModule.default ?? GridLayoutModule) as any;
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { X, RefreshCw, Database, SlidersHorizontal, MessageSquare, BarChart2, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useStudio, type FilterValue, type RangeFilter, type MultiSelectFilter } from "@/lib/studio-context";
import ChartCard from "./ChartCard";
import DrillDownDrawer from "./DrillDownDrawer";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const GRID_COLS = 12;

interface DashboardStudioProps {
    isDark: boolean;
}

export default function DashboardStudio({ isDark }: DashboardStudioProps) {
    const {
        activeEntry, filteredRows, filters, setFilter, clearAllFilters,
        drilldown, setDrilldown,
    } = useStudio();

    const [showFilters, setShowFilters] = useState(false);
    const [layouts, setLayouts] = useState<any[]>([]);
    const [containerWidth, setContainerWidth] = useState(900);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Measure canvas width
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
        ro.observe(el);
        setContainerWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    const charts = activeEntry?.charts ?? [];

    // Smart layout: KPIs in a top row, then wide then 2-col
    const defaultLayout: any[] = useMemo(() => {
        return charts.map((chart, i) => {
            const isKpi = chart.library === "kpi";
            const isTable = chart.library === "table";
            const isWide = isTable || chart.chart_type === "line" || chart.chart_type === "area";

            const w = isKpi ? 4 : isWide ? 12 : 6;
            const h = isKpi ? 5 : isTable ? 10 : 9;   // taller rows = bigger charts

            const kpisBefore = charts.slice(0, i).filter(c => c.library === "kpi").length;
            const nonKpisBefore = charts.slice(0, i).filter(c => c.library !== "kpi").length;
            const totalKpis = charts.filter(c => c.library === "kpi").length;
            const kpiRows = Math.ceil(totalKpis / 3) * 5;

            let x = 0, y = 0;
            if (isKpi) {
                x = (kpisBefore % 3) * 4;
                y = Math.floor(kpisBefore / 3) * 5;
            } else {
                x = isWide ? 0 : (nonKpisBefore % 2) * 6;
                y = kpiRows + Math.floor(nonKpisBefore / (isWide ? 1 : 2)) * 9;
            }
            return { i: String(i), x, y, w, h, minW: 3, minH: 4 };
        });
    }, [charts]);

    useEffect(() => {
        if (charts.length > 0) setLayouts(defaultLayout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeEntry?.id]);

    const activeFilterCount = Object.keys(filters).length;
    const isFiltering = activeFilterCount > 0;
    const totalRows = activeEntry?.rawRows?.length ?? 0;
    const meta = activeEntry?.columnMeta ?? [];

    // ── Empty State ──────────────────────────────────────────────────────────────
    if (!activeEntry) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-8 px-8 text-center"
                style={{ background: "var(--page-bg)" }}>
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-2xl animate-pulse"
                        style={{ background: "rgba(124,111,255,0.07)", border: "1px solid rgba(124,111,255,0.14)" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart2 className="w-9 h-9" style={{ color: "#7C6FFF", opacity: 0.40 }} />
                    </div>
                </div>
                <div className="space-y-2 max-w-xs">
                    <h3 className="text-[16px] font-bold text-foreground">No query yet</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                        Ask a question in the chat and your results will appear here as an interactive dashboard.
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-3 max-w-[360px] w-full">
                    {[
                        { icon: <BarChart2 className="w-5 h-5" />, label: "Smart Charts", sub: "Up to 8 auto-selected", c: "#7C6FFF" },
                        { icon: <SlidersHorizontal className="w-5 h-5" />, label: "Live Filters", sub: "No re-querying", c: "#00C9B1" },
                        { icon: <Zap className="w-5 h-5" />, label: "Drill-Down", sub: "Click any element", c: "#F59E0B" },
                    ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                            <span style={{ color: f.c }}>{f.icon}</span>
                            <span className="text-[11px] font-bold text-foreground">{f.label}</span>
                            <span className="text-[10px] text-muted-foreground">{f.sub}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Dashboard ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div
                className="shrink-0 flex items-center gap-2 px-4 py-2 border-b flex-wrap"
                style={{ background: "var(--glass-bg)", borderColor: "var(--glass-border)" }}
            >
                {/* Filter toggle pill */}
                <button
                    onClick={() => setShowFilters(f => !f)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={{
                        background: showFilters ? "rgba(124,111,255,0.10)" : "var(--glass-bg-hover)",
                        color: showFilters ? "#7C6FFF" : "var(--color-muted-foreground)",
                        border: `1px solid ${showFilters ? "rgba(124,111,255,0.30)" : "var(--glass-border)"}`,
                    }}
                >
                    <SlidersHorizontal className="w-3 h-3" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                            style={{ background: "#7C6FFF" }}>
                            {activeFilterCount}
                        </span>
                    )}
                    {showFilters ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>

                {/* Row count */}
                <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-muted-foreground/50" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                        {isFiltering ? (
                            <>
                                <span className="font-bold" style={{ color: "#7C6FFF" }}>{filteredRows.length}</span>
                                {" / "}{totalRows} rows
                            </>
                        ) : (
                            <><span className="font-bold text-foreground">{totalRows}</span> rows</>
                        )}
                    </span>
                    {isFiltering && (
                        <button onClick={clearAllFilters}
                            className="flex items-center gap-0.5 text-[10px] text-red-400 hover:opacity-80">
                            <X className="w-2.5 h-2.5" /> Clear
                        </button>
                    )}
                </div>

                {/* Linked question breadcrumb */}
                {activeEntry.question && (
                    <div className="hidden lg:flex items-center gap-1.5 flex-1 min-w-0 ml-2">
                        <MessageSquare className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                        <span className="text-[10px] text-muted-foreground/50 truncate italic">
                            {activeEntry.question}
                        </span>
                    </div>
                )}

                {/* Reset grid */}
                <button
                    onClick={() => setLayouts(defaultLayout)}
                    className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                    <RefreshCw className="w-3 h-3" /> Reset
                </button>
            </div>

            {/* ── Inline Filter Bar (collapsible) ─────────────────────────── */}
            {showFilters && meta.length > 0 && (
                <div
                    className="shrink-0 border-b overflow-x-auto"
                    style={{
                        background: "var(--glass-bg)",
                        borderColor: "var(--glass-border)",
                        scrollbarWidth: "none",
                    }}
                >
                    <div className="flex items-start gap-6 px-4 py-3" style={{ minWidth: "max-content" }}>
                        {/* Categorical multi-select filters */}
                        {meta
                            .filter(m => m.type === "categorical" && (m.uniqueValues?.length ?? 0) > 1 && (m.uniqueValues?.length ?? 0) <= 30)
                            .map(m => {
                                const current = filters[m.name] as MultiSelectFilter | undefined;
                                const selected = current?.selected ?? new Set<string>();
                                return (
                                    <div key={m.name} className="flex flex-col gap-1.5 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                                {m.name}
                                            </span>
                                            {selected.size > 0 && (
                                                <button onClick={() => setFilter(m.name, null)}
                                                    className="text-[9px] text-muted-foreground/50 hover:text-red-400 transition-colors flex items-center gap-0.5">
                                                    <X className="w-2 h-2" /> Clear
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                            {(m.uniqueValues ?? []).map(v => {
                                                const active = selected.has(v);
                                                return (
                                                    <button
                                                        key={v}
                                                        onClick={() => {
                                                            const next = new Set(selected);
                                                            if (next.has(v)) next.delete(v); else next.add(v);
                                                            if (next.size === 0) setFilter(m.name, null);
                                                            else setFilter(m.name, { type: "multiselect", selected: next });
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                                                        style={{
                                                            background: active ? "rgba(124,111,255,0.18)" : "var(--glass-bg-hover)",
                                                            color: active ? "#7C6FFF" : "var(--color-muted-foreground)",
                                                            border: active ? "1px solid rgba(124,111,255,0.45)" : "1px solid var(--glass-border)",
                                                            fontWeight: active ? 700 : 400,
                                                        }}
                                                    >
                                                        {v}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                        {/* Divider between categorical and range if both exist */}
                        {meta.some(m => m.type === "categorical" && (m.uniqueValues?.length ?? 0) > 1) &&
                            meta.some(m => m.type === "numeric") && (
                                <div className="w-px self-stretch bg-border/40 shrink-0 mx-1" />
                            )}

                        {/* Range sliders */}
                        {meta
                            .filter(m => m.type === "numeric")
                            .map((m, i) => {
                                const min = m.min ?? 0;
                                const max = m.max ?? 100;
                                const current = filters[m.name] as RangeFilter | undefined;
                                const currentMin = current?.currentMin ?? min;
                                const currentMax = current?.currentMax ?? max;
                                const color = i % 2 === 0 ? "#7C6FFF" : "#00C9B1";
                                const themeStyle = { "--thumb-color": color } as React.CSSProperties;
                                const isActive = currentMin > min || currentMax < max;

                                return (
                                    <div key={m.name} className="flex flex-col gap-2 shrink-0 pt-1" style={{ width: "160px" }}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                {m.name}
                                            </span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                                                style={isActive ? { background: `${color}20`, color: color } : { background: 'var(--glass-bg-hover)', color: 'var(--color-muted-foreground)' }}>
                                                {currentMin.toFixed(min % 1 !== 0 ? 1 : 0)} – {currentMax.toFixed(min % 1 !== 0 ? 1 : 0)}
                                            </span>
                                        </div>
                                        
                                        {/* Dual Slider */}
                                        <div className="relative h-6 w-full flex items-center mb-1">
                                            <div className="absolute w-full h-1.5 bg-muted-foreground/20 rounded-full top-[10px]" />
                                            <div
                                                className="absolute h-1.5 rounded-full top-[10px]"
                                                style={{
                                                    background: color,
                                                    left: `${((currentMin - min) / (max - min)) * 100}%`,
                                                    right: `${100 - ((currentMax - min) / (max - min)) * 100}%`
                                                }}
                                            />
                                            <input
                                                type="range" min={min} max={max} step={(max - min) / 100}
                                                value={currentMin}
                                                onChange={e => {
                                                    const v = Math.min(Number(e.target.value), currentMax - ((max-min)/100));
                                                    if (v === min && currentMax === max) setFilter(m.name, null);
                                                    else setFilter(m.name, { type: "range", min, max, currentMin: v, currentMax });
                                                }}
                                                className="dual-range z-10"
                                                style={themeStyle}
                                            />
                                            <input
                                                type="range" min={min} max={max} step={(max - min) / 100}
                                                value={currentMax}
                                                onChange={e => {
                                                    const v = Math.max(Number(e.target.value), currentMin + ((max-min)/100));
                                                    if (currentMin === min && v === max) setFilter(m.name, null);
                                                    else setFilter(m.name, { type: "range", min, max, currentMin, currentMax: v });
                                                }}
                                                className="dual-range z-[11]"
                                                style={themeStyle}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* ── Chart Canvas ─────────────────────────────────────────────── */}
            <div ref={canvasRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                <GL
                    className="layout"
                    layout={layouts}
                    cols={GRID_COLS}
                    rowHeight={48}
                    width={containerWidth}
                    onLayoutChange={(nl: any) => setLayouts(nl)}
                    draggableHandle=".drag-handle"
                    margin={[14, 14]}
                    containerPadding={[16, 16]}
                >
                    {charts.map((chart, i) => (
                        <div key={String(i)} className="relative group">
                            {/* Drag handle — top bar, visible on hover */}
                            <div className="drag-handle absolute top-0 left-0 right-0 h-7 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-0.5 rounded-full bg-muted-foreground/20" />
                            </div>
                            <ChartCard block={chart} index={i} groupId="studio-canvas" isDark={isDark} />
                        </div>
                    ))}
                </GL>
            </div>

            {/* Drill-down drawer */}
            {drilldown && (
                <DrillDownDrawer drilldown={drilldown} onClose={() => setDrilldown(null)} />
            )}
        </div>
    );
}
