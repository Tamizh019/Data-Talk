"use client";

import type { VisualizerBlock } from "./ChartRenderer";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    const unit  = innerConfig.unit as string | undefined;

    // Support both old (delta/delta_direction) and new (trend/trend_direction) field names
    const trendLabel = (innerConfig.trend ?? innerConfig.delta) as string | undefined;
    const rawDirection = innerConfig.trend_direction ?? innerConfig.delta_direction;
    const direction = (rawDirection as string) || "neutral";

    const isUp   = direction === "up";
    const isDown = direction === "down";

    const trendColor  = isUp ? "#16A34A" : isDown ? "#EF4444" : "#6B7280";
    const trendBg     = isUp ? "rgba(22,163,74,0.10)"  : isDown ? "rgba(239,68,68,0.10)"  : "rgba(107,114,128,0.10)";
    const trendBorder = isUp ? "rgba(22,163,74,0.25)"  : isDown ? "rgba(239,68,68,0.25)"  : "rgba(107,114,128,0.20)";

    return (
        <div
            className="w-full rounded-xl overflow-hidden flex flex-col items-center justify-center py-8 px-6 transition-all duration-300 group hover:scale-[1.02]"
            style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--shadow-md)",
                minHeight: 180,
                cursor: "default",
            }}
        >
            {/* Accent top glow line */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(90deg, transparent, #7C6FFF, transparent)" }}
            />

            {/* Label */}
            <span
                className="text-[10px] font-bold uppercase tracking-widest mb-3 text-center"
                style={{ color: "#7C6FFF" }}
            >
                {title}
            </span>

            {/* Big Number with unit prefix */}
            <div className="flex items-baseline gap-1">
                {unit && (
                    <span
                        className="text-2xl font-bold"
                        style={{ color: "#7C6FFF", opacity: 0.8 }}
                    >
                        {unit}
                    </span>
                )}
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
            </div>

            {/* Trend badge */}
            {trendLabel && (
                <div
                    className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full"
                    style={{
                        background: trendBg,
                        border: `1px solid ${trendBorder}`,
                    }}
                >
                    {isUp && <TrendingUp  className="w-3.5 h-3.5" style={{ color: trendColor }} />}
                    {isDown && <TrendingDown className="w-3.5 h-3.5" style={{ color: trendColor }} />}
                    {!isUp && !isDown && <Minus className="w-3.5 h-3.5" style={{ color: trendColor }} />}
                    <span className="text-xs font-bold" style={{ color: trendColor }}>
                        {trendLabel}
                    </span>
                </div>
            )}
        </div>
    );
}
