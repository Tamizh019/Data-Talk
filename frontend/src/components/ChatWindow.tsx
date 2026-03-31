"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    Send, Mic, Paperclip, Zap, CheckCircle2, ChevronDown, ChevronUp,
    BarChart2, SlidersHorizontal, X, Database, ChevronRight, Activity, Filter, Search,
} from "lucide-react";
import { streamChat, type ChatMessage } from "@/lib/api";
import SQLDisplay from "./SQLDisplay";
import MarkdownRenderer from "./MarkdownRenderer";
import { useChat } from "@/lib/chat-context";
import { useStudio } from "@/lib/studio-context";
import type { VisualizerBlock } from "@/components/ChartRenderer";
import ChartCard from "./studio/ChartCard";
import DataTable from "./DataTable";

interface ChatWindowProps { dbConnected?: boolean; }

// ── Types ────────────────────────────────────────────────────────────────
type MsgFilter = { col: string; value: string };

// ── DrillDown modal (self-contained) ───────────────────────────────────────
function DrillModal({
    column, value, rows, sql, onClose, onFollowUp,
}: {
    column: string; value: string; rows: Record<string, any>[]; sql: string;
    onClose: () => void; onFollowUp: (q: string) => void;
}) {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const tableData = rows.map(r => columns.map(c => r[c] ?? ""));

    // Lock body scroll while modal is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    const numericStats = useMemo(() => {
        const stats: { col: string; avg: number; min: number; max: number }[] = [];
        for (const col of columns) {
            const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
            if (vals.length === rows.length && vals.length > 0) {
                const sum = vals.reduce((a, b) => a + b, 0);
                stats.push({
                    col, avg: parseFloat((sum / vals.length).toFixed(2)),
                    min: Math.min(...vals), max: Math.max(...vals),
                });
            }
        }
        return stats;
    }, [rows, columns]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadein"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl rounded-2xl shadow-2xl animate-fadein"
                style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border-strong)",
                    backdropFilter: "blur(24px)",
                    maxHeight: "min(80vh, 600px)",
                    display: "grid",
                    gridTemplateRows: "auto auto auto 1fr",
                    overflow: "hidden",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b"
                    style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-hover)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(0,201,177,0.12)", border: "1px solid rgba(0,201,177,0.25)" }}>
                        <Database className="w-4 h-4" style={{ color: "#00C9B1" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-foreground">Drill-Down Details</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span className="opacity-60">{column}</span>
                            <ChevronRight className="w-3 h-3 opacity-40" />
                            <span className="font-semibold" style={{ color: "#00C9B1" }}>{value}</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-foreground/5 text-[10px] text-muted-foreground">
                                {rows.length} records
                            </span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Numeric stats */}
                {numericStats.length > 0 && (
                    <div className="flex gap-3 px-5 py-3 overflow-x-auto border-b" style={{ borderColor: "var(--glass-border)" }}>
                        {numericStats.map(s => (
                            <div key={s.col} className="shrink-0 rounded-xl px-4 py-2.5 min-w-[120px]"
                                style={{ background: "rgba(124,111,255,0.07)", border: "1px solid rgba(124,111,255,0.15)" }}>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">{s.col}</p>
                                <p className="text-[18px] font-extrabold" style={{ color: "#7C6FFF" }}>{s.avg}</p>
                                <p className="text-[9px] text-muted-foreground/50 mt-0.5">{s.min} — {s.max}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Follow-up button */}
                <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
                    <button
                        onClick={() => { onFollowUp(`Analyze the ${rows.length} records where ${column} is '${value}' from the current dataset. What insights can you find?`); onClose(); }}
                        className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
                        style={{ background: "rgba(124,111,255,0.10)", border: "1px solid rgba(124,111,255,0.25)", color: "#7C6FFF" }}
                    >
                        <Zap className="w-3 h-3" />
                        Ask AI to analyze these {rows.length} records
                    </button>
                </div>

                {/* Table — this row gets all remaining space and scrolls internally */}
                <div className="overflow-y-auto p-4 custom-scrollbar">
                    {rows.length > 0 ? (
                        <DataTable config={{ columns, data: tableData }} />
                    ) : (
                        <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground/50">
                            No related rows found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── DrillModal Portal wrapper — renders outside the chat scroll tree ──────────
function DrillModalPortal(props: Parameters<typeof DrillModal>[0]) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return createPortal(<DrillModal {...props} />, document.body);
}

// ── Smart Filter Panel (Right Sidebar) ──────────────────────────────────────
const NOISY_COLS = /^(id|name|full_?name|email|phone|uuid|address|password|token)$/i;
const MAX_PILL_OPTS = 15;
const MAX_FILTERS = 8;

function SmartFilterPanel({
    rows, columns, activeFilters, onFilterChanged
}: {
    rows: Record<string, any>[]; columns: string[]; activeFilters: MsgFilter[]; onFilterChanged: (f: MsgFilter[]) => void;
}) {
    const colMeta = useMemo(() => {
        if (!rows || rows.length === 0) return [];
        return columns.map(col => {
            if (NOISY_COLS.test(col)) return { col, skip: true };
            const values = rows.map(r => r[col]);
            const nums = values.map(v => Number(v)).filter(v => !isNaN(v));
            const isNumeric = nums.length === values.length && values.length > 0;
            const unique = [...new Set(values.map(v => String(v ?? "")))].filter(Boolean);
            return { col, isNumeric, unique, nums, skip: false };
        }).filter(m => {
            if (m.skip) return false;
            if (m.isNumeric) return true;
            return m.unique && m.unique.length > 1 && m.unique.length <= MAX_PILL_OPTS;
        }).slice(0, MAX_FILTERS);
    }, [rows, columns]);

    const [rangeState, setRangeState] = useState<Record<string, [number, number]>>({});

    const handleFilter = useCallback((col: string, value: string) => {
        onFilterChanged([...activeFilters.filter(f => f.col !== col), { col, value }]);
    }, [activeFilters, onFilterChanged]);

    const handleClear = useCallback((col: string) => {
        onFilterChanged(activeFilters.filter(f => f.col !== col));
    }, [activeFilters, onFilterChanged]);

    if (!rows || rows.length === 0) {
        return (
            <div className="w-80 h-full shrink-0 border-l flex flex-col items-center justify-center p-6 text-center"
                 style={{ borderColor: "var(--glass-border)", background: "rgba(0,0,0,0.15)" }}>
                <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                    style={{ background: "rgba(124,111,255,0.05)", border: "1px dashed rgba(124,111,255,0.2)" }}>
                    <Filter className="w-5 h-5 text-muted-foreground/30" />
                </div>
                <p className="text-[13px] font-semibold text-foreground/70 mb-1">Smart Filters</p>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-[200px]">
                    Scroll to a chart in the conversation to view its filters here.
                </p>
            </div>
        );
    }

    if (colMeta.length === 0) {
         return (
            <div className="w-80 h-full shrink-0 border-l flex flex-col"
                 style={{ borderColor: "var(--glass-border)", background: "rgba(0,0,0,0.15)" }}>
                 <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: "var(--glass-border)" }}>
                    <Filter className="w-4 h-4 text-[#7C6FFF]" />
                    <span className="text-[12px] font-bold text-foreground">Smart Filters</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-[200px]">
                        No filterable columns found for this dataset.<br/><br/>
                        (Names, IDs, and highly unique strings are intelligently ignored to keep your UI clean).
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-80 h-full shrink-0 border-l flex flex-col overflow-hidden"
             style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg)" }}>
            
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b shrink-0" style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-hover)" }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(124,111,255,0.15)", color: "#7C6FFF" }}>
                        <SlidersHorizontal className="w-3 h-3" />
                    </div>
                    <h3 className="text-[13px] font-bold text-foreground tracking-tight">Filters</h3>
                </div>
                {activeFilters.length > 0 && (
                    <button onClick={() => onFilterChanged([])} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors">
                        Clear All
                    </button>
                )}
            </div>

            {/* Filter Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-7 custom-scrollbar">
                {colMeta.map(m => {
                    const activeFilter = activeFilters.find(f => f.col === m.col);

                    if (m.isNumeric) {
                        const min = Math.min(...m.nums);
                        const max = Math.max(...m.nums);
                        const [lo, hi] = rangeState[m.col] ?? [min, max];
                        return (
                            <div key={m.col} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00C9B1]">{m.col}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded-md">
                                        {lo.toFixed(1)} – {hi.toFixed(1)}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <input type="range" min={min} max={max} step={Math.max((max - min) / 100, 0.01)} value={lo}
                                        className="w-full h-1.5 appearance-none rounded-full cursor-pointer bg-foreground/10"
                                        style={{ accentColor: "#7C6FFF" }}
                                        onChange={e => {
                                            const v = Math.min(Number(e.target.value), hi);
                                            setRangeState(p => ({ ...p, [m.col]: [v, hi] }));
                                            handleFilter(m.col, `>=${v}`);
                                        }}
                                    />
                                    <input type="range" min={min} max={max} step={Math.max((max - min) / 100, 0.01)} value={hi}
                                        className="w-full h-1.5 appearance-none rounded-full cursor-pointer bg-foreground/10"
                                        style={{ accentColor: "#00C9B1" }}
                                        onChange={e => {
                                            const v = Math.max(Number(e.target.value), lo);
                                            setRangeState(p => ({ ...p, [m.col]: [lo, v] }));
                                            handleFilter(m.col, `<=${v}`);
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={m.col} className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7C6FFF]">{m.col}</span>
                                {activeFilter && (
                                    <button onClick={() => handleClear(m.col)} className="text-[9px] text-muted-foreground/60 hover:text-red-400">Clear</button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {m.unique?.map(v => {
                                    const isActive = activeFilter?.value === v;
                                    return (
                                        <button key={v} onClick={() => isActive ? handleClear(m.col) : handleFilter(m.col, v)}
                                            className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
                                            style={{
                                                background: isActive ? "rgba(124,111,255,0.18)" : "var(--glass-bg-hover)",
                                                color: isActive ? "#7C6FFF" : "var(--color-muted-foreground)",
                                                border: isActive ? "1px solid rgba(124,111,255,0.45)" : "1px solid var(--glass-border)",
                                                fontWeight: isActive ? 600 : 400,
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
            </div>
            {/* Stats Footer */}
            <div className="p-4 border-t shrink-0 flex items-center justify-between" style={{ borderColor: "var(--glass-border)", background: "rgba(0,0,0,0.2)" }}>
                 <div className="flex flex-col">
                     <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Active Filters</span>
                     <span className="text-[16px] font-bold text-foreground">{activeFilters.length}</span>
                 </div>
                 <div className="flex flex-col text-right">
                     <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Visible Rows</span>
                     <span className="text-[16px] font-bold text-[#00C9B1]">
                         {activeFilters.length > 0 
                            ? rows.filter(row => activeFilters.every(f => {
                                const val = String(row[f.col] ?? "");
                                if (f.value.startsWith(">=")) return Number(row[f.col]) >= parseFloat(f.value.slice(2));
                                if (f.value.startsWith("<=")) return Number(row[f.col]) <= parseFloat(f.value.slice(2));
                                return val === f.value;
                              })).length 
                            : rows.length}
                     </span>
                 </div>
            </div>
        </div>
    );
}

// ── Inline chart block ──────────────────────────────────────────────────────
function InlineChartBlock({
    blocks, rows, messageIndex, isDark, activeFilters, onVisible
}: {
    blocks: VisualizerBlock[]; rows: Record<string, any>[]; messageIndex: number; isDark: boolean;
    activeFilters: MsgFilter[]; onVisible: (idx: number) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [drilldown, setDrilldown] = useState<{ column: string; value: string; rows: Record<string, any>[]; sql: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll spy logic
    useEffect(() => {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) onVisible(messageIndex);
            });
        }, { threshold: 0.4 }); // Trigger when 40% of chart block is visible
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, [messageIndex, onVisible]);

    const filteredRows = useMemo(() => {
        if (activeFilters.length === 0) return rows;
        return rows.filter(row => activeFilters.every(f => {
            const val = String(row[f.col] ?? "");
            if (f.value.startsWith(">=")) return Number(row[f.col]) >= parseFloat(f.value.slice(2));
            if (f.value.startsWith("<=")) return Number(row[f.col]) <= parseFloat(f.value.slice(2));
            return val === f.value;
        }));
    }, [rows, activeFilters]);

    const handleDrilldown = useCallback((column: string, value: string) => {
        const relatedRows = filteredRows.filter(r => Object.values(r).some(v => String(v) === value));
        setDrilldown({ column, value, rows: relatedRows.slice(0, 100), sql: "" });
    }, [filteredRows]);

    const handleFollowUpQuery = useCallback((q: string) => {
        window.dispatchEvent(new CustomEvent("datatalk:prefill", { detail: q }));
    }, []);

    const kpis = blocks.filter(b => b.library === "kpi");
    const regularCharts = blocks.filter(b => b.library !== "kpi" && b.library !== "table");
    const tables = blocks.filter(b => b.library === "table");

    return (
        <div className="space-y-2 mt-2" ref={containerRef}>
            <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ background: "rgba(0,201,177,0.08)", border: "1px solid rgba(0,201,177,0.20)", color: "#00C9B1" }}>
                    <BarChart2 className="w-3 h-3" />
                    {blocks.length} charts · {filteredRows.length} rows
                    {expanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>
                {activeFilters.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#7C6FFF]/10 border border-[#7C6FFF]/20 text-[#7C6FFF] text-[10px] font-bold">
                        <Filter className="w-3 h-3" /> {activeFilters.length} Active Filters
                    </span>
                )}
            </div>

            {expanded && (
                <div className="space-y-3 animate-fadein">
                    {kpis.length > 0 && (
                        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)` }}>
                            {kpis.map((kpi, ki) => (
                                <div key={ki} style={{ height: "130px" }}>
                                    <ChartCard block={kpi} index={ki} groupId={`msg-${messageIndex}`} isDark={isDark} onDrilldown={handleDrilldown} inlineRows={filteredRows} />
                                </div>
                            ))}
                        </div>
                    )}

                    {regularCharts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {regularCharts.map((chart, ci) => {
                                const isWide = chart.chart_type === "line" || chart.chart_type === "area" || chart.chart_type === "horizontal_bar" || (ci === regularCharts.length - 1 && regularCharts.length % 2 === 1);
                                return (
                                    <div key={ci} style={{ height: "300px" }} className={isWide ? "md:col-span-2" : ""}>
                                        <ChartCard block={chart} index={kpis.length + ci} groupId={`msg-${messageIndex}`} isDark={isDark} onDrilldown={handleDrilldown} inlineRows={filteredRows} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {tables.length > 0 && (
                        <div className="space-y-3">
                            {tables.map((table, ti) => (
                                <div key={ti} style={{ maxHeight: "280px", overflow: "hidden" }}>
                                    <ChartCard block={table} index={kpis.length + regularCharts.length + ti} groupId={`msg-${messageIndex}`} isDark={isDark} onDrilldown={handleDrilldown} inlineRows={filteredRows} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {drilldown && <DrillModalPortal {...drilldown} onClose={() => setDrilldown(null)} onFollowUp={handleFollowUpQuery} />}
        </div>
    );
}

// ── Parsed Follow-Ups Component ───────────────────────────────────────────────
function ParsedMessageContent({ content, onSend, isDark }: { content: string, onSend: (q: string) => void, isDark: boolean }) {
    // Match both plain text and **bold** markdown versions of the follow-up header
    const FOLLOWUP_REGEX = /(?:🔍\s*)?(?:\*\*)?Follow-up Questions(?:[^:]*)?:?(?:\*\*)?\s*/i;
    const hasFollowUps = FOLLOWUP_REGEX.test(content);

    if (!hasFollowUps) {
        return <MarkdownRenderer content={content} />;
    }

    const parts = content.split(FOLLOWUP_REGEX);
    if (parts.length < 2) return <MarkdownRenderer content={content} />;

    const mainContent = parts[0].trim();
    // Each follow-up may be: "• Question text" or "- Question" or "* Question" or plain line
    const followUps = parts[parts.length - 1]
        .split(/\n|(?<=\?\s*)•/)
        .map(l => l.replace(/^[•\-\*\d\.\s]+/, '').trim())
        .filter(l => l.length > 5);

    return (
        <div className="flex flex-col gap-3 w-full">
            {mainContent && <MarkdownRenderer content={mainContent} />}

            {followUps.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    {/* Section divider */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-px flex-1" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                            <Zap className="w-3 h-3" style={{ color: "#7C6FFF" }} />
                            Ask a follow-up
                        </span>
                        <div className="h-px flex-1" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
                    </div>

                    {/* Clickable bubble chips */}
                    <div className="flex flex-col gap-2">
                        {followUps.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => onSend(q)}
                                className="group text-left text-[12.5px] font-medium px-4 py-3 rounded-2xl transition-all duration-150 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                                style={{
                                    background: isDark
                                        ? "linear-gradient(135deg, rgba(124,111,255,0.10) 0%, rgba(0,201,177,0.06) 100%)"
                                        : "linear-gradient(135deg, rgba(124,111,255,0.07) 0%, rgba(0,201,177,0.04) 100%)",
                                    border: isDark
                                        ? "1px solid rgba(124,111,255,0.22)"
                                        : "1px solid rgba(124,111,255,0.18)",
                                    borderRadius: "14px",
                                    boxShadow: isDark
                                        ? "0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)"
                                        : "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                {/* Left icon badge */}
                                <span
                                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-12"
                                    style={{ background: "rgba(124,111,255,0.15)", color: "#7C6FFF" }}
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                </span>

                                {/* Question text */}
                                <span
                                    className="leading-snug flex-1"
                                    style={{ color: isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.68)" }}
                                >
                                    {q}
                                </span>

                                {/* Arrow hint */}
                                <ChevronRight
                                    className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0 transition-all duration-150 shrink-0"
                                    style={{ color: "#7C6FFF" }}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main ChatWindow ───────────────────────────────────────────────────────────
export default function ChatWindow({ dbConnected }: ChatWindowProps) {
    const { activeId, activeConversation, updateMessages } = useChat();
    const { openStudio } = useStudio();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [collapsedThinking, setCollapsedThinking] = useState<Record<number, boolean>>({});
    
    // Lifted Filter State & Intersection Observer state
    const [filterStates, setFilterStates] = useState<Record<number, MsgFilter[]>>({});
    const [activeMsgIndex, setActiveMsgIndex] = useState<number | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const pendingRows = useRef<Record<string, any>[]>([]);
    const pendingColumns = useRef<string[]>([]);
    const pendingCharts = useRef<VisualizerBlock[]>([]);
    const pendingQuestion = useRef<string>("");
    const pendingSql = useRef<string>("");

    const messages = activeConversation?.messages || [];
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        const handler = (e: Event) => {
            const q = (e as CustomEvent).detail as string;
            setInput(q); textareaRef.current?.focus();
        };
        window.addEventListener("datatalk:prefill", handler);
        return () => window.removeEventListener("datatalk:prefill", handler);
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeId) return;
        setIsUploading(true);
        updateMessages(activeId, (p) => [...p, { role: "user", content: `*(Uploading ${file.name}...)*`, createdAt: Date.now() }]);
        try {
            const formData = new FormData(); formData.append("file", file);
            const res = await fetch("http://localhost:8000/api/upload", { method: "POST", body: formData });
            if (res.ok) updateMessages(activeId, (p) => [...p, { role: "assistant", content: `✅ **${file.name}** uploaded and indexed!`, createdAt: Date.now() }]);
            else throw new Error((await res.json()).detail || "Upload failed");
        } catch (error: any) {
            updateMessages(activeId, (p) => [...p, { role: "assistant", content: `❌ Upload error: ${error.message}`, error: error.message, createdAt: Date.now() }]);
        } finally {
            setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const sendMessage = async (overrideText?: string) => {
        const text = (overrideText || input).trim();
        if (!text || isLoading || !activeId) return;

        updateMessages(activeId, (p) => [...p, { role: "user", content: text, createdAt: Date.now() }, { role: "assistant", isStreaming: true, createdAt: Date.now(), steps: [{ label: "Connecting to agent...", status: "pending" }] }]);
        setInput(""); if (textareaRef.current) textareaRef.current.style.height = "auto";
        setIsLoading(true);

        const history = messages.filter(m => m.content).map(m => ({ role: m.role === "user" ? "user" : "model", parts: [m.content ?? ""] }));

        pendingRows.current = []; pendingColumns.current = []; pendingCharts.current = []; pendingQuestion.current = text; pendingSql.current = "";

        await streamChat(activeId, text, history, {
            onSql: (sql) => { pendingSql.current = sql; updateMessages(activeId, p => p.map((m, i) => i === p.length - 1 ? { ...m, sql } : m)); },
            onResult: (rows, columns, rowCount, attempts) => { pendingRows.current = rows as any; pendingColumns.current = columns; updateMessages(activeId, p => p.map((m, i) => i === p.length - 1 ? { ...m, rowCount, attempts, rows: (rows as any[]).slice(0, 500), columns } : m)); },
            onVisualization: (charts) => { pendingCharts.current = charts as any; updateMessages(activeId, p => p.map((m, i) => i === p.length - 1 ? { ...m, charts } : m)); },
            onExplanation: (text) => updateMessages(activeId, p => p.map((m, i) => i === p.length - 1 ? { ...m, content: text } : m)),
            onCached: (data: any) => updateMessages(activeId, p => p.map((m, i) => i === p.length - 1 ? { ...m, sql: data.sql, charts: data.charts, content: data.explanation, isCached: true } : m)),
            onError: (message) => updateMessages(activeId, p => p.map((m, i) => i === p.length - 1 ? { ...m, content: undefined, error: message } : m)),
            onStep: (label) => updateMessages(activeId, p => p.map((m, i) => {
                if (i !== p.length - 1) return m;
                const done = (m.steps || []).map(s => ({ ...s, status: "done" as const }));
                return { ...m, steps: [...done, { label, status: "pending" as const }] };
            })),
            onDone: () => {
                updateMessages(activeId, p => p.map((m, i) => {
                    if (i !== p.length - 1) return m;
                    return { ...m, isStreaming: false, steps: (m.steps || []).map(s => ({ ...s, status: "done" as const })) };
                }));
                setIsLoading(false);
                if (pendingCharts.current.length > 0 && pendingRows.current.length > 0) openStudio({ question: pendingQuestion.current, sql: pendingSql.current, rawRows: pendingRows.current, columns: pendingColumns.current, charts: pendingCharts.current });
            },
        });
    };

    // Derived active data for right panel
    const activeData = activeMsgIndex !== null && messages[activeMsgIndex] ? messages[activeMsgIndex] : null;
    const activeRows = activeData?.rows as Record<string, any>[] | undefined;
    const activeColumns = activeData?.columns as string[] | undefined;

    return (
        <div className="flex flex-row h-full w-full overflow-hidden transition-colors duration-300">
            {/* ── Chat Content (Left 75%) ── */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Scroll Area */}
                <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
                    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                        {messages.map((msg, i) =>
                            msg.role === "user" ? (
                                <div key={i} className="flex flex-col items-end gap-1 animate-fadein">
                                    <div className="max-w-2xl px-5 py-3.5 text-[14px] leading-relaxed text-white relative group"
                                        style={{ background: "linear-gradient(135deg, #5B4FD8, #7C6FFF)", borderRadius: "20px 20px 4px 20px", boxShadow: "0 4px 20px rgba(124,111,255,0.25)" }}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/50 mr-1">{msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                            ) : (
                                <div key={i} className="flex gap-4 items-start animate-fadein relative">
                                    <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-1 shadow-md"
                                        style={{ background: "linear-gradient(135deg, rgba(124,111,255,0.15), rgba(0,201,177,0.15))", border: "1px solid rgba(124,111,255,0.25)" }}>
                                        <Activity className="w-4 h-4 text-[#7C6FFF]" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-3">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="text-[12px] font-extrabold tracking-wider uppercase" style={{ color: "#7C6FFF" }}>Analyst AI</span>
                                            {msg.createdAt && <span className="text-[10px] uppercase font-bold text-muted-foreground/40">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                                            {msg.sql && !msg.isStreaming && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Executed</span>}
                                        </div>

                                        {/* Thinking */}
                                        {msg.steps && msg.steps.length > 0 && (() => {
                                            const thinking = !!msg.isStreaming; const collapsed = !!collapsedThinking[i]; const last = msg.steps[msg.steps.length - 1];
                                            return (
                                                <div className="rounded-xl overflow-hidden border transition-all" style={{ background: thinking ? "rgba(124,111,255,0.04)" : "var(--glass-bg)", borderColor: thinking ? "rgba(124,111,255,0.18)" : "var(--glass-border)" }}>
                                                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left group" onClick={() => !thinking && setCollapsedThinking(p => ({ ...p, [i]: !p[i] }))} disabled={thinking}>
                                                        {thinking ? (
                                                            <span className="relative flex shrink-0"><span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-60" style={{ background: "#7C6FFF" }} /><span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#7C6FFF" }} /></span>
                                                        ) : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />}
                                                        <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: thinking ? "#7C6FFF" : "var(--color-muted-foreground)" }}>{thinking ? last.label : `Analysis complete (${msg.steps.length} steps)`}</span>
                                                        {!thinking && (collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40" />)}
                                                    </button>
                                                    {!collapsed && (
                                                        <div className="px-3.5 pb-3 border-t border-border/30">
                                                            <div className="pt-2.5 space-y-2">
                                                                {msg.steps.map((step, si) => (
                                                                    <div key={si} className="flex items-start gap-2.5">
                                                                        {step.status === "done" ? <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" /> : <svg className="w-3 h-3 mt-0.5 shrink-0 animate-spin text-[#7C6FFF]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                                                                        <span className="text-[11px] font-medium leading-relaxed" style={{ color: step.status === "done" ? "var(--color-muted-foreground)" : "var(--color-foreground)" }}>{step.label}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {msg.sql && <SQLDisplay sql={msg.sql} attempts={msg.attempts} />}

                                        {/* INLINE CHARTS */}
                                        {msg.charts && msg.charts.length > 0 && !msg.isStreaming && (
                                            <InlineChartBlock
                                                blocks={msg.charts as any[]} rows={msg.rows as any[] ?? []}
                                                messageIndex={i} isDark={isDark}
                                                activeFilters={filterStates[i] || []}
                                                onVisible={setActiveMsgIndex}
                                            />
                                        )}

                                        {/* Textual Content */}
                                        {msg.content && !msg.isStreaming && !msg.sql && !(msg.charts?.length) && (
                                            msg.error ? (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 shadow-lg">
                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400"><X className="w-4 h-4" /></div>
                                                    <div><p className="text-[13px] font-bold text-red-300 mb-1">Execution Error</p><p className="text-[12px] text-red-300/70">{msg.error}</p></div>
                                                </div>
                                            ) : (
                                                <div className="text-[14px] leading-relaxed text-foreground/80 prose prose-neutral dark:prose-invert max-w-none">
                                                    {msg.role === "assistant" ? <ParsedMessageContent content={msg.content} onSend={(q) => sendMessage(q)} isDark={isDark} /> : <MarkdownRenderer content={msg.content} />}
                                                </div>
                                            )
                                        )}

                                        {msg.isStreaming && msg.content && !msg.sql && !(msg.charts?.length) && (
                                            <div className="text-[14px] leading-relaxed text-foreground/80 prose prose-neutral dark:prose-invert max-w-none">
                                                <MarkdownRenderer content={msg.content + " ..."} />
                                            </div>
                                        )}

                                        {msg.content && !msg.isStreaming && (msg.sql || msg.charts?.length) && (
                                            <div className="text-[14px] leading-relaxed prose prose-neutral dark:prose-invert max-w-none p-5 rounded-xl shadow-sm" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                                                 <ParsedMessageContent content={msg.content} onSend={(q) => sendMessage(q)} isDark={isDark} />
                                            </div>
                                        )}
                                        {msg.error && (msg.sql || msg.charts?.length) && (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3"><div className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400"><X className="w-3.5 h-3.5" /></div><p className="text-[12px] text-red-300/80 font-mono leading-relaxed">{msg.error}</p></div>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                        <div ref={bottomRef} className="h-6" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="shrink-0 px-6 pb-6 pt-2 flex flex-col items-center gap-3 bg-gradient-to-t from-background via-background to-transparent z-10">
                    <div className="flex gap-2">
                        {["Visualize", "Query", "Summarize"].map(label => (
                            <button key={label} onClick={() => sendMessage(`${label} the data`)} className="px-3 py-1.5 rounded-full text-[11px] font-bold text-muted-foreground transition-all hover:text-foreground hover:-translate-y-0.5 hover:shadow-lg" style={{ background: "var(--glass-bg-hover)", border: "1px solid var(--glass-border)" }}>{label}</button>
                        ))}
                    </div>
                    <div className="w-full max-w-3xl relative group">
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-2xl pointer-events-none" style={{ background: "rgba(124,111,255,0.15)" }} />
                        <div className="relative flex items-end rounded-2xl p-2.5 shadow-xl transition-all" style={{ background: "var(--input-bg)", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border-strong)", boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
                            <button className="p-2.5 transition-colors text-muted-foreground hover:text-[#00C9B1] mb-0.5" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isLoading}>
                                <Paperclip className={`w-4 h-4 ${isUploading ? "animate-bounce text-[#00C9B1]" : ""}`} />
                                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.csv,.pdf,.md,.json" onChange={handleFileUpload} />
                            </button>
                            <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask anything about your data..." disabled={isLoading} rows={1} className="flex-1 bg-transparent outline-none border-none text-[14px] font-medium py-2.5 resize-none leading-relaxed min-h-[24px] max-h-[200px] text-foreground placeholder:text-muted-foreground/50 tracking-wide" style={{ caretColor: "#7C6FFF" }} />
                            <div className="flex items-center gap-2 mb-0.5 ml-1">
                                <button className="p-2.5 transition-colors text-muted-foreground hover:text-[#7C6FFF]"><Mic className="w-4 h-4" /></button>
                                <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-md" style={{ background: input.trim() && !isLoading ? "linear-gradient(135deg, #7C6FFF, #00C9B1)" : "var(--glass-border-strong)" }}><Send className="w-4 h-4 ml-0.5" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Smart Filter Panel (Right 25%) ── */}
            <SmartFilterPanel 
                rows={activeRows ?? []}
                columns={activeColumns ?? []}
                activeFilters={activeMsgIndex !== null ? (filterStates[activeMsgIndex] || []) : []}
                onFilterChanged={(filters) => {
                    if (activeMsgIndex !== null) {
                        setFilterStates(prev => ({ ...prev, [activeMsgIndex]: filters }));
                    }
                }}
            />
        </div>
    );
}
