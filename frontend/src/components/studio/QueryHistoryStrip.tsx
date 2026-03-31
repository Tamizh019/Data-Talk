"use client";
/**
 * QueryHistoryStrip — horizontal scrollable row of past queries.
 * Each chip shows a truncated question, chart count, and relative timestamp.
 * The active chip has a glowing purple/teal border.
 */
import { useRef } from "react";
import { BarChart2, Clock } from "lucide-react";
import { useStudio, type QueryEntry } from "@/lib/studio-context";

function relativeTime(ts: number): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function QueryHistoryStrip() {
    const { queryHistory, activeQueryId, setActiveQueryId } = useStudio();
    const scrollRef = useRef<HTMLDivElement>(null);

    if (queryHistory.length === 0) return null;

    return (
        <div
            className="shrink-0 border-b flex items-center gap-0 overflow-hidden"
            style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg)", minHeight: 48 }}
        >
            <div
                className="text-[10px] font-bold uppercase tracking-widest shrink-0 px-3 py-2 border-r"
                style={{ color: "var(--color-muted-foreground)", borderColor: "var(--glass-border)", opacity: 0.6 }}
            >
                History
            </div>

            {/* Scrollable chip row */}
            <div
                ref={scrollRef}
                className="flex-1 flex items-center gap-2 overflow-x-auto px-3 py-2 scroll-smooth"
                style={{ scrollbarWidth: "none" }}
            >
                {queryHistory.map((entry: QueryEntry) => {
                    const isActive = entry.id === activeQueryId;
                    return (
                        <button
                            key={entry.id}
                            onClick={() => setActiveQueryId(entry.id)}
                            className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                            style={{
                                background: isActive
                                    ? "linear-gradient(135deg, rgba(124,111,255,0.15), rgba(0,201,177,0.10))"
                                    : "var(--glass-bg-hover)",
                                border: isActive
                                    ? "1px solid rgba(124,111,255,0.45)"
                                    : "1px solid var(--glass-border)",
                                color: isActive ? "#7C6FFF" : "var(--color-muted-foreground)",
                                boxShadow: isActive ? "0 0 12px rgba(124,111,255,0.20)" : "none",
                            }}
                        >
                            {/* Active ring indicator */}
                            {isActive && (
                                <span className="relative flex shrink-0">
                                    <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75"
                                        style={{ background: "#7C6FFF" }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                                        style={{ background: "#7C6FFF" }} />
                                </span>
                            )}

                            {/* Question summary */}
                            <span className="max-w-[160px] truncate">
                                {entry.question || "Untitled query"}
                            </span>

                            {/* Chart count badge */}
                            <span
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                                style={{
                                    background: isActive ? "rgba(0,201,177,0.15)" : "rgba(255,255,255,0.06)",
                                    color: isActive ? "#00C9B1" : "var(--color-muted-foreground)",
                                }}
                            >
                                <BarChart2 className="w-2 h-2" />
                                {entry.charts.length}
                            </span>

                            {/* Time */}
                            <span className="text-[9px] shrink-0 opacity-60 flex items-center gap-0.5">
                                <Clock className="w-2 h-2" />
                                {relativeTime(entry.timestamp)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
