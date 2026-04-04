"use client";

/*
 * Reports Page
 * Generates polished, printable PDF-style reports from past chat conversations.
 * Each report shows the question, SQL, results table, and AI insight.
 */

import { useState, useEffect, useRef, Suspense } from "react";
import {
    FileText, Download, Printer, RefreshCw, MessageSquare,
    Database, ChevronDown, ChevronRight, Sparkles, ArrowRight,
    Copy, Check, BarChart2, Clock, Hash,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { ChatProvider, useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReportMessage {
    role: "user" | "assistant";
    content: string;
    sql?: string;
    rows?: Record<string, any>[];
    columns?: string[];
}

interface Report {
    id: string;
    title: string;
    createdAt: string;
    messages: ReportMessage[];
}

const ACCENT = "#7C6FFF";
const ACCENT2 = "#00C9B1";

// ── Helper: extract SQL from message ─────────────────────────────────────────
function extractSql(content: string): string | null {
    const match = content?.match(/```sql\s*([\s\S]*?)```/i)
        || content?.match(/```(?:SQL)?\s*(SELECT[\s\S]*?)```/i);
    return match ? match[1].trim() : null;
}

// ── Helper: build rich report messages from raw ChatMessages ──────────────────
function buildReportMessages(raw: any[]): ReportMessage[] {
    return (raw || []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "",
        // sql field is stored directly OR can be embedded in content markdown
        sql: m.sql || (m.role === "assistant" && m.content ? extractSql(m.content) || undefined : undefined),
        rows: m.rows,
        columns: m.columns,
    }));
}

// ── ReportCard ────────────────────────────────────────────────────────────────
function ReportCard({ report, onPrint }: { report: Report; onPrint: () => void }) {
    const [expanded, setExpanded] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    const userMessages = report.messages.filter(m => m.role === "user");
    const assistantMessages = report.messages.filter(m => m.role === "assistant");

    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
    };

    return (
        <div
            className="rounded-2xl overflow-hidden report-card transition-all duration-300"
            style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-md)",
            }}
        >
            {/* Card Header */}
            <div
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none"
                style={{
                    background: "var(--glass-bg-hover)",
                    borderBottom: "1px solid var(--glass-border)",
                }}
                onClick={() => setExpanded(e => !e)}
            >
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}
                >
                    <FileText className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-foreground truncate">{report.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground/60">{report.createdAt}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <Hash className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground/60">{userMessages.length} queries</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={e => { e.stopPropagation(); onPrint(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                        style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                    >
                        <Printer className="w-3 h-3" />
                        Export PDF
                    </button>
                    {expanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    }
                </div>
            </div>

            {/* Card Body */}
            {expanded && (
                <div className="p-5 space-y-5">
                    {report.messages.reduce((acc: any[], msg, idx) => {
                        if (msg.role === "user") {
                            const nextMsg = report.messages[idx + 1];
                            acc.push({ question: msg, answer: nextMsg?.role === "assistant" ? nextMsg : null });
                        }
                        return acc;
                    }, []).map((pair: any, pIdx: number) => (
                        <div
                            key={pIdx}
                            className="rounded-xl overflow-hidden"
                            style={{ border: "1px solid var(--glass-border)" }}
                        >
                            {/* Question */}
                            <div
                                className="flex items-start gap-2.5 px-4 py-3"
                                style={{ background: `${ACCENT}08`, borderBottom: "1px solid var(--glass-border)" }}
                            >
                                <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` }}
                                >
                                    Q
                                </div>
                                <p className="text-[13px] font-semibold text-foreground leading-snug">
                                    {pair.question.content}
                                </p>
                            </div>

                            {/* SQL Block */}
                            {pair.answer?.sql && (
                                <div
                                    className="px-4 py-3 font-mono text-[11px]"
                                    style={{
                                        background: "rgba(0,0,0,0.08)",
                                        borderBottom: "1px solid var(--glass-border)",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span
                                            className="text-[9px] font-bold uppercase tracking-widest"
                                            style={{ color: ACCENT2 }}
                                        >
                                            SQL Query
                                        </span>
                                        <button
                                            onClick={() => copyText(pair.answer.sql, `sql-${pIdx}`)}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {copied === `sql-${pIdx}`
                                                ? <><Check className="w-3 h-3 text-green-500" /> Copied</>
                                                : <><Copy className="w-3 h-3" /> Copy</>
                                            }
                                        </button>
                                    </div>
                                    <pre className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                        {pair.answer.sql}
                                    </pre>
                                </div>
                            )}

                            {/* Answer */}
                            {pair.answer && (
                                <div className="px-4 py-3">
                                    <div className="flex items-start gap-2.5">
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                                            style={{ background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})` }}
                                        >
                                            A
                                        </div>
                                        <p className="text-[12px] text-foreground/80 leading-relaxed">
                                            {/* Strip markdown formatting for clean report */}
                                            {pair.answer.content
                                                .replace(/```[\s\S]*?```/g, "")
                                                .replace(/\*\*([^*]+)\*\*/g, "$1")
                                                .replace(/#+\s/g, "")
                                                .replace(/\[Previously executed SQL:[^\]]+\]/g, "")
                                                .trim()
                                                .slice(0, 600)}
                                            {pair.answer.content.length > 600 ? "…" : ""}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── PrintableReport ───────────────────────────────────────────────────────────
function PrintTemplate({ report }: { report: Report }) {
    return (
        <div style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ borderBottom: "3px solid #7C6FFF", paddingBottom: "16px", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111", margin: 0 }}>{report.title}</h1>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Generated: {report.createdAt} · Data-Talk Reports</p>
            </div>

            {report.messages.reduce((acc: any[], msg, idx) => {
                if (msg.role === "user") {
                    const next = report.messages[idx + 1];
                    acc.push({ q: msg, a: next?.role === "assistant" ? next : null });
                }
                return acc;
            }, []).map((pair: any, i: number) => (
                <div key={i} style={{ marginBottom: "28px", pageBreakInside: "avoid" }}>
                    <div style={{ background: "#f5f3ff", borderLeft: "4px solid #7C6FFF", padding: "12px 16px", borderRadius: "8px", marginBottom: "12px" }}>
                        <strong style={{ fontSize: "13px", color: "#333" }}>Q{i + 1}: {pair.q.content}</strong>
                    </div>
                    {pair.a?.sql && (
                        <div style={{ background: "#f8f8f8", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 16px", marginBottom: "10px", fontFamily: "monospace", fontSize: "11px", color: "#555", whiteSpace: "pre-wrap" }}>
                            {pair.a.sql}
                        </div>
                    )}
                    {pair.a && (
                        <p style={{ fontSize: "12px", color: "#444", lineHeight: 1.7, margin: 0 }}>
                            {pair.a.content.replace(/```[\s\S]*?```/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/#+\s/g, "").replace(/\[Previously executed SQL:[^\]]+\]/g, "").trim().slice(0, 800)}
                        </p>
                    )}
                </div>
            ))}

            <div style={{ borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "32px", fontSize: "10px", color: "#aaa", textAlign: "center" }}>
                Data-Talk · AI-Powered Analytics · Confidential
            </div>
        </div>
    );
}

// ── Main Reports Dashboard ────────────────────────────────────────────────────
function ReportsDashboard() {
    const { conversations } = useChat();
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [printReport, setPrintReport] = useState<Report | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Build reports from chat conversations stored in LocalStorage
    useEffect(() => {
        const built: Report[] = conversations
            .filter(c => c.messages && c.messages.length > 1)
            .map(c => ({
                id: c.id,
                title: c.title || "Untitled Analysis",
                createdAt: c.updatedAt
                    ? new Date(c.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                    : "Unknown date",
                messages: buildReportMessages(c.messages || []),
            }));
        setReports(built);
    }, [conversations]);

    const handlePrint = (report: Report) => {
        setPrintReport(report);
        setTimeout(() => {
            window.print();
            setPrintReport(null);
        }, 200);
    };

    return (
        <div
            className="flex h-screen overflow-hidden relative transition-colors duration-300"
            style={{ background: "var(--page-bg)" }}
        >
            {/* Background dot-grid */}
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
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#7C6FFF,#00C9B1)", boxShadow: "0 0 10px rgba(124,111,255,0.40)" }}
                        >
                            <FileText className="w-[14px] h-[14px] text-white" />
                        </div>
                        <span className="font-semibold text-[14px] tracking-tight text-foreground/85">
                            Reports
                        </span>
                        {reports.length > 0 && (
                            <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: `${ACCENT}18`, color: ACCENT }}
                            >
                                {reports.length} analysis{reports.length !== 1 ? "es" : ""}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground/60 hidden sm:block">
                            Export any analysis as a PDF report
                        </span>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

                        {/* Empty state — no conversations yet */}
                        {reports.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-28 gap-5">
                                <div
                                    className="w-20 h-20 rounded-3xl flex items-center justify-center"
                                    style={{ background: `${ACCENT}10`, border: `1px dashed ${ACCENT}30` }}
                                >
                                    <FileText className="w-9 h-9 text-muted-foreground/30" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[15px] font-bold text-foreground/70">No reports yet</p>
                                    <p className="text-[12px] text-muted-foreground mt-1 max-w-sm leading-relaxed">
                                        Your chat analyses automatically appear here as reports.
                                        Start a conversation in Chat and ask questions about your data.
                                    </p>
                                </div>
                                <a
                                    href="/chat"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-105 shadow-lg"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` }}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Start Analysis
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        )}

                        {/* Hint header above report list */}
                        {reports.length > 0 && (
                            <div
                                className="flex items-center gap-3 p-4 rounded-xl"
                                style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}18` }}
                            >
                                <Sparkles className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                                <p className="text-[12px] text-foreground/70">
                                    <strong className="text-foreground">Tip:</strong> Click <strong>Export PDF</strong> on any report to save a clean, printable version of your analysis with all SQL queries and insights.
                                </p>
                            </div>
                        )}

                        {/* Report cards */}
                        {reports.map(report => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                onPrint={() => handlePrint(report)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Hidden print template */}
            {printReport && (
                <div
                    className="hidden print:block fixed inset-0 z-[9999] bg-white"
                    ref={printRef}
                >
                    <PrintTemplate report={printReport} />
                </div>
            )}

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body > *:not(.print\\:block) { display: none !important; }
                    .print\\:block { display: block !important; }
                }
            `}</style>
        </div>
    );
}

export default function ReportsPage() {
    return (
        <ChatProvider>
            <ReportsDashboard />
        </ChatProvider>
    );
}
