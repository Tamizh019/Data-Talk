"use client";

import { useState, useEffect, Suspense } from "react";
import {
    BarChart2, Database, TrendingUp, Users, Hash, RefreshCw,
    Trophy, PieChart, ArrowRight, Activity, Sparkles, ChevronDown,
    ChevronRight as ChevronRightIcon,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { ChatProvider } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";

// ── Types ────────────────────────────────────────────────────────────────
interface KPI { label: string; value: string | number; min?: number; max?: number; }
interface Distribution { column: string; data: Record<string, any>[]; }
interface TopRecords { ranked_by: string; columns: string[]; rows: Record<string, any>[]; }
interface TableAnalytics {
    table: string;
    columns: string[];
    kpis: KPI[];
    distributions: Distribution[];
    top_records: TopRecords | any[];
}

// ── KPI Icon picker ──────────────────────────────────────────────────────
function getKpiIcon(label: string) {
    const l = label.toLowerCase();
    if (l.includes("total") || l.includes("count") || l.includes("record")) return Hash;
    if (l.includes("avg") || l.includes("average") || l.includes("mean")) return TrendingUp;
    if (l.includes("user") || l.includes("student") || l.includes("member")) return Users;
    return Activity;
}

const ACCENT_COLORS = ["#7C6FFF", "#00C9B1", "#F59E0B", "#EC4899", "#3B82F6", "#10B981"];

// ── Main Analytics Page ──────────────────────────────────────────────────
function AnalyticsDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<TableAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/analytics`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || "Failed to load analytics");
            }
            const json = await res.json();
            setData(json.analytics || []);
            // Auto-expand first table
            if (json.analytics?.length > 0) {
                setExpandedTables(new Set([json.analytics[0].table]));
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnalytics(); }, []);

    const toggleTable = (t: string) => {
        setExpandedTables(prev => {
            const n = new Set(prev);
            n.has(t) ? n.delete(t) : n.add(t);
            return n;
        });
    };

    return (
        <div
            className="flex h-screen overflow-hidden relative transition-colors duration-300"
            style={{ background: "var(--page-bg)" }}
        >
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none z-0"
                style={{ backgroundImage: "radial-gradient(var(--dot-color) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] pointer-events-none z-0"
                style={{ background: "radial-gradient(circle at 50% 50%, var(--bloom-color) 0%, transparent 70%)", filter: "blur(80px)" }} />

            <Suspense fallback={<div style={{ width: 260 }} />}>
                <Sidebar />
            </Suspense>

            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header */}
                <header
                    className="h-14 flex items-center justify-between px-6 z-50 shrink-0 transition-colors duration-300"
                    style={{
                        background: "var(--glass-bg)",
                        backdropFilter: "blur(20px)",
                        borderBottom: "1px solid var(--header-border)",
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#00C9B1,#7C6FFF)", boxShadow: "0 0 10px rgba(0,201,177,0.40)" }}>
                            <BarChart2 className="w-[14px] h-[14px] text-white" />
                        </div>
                        <span className="font-semibold text-[14px] tracking-tight text-foreground/85">
                            Analytics Dashboard
                        </span>
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold text-foreground transition-all active:scale-[0.97]"
                        style={{ background: "var(--glass-bg-hover)", border: "1px solid var(--glass-border-strong)" }}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-6xl mx-auto px-6 py-8">

                        {/* Loading State */}
                        {loading && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "var(--glass-bg-hover)" }} />
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: "var(--glass-bg-hover)" }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                    <Database className="w-7 h-7 text-red-400" />
                                </div>
                                <p className="text-[14px] font-semibold text-foreground">{error}</p>
                                <p className="text-[12px] text-muted-foreground">Connect a database from the chat page first.</p>
                                <a href="/chat"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:scale-105"
                                    style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}>
                                    Go to Chat <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}

                        {/* Dashboard Content */}
                        {!loading && !error && data.length > 0 && (
                            <div className="space-y-8">
                                {data.map((table, tableIdx) => {
                                    const isExpanded = expandedTables.has(table.table);
                                    const accentColor = ACCENT_COLORS[tableIdx % ACCENT_COLORS.length];
                                    const topRecords = Array.isArray(table.top_records) ? null : table.top_records as TopRecords;

                                    return (
                                        <div key={table.table} className="space-y-4">
                                            {/* Table Header */}
                                            <button
                                                onClick={() => toggleTable(table.table)}
                                                className="flex items-center gap-3 group w-full text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                                                    <Database className="w-4 h-4" style={{ color: accentColor }} />
                                                </div>
                                                <div className="flex-1">
                                                    <h2 className="text-[16px] font-bold text-foreground tracking-tight">
                                                        {table.table}
                                                    </h2>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {table.columns.length} columns · {table.kpis.find(k => k.label === "Total Records")?.value ?? "?"} records
                                                    </p>
                                                </div>
                                                {isExpanded
                                                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                    : <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                                                }
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-5 animate-fadein pl-2">

                                                    {/* KPI Cards */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                        {table.kpis.map((kpi, kIdx) => {
                                                            const KpiIcon = getKpiIcon(kpi.label);
                                                            const kColor = ACCENT_COLORS[kIdx % ACCENT_COLORS.length];
                                                            return (
                                                                <div
                                                                    key={kIdx}
                                                                    className="rounded-xl p-4 flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                                                                    style={{
                                                                        background: "var(--glass-bg)",
                                                                        border: "1px solid var(--glass-border)",
                                                                        borderLeft: `3px solid ${kColor}`,
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                                            style={{ background: `${kColor}15` }}>
                                                                            <KpiIcon className="w-3 h-3" style={{ color: kColor }} />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                                                            {kpi.label}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[28px] font-extrabold leading-none"
                                                                        style={{ background: `linear-gradient(135deg, ${kColor}, ${kColor}90)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                                                        {String(kpi.value)}
                                                                    </span>
                                                                    {kpi.min !== undefined && kpi.max !== undefined && (
                                                                        <span className="text-[10px] text-muted-foreground/50">
                                                                            Range: {kpi.min} — {kpi.max}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Distribution Charts (simple bar-like visualization) */}
                                                    {table.distributions.length > 0 && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {table.distributions.map((dist, dIdx) => {
                                                                const maxCount = Math.max(...dist.data.map(d => d.count || 0));
                                                                const dColor = ACCENT_COLORS[(dIdx + 2) % ACCENT_COLORS.length];
                                                                return (
                                                                    <div
                                                                        key={dIdx}
                                                                        className="rounded-xl overflow-hidden"
                                                                        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                                                                    >
                                                                        <div className="px-4 py-3 flex items-center gap-2"
                                                                            style={{ background: "var(--glass-bg-hover)", borderBottom: "1px solid var(--glass-border)" }}>
                                                                            <PieChart className="w-3.5 h-3.5" style={{ color: dColor }} />
                                                                            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: dColor }}>
                                                                                {dist.column} Distribution
                                                                            </span>
                                                                        </div>
                                                                        <div className="p-4 space-y-2.5">
                                                                            {dist.data.map((item, iIdx) => {
                                                                                const value = item[dist.column] || "Unknown";
                                                                                const count = item.count || 0;
                                                                                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                                                const barColor = ACCENT_COLORS[iIdx % ACCENT_COLORS.length];
                                                                                return (
                                                                                    <div key={iIdx} className="space-y-1">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-[12px] font-medium text-foreground/80 truncate">{String(value)}</span>
                                                                                            <span className="text-[11px] font-bold font-mono" style={{ color: barColor }}>{count}</span>
                                                                                        </div>
                                                                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-bg-hover)" }}>
                                                                                            <div
                                                                                                className="h-full rounded-full transition-all duration-700"
                                                                                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}90, ${barColor})` }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Top Performers Table */}
                                                    {topRecords && topRecords.rows && topRecords.rows.length > 0 && (
                                                        <div
                                                            className="rounded-xl overflow-hidden"
                                                            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                                                        >
                                                            <div className="px-4 py-3 flex items-center gap-2"
                                                                style={{ background: "var(--glass-bg-hover)", borderBottom: "1px solid var(--glass-border)" }}>
                                                                <Trophy className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                                                                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>
                                                                    Top 5 by {topRecords.ranked_by}
                                                                </span>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-sm">
                                                                    <thead>
                                                                        <tr style={{ background: "var(--glass-bg-hover)", borderBottom: "1px solid var(--glass-border)" }}>
                                                                            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 w-10">#</th>
                                                                            {topRecords.columns.map((col: string) => (
                                                                                <th key={col} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{col}</th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {topRecords.rows.map((row: Record<string, any>, rIdx: number) => (
                                                                            <tr key={rIdx} className="transition-colors hover:bg-foreground/5"
                                                                                style={{ borderBottom: "1px solid var(--glass-border)" }}>
                                                                                <td className="px-4 py-2.5">
                                                                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                                                                        style={{ background: rIdx === 0 ? "#F59E0B" : rIdx === 1 ? "#94A3B8" : rIdx === 2 ? "#CD7F32" : "var(--glass-bg-hover)" }}>
                                                                                        {rIdx < 3 ? ["🥇", "🥈", "🥉"][rIdx] : rIdx + 1}
                                                                                    </span>
                                                                                </td>
                                                                                {topRecords.columns.map((col: string) => (
                                                                                    <td key={col} className="px-4 py-2.5 text-[12px] text-foreground/80 whitespace-nowrap">
                                                                                        {String(row[col] ?? "")}
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && !error && data.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ background: "rgba(124,111,255,0.08)", border: "1px dashed rgba(124,111,255,0.25)" }}>
                                    <Sparkles className="w-7 h-7 text-muted-foreground/30" />
                                </div>
                                <p className="text-[14px] font-semibold text-foreground/70">No analytics available</p>
                                <p className="text-[12px] text-muted-foreground text-center max-w-sm">
                                    Connect a database from the Chat page, and this dashboard will automatically generate insights from your data.
                                </p>
                                <a href="/chat"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:scale-105"
                                    style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}>
                                    Connect Database <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <ChatProvider>
            <AnalyticsDashboard />
        </ChatProvider>
    );
}
