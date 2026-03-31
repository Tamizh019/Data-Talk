"use client";

import type { VisualizerBlock } from "./ChartRenderer";

interface KpiCardProps {
    block: VisualizerBlock;
}

export default function KpiCard({ block }: KpiCardProps) {
    if (!block) return null;

    const { title: blockTitle, config } = block;
    const innerConfig = config || block;

    const rawTitle = blockTitle || innerConfig.title;
    const title: string =
        typeof rawTitle === "string"
            ? rawTitle
            : rawTitle && typeof rawTitle === "object" && "text" in (rawTitle as object)
                ? String((rawTitle as Record<string, unknown>).text)
                : "KPI";

    const value = innerConfig.formatted_value ?? innerConfig.value ?? "—";
    const delta = innerConfig.delta as string | undefined;
    const direction = (innerConfig.delta_direction as string) || "neutral";

    const deltaColor =
        direction === "up" ? "#16A34A" : direction === "down" ? "#DC2626" : "var(--color-muted-foreground)";
    const deltaArrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "—";

    return (
        <div
            className="w-full rounded-xl overflow-hidden shadow-md flex flex-col items-center justify-center py-8 px-6 transition-colors duration-300"
            style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                minHeight: 200,
            }}
        >
            {/* Label */}
            <span className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#7C6FFF" }}>
                {title}
            </span>

            {/* Big Number */}
            <span
                className="text-5xl font-extrabold tracking-tight"
                style={{
                    background: "linear-gradient(135deg, #7C6FFF, #00C9B1)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}
            >
                {String(value)}
            </span>

            {/* Delta */}
            {delta && (
                <div
                    className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full"
                    style={{
                        background: direction === "up" ? "rgba(22,163,74,0.10)" : direction === "down" ? "rgba(220,38,38,0.10)" : "var(--glass-bg-hover)",
                        border: `1px solid ${direction === "up" ? "rgba(22,163,74,0.25)" : direction === "down" ? "rgba(220,38,38,0.25)" : "var(--glass-border)"}`,
                    }}
                >
                    <span className="text-lg font-bold" style={{ color: deltaColor }}>{deltaArrow}</span>
                    <span className="text-sm font-semibold" style={{ color: deltaColor }}>{delta}</span>
                </div>
            )}

            {/* Subtitle */}
            <p className="text-[11px] mt-3 text-muted-foreground font-medium">vs previous period</p>
        </div>
    );
}
