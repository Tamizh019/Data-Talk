"use client";

/**
 * ThinkingSteps — compact animated reasoning timeline.
 * Collapsible at any time (even while streaming).
 * Renders structured thinking_step events as a dense timeline
 * with type badges, per-step timing, and stagger-in animations.
 */

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { ThinkingStep, ThinkingStepType } from "@/lib/api";

// ── Type badge configuration ──────────────────────────────────────────────────
const TYPE_CONFIG: Record<
    ThinkingStepType,
    { label: string; color: string; bg: string; border: string }
> = {
    routing:         { label: "routing",          color: "#00C9B1", bg: "rgba(0,201,177,0.12)",   border: "rgba(0,201,177,0.30)"   },
    query_generation:{ label: "query gen", color: "#7C6FFF", bg: "rgba(124,111,255,0.12)", border: "rgba(124,111,255,0.30)" },
    tool_call:       { label: "tool call",        color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.30)"  },
    analysis:        { label: "analysis",         color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.30)"  },
    synthesis:       { label: "synthesis",        color: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.30)"  },
    reflection:      { label: "reflection",       color: "#EC4899", bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.30)"  },
};

// ── Tiny spinner ──────────────────────────────────────────────────────────────
function Spinner({ color }: { color: string }) {
    return (
        <svg className="w-2.5 h-2.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
            <path className="opacity-80" fill={color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

// ── Compact step row — badge + label + detail ────────────────────────────────
function StepRow({ step, index }: { step: ThinkingStep; index: number }) {
    const cfg = TYPE_CONFIG[step.type] ?? TYPE_CONFIG.tool_call;
    const isDone = step.status === "done";

    return (
        <div
            className="flex gap-2.5 py-1.5 animate-fadein"
            style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
        >
            {/* Left — status icon + vertical connector */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
                <div className="w-4 h-4 flex items-center justify-center">
                    {isDone ? (
                        <CheckCircle2 className="w-3 h-3" style={{ color: cfg.color }} />
                    ) : (
                        <Spinner color={cfg.color} />
                    )}
                </div>
                {/* Connector line to next step */}
                <div
                    className="w-px flex-1 mt-1 min-h-[12px]"
                    style={{ background: isDone ? `${cfg.color}28` : "rgba(255,255,255,0.05)" }}
                />
            </div>

            {/* Right — content */}
            <div className="flex-1 pb-1.5 min-w-0">
                {/* Row 1: badge + label + timing */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-full shrink-0"
                        style={{
                            color: cfg.color,
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                        }}
                    >
                        {cfg.label}
                    </span>
                    <span
                        className="text-[11.5px] font-semibold leading-tight"
                        style={{ color: isDone ? "var(--color-foreground)" : cfg.color }}
                    >
                        {step.label}
                    </span>
                    {isDone && step.duration_ms !== undefined && (
                        <span
                            className="text-[9px] font-mono ml-auto shrink-0"
                            style={{ color: "var(--color-muted-foreground)", opacity: 0.4 }}
                        >
                            {step.duration_ms >= 1000 ? `${(step.duration_ms / 1000).toFixed(1)}s` : `${step.duration_ms}ms`}
                        </span>
                    )}
                </div>

                {/* Row 2: detail text — subtle, one line */}
                {step.detail && (
                    <p
                        className="text-[10.5px] leading-snug mt-0.5 truncate"
                        style={{ color: "var(--color-muted-foreground)", opacity: 0.6 }}
                    >
                        {step.detail}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Public component ──────────────────────────────────────────────────────────
interface ThinkingStepsProps {
    steps: ThinkingStep[];
    isStreaming?: boolean;
}

export default function ThinkingSteps({ steps, isStreaming }: ThinkingStepsProps) {
    const [collapsed, setCollapsed] = useState(!isStreaming);

    useEffect(() => {
        if (!isStreaming) {
            setCollapsed(true);
        } else {
            setCollapsed(false);
        }
    }, [isStreaming]);

    if (!steps || steps.length === 0) return null;

    const validSteps = steps.filter((s) => s && s.status != null);
    if (validSteps.length === 0) return null;

    const currentStep = validSteps[validSteps.length - 1];
    const doneCount = validSteps.filter((s) => s.status === "done").length;
    const totalMs = validSteps.reduce((acc, s) => acc + (s.duration_ms ?? 0), 0);

    return (
        <div
            className="rounded-xl overflow-hidden transition-all duration-300"
            style={{
                background: isStreaming
                    ? "rgba(124,111,255,0.04)"
                    : "var(--glass-bg)",
                border: `1px solid ${isStreaming ? "rgba(124,111,255,0.18)" : "var(--glass-border)"}`,
            }}
        >
            {/* ── Header — ALWAYS clickable ── */}
            <button
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                onClick={() => setCollapsed((p) => !p)}
            >
                {/* Status indicator */}
                {isStreaming ? (
                    <span className="relative flex shrink-0">
                        <span
                            className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-60"
                            style={{ background: "#7C6FFF" }}
                        />
                        <span
                            className="relative inline-flex rounded-full h-2 w-2"
                            style={{ background: "#7C6FFF" }}
                        />
                    </span>
                ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                )}

                {/* Label */}
                <span
                    className="text-[11px] font-semibold flex-1 truncate"
                    style={{ color: isStreaming ? "#7C6FFF" : "var(--color-muted-foreground)" }}
                >
                    {isStreaming
                        ? `${currentStep.label} · ${doneCount}/${validSteps.length}`
                        : `Analysis complete · ${validSteps.length} steps`}
                </span>

                {/* Total elapsed */}
                {totalMs > 0 && (
                    <span
                        className="text-[9px] font-mono shrink-0 mr-1"
                        style={{ color: "var(--color-muted-foreground)", opacity: 0.4 }}
                    >
                        {totalMs >= 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`}
                    </span>
                )}

                {/* Chevron — always shown */}
                {collapsed
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    : <ChevronUp className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                }
            </button>

            {/* ── Timeline body — hidden when collapsed ── */}
            {!collapsed && (
                <div
                    className="px-3 pt-1 pb-1.5 border-t"
                    style={{ borderColor: "var(--glass-border)" }}
                >
                    {/* Progress bar while streaming */}
                    {isStreaming && (
                        <div className="mb-2 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${steps.length > 1 ? Math.round((doneCount / steps.length) * 100) : 15}%`,
                                    background: "linear-gradient(90deg, #7C6FFF, #00C9B1)",
                                }}
                            />
                        </div>
                    )}

                    {/* Steps — compact list */}
                    <div>
                        {validSteps.map((step, i) => (
                            <StepRow key={`${step.id}-${i}`} step={step} index={i} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
