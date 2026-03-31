"use client";
/**
 * StudioPanel — Pure dashboard wrapper (Schema moved to Sidebar).
 * Shows: query history breadcrumb bar → DashboardStudio
 */
import { useEffect, useRef } from "react";
import { BarChart2 } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import DashboardStudio from "./DashboardStudio";

interface StudioPanelProps {
    isDark: boolean;
    dbConnected?: boolean;
}

export default function StudioPanel({ isDark, dbConnected }: StudioPanelProps) {
    const { queryHistory, activeQueryId, setActiveQueryId } = useStudio();
    const prevHistoryLen = useRef(queryHistory.length);

    // Auto-switch whenever a new query arrives is handled in DashboardStudio/context

    useEffect(() => {
        prevHistoryLen.current = queryHistory.length;
    }, [queryHistory.length]);

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--page-bg)" }}>
            {/* ── Slim top query history breadcrumb ──────────────────────── */}
            {queryHistory.length > 0 && (
                <div
                    className="shrink-0 flex items-center gap-1.5 px-3 overflow-x-auto border-b"
                    style={{
                        background: "var(--glass-bg)",
                        borderColor: "var(--glass-border)",
                        minHeight: 40,
                        scrollbarWidth: "none",
                    }}
                >
                    <BarChart2 className="w-3 h-3 text-muted-foreground/40 shrink-0 mr-1" />
                    {queryHistory.slice().reverse().map((q) => {
                        const isActive = q.id === activeQueryId;
                        return (
                            <button
                                key={q.id}
                                onClick={() => setActiveQueryId(q.id)}
                                className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
                                style={{
                                    background: isActive ? "rgba(124,111,255,0.14)" : "transparent",
                                    color: isActive ? "#7C6FFF" : "var(--color-muted-foreground)",
                                    border: isActive ? "1px solid rgba(124,111,255,0.35)" : "1px solid transparent",
                                    maxWidth: "220px",
                                }}
                                title={q.question}
                            >
                                {isActive && (
                                    <span className="relative flex shrink-0 w-1.5 h-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#7C6FFF" }} />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#7C6FFF" }} />
                                    </span>
                                )}
                                <span className="truncate max-w-[180px]">{q.question}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Dashboard canvas ────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                <DashboardStudio isDark={isDark} />
            </div>
        </div>
    );
}
