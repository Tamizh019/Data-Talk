"use client";

import type { EChartsConfig } from "./ChartRenderer";

interface KpiCardProps {
    config: EChartsConfig;
}

export default function KpiCard({ config }: KpiCardProps) {
    // title can be a string or an ECharts object {text, textStyle}
    const rawTitle = config.title;
    const title: string =
        typeof rawTitle === "string"
            ? rawTitle
            : rawTitle && typeof rawTitle === "object" && "text" in (rawTitle as object)
                ? String((rawTitle as Record<string, unknown>).text)
                : "KPI";
    const value = config.formatted_value ?? config.value ?? "—";
    const delta = config.delta as string | undefined;
    const direction = (config.delta_direction as string) || "neutral";

    const deltaColor =
        direction === "up"
            ? "#34d399"
            : direction === "down"
                ? "#f87171"
                : "#94a3b8";

    const deltaArrow =
        direction === "up" ? "↑" : direction === "down" ? "↓" : "—";

    return (
        <div
            className="w-full rounded-xl overflow-hidden shadow-lg flex flex-col items-center justify-center py-8 px-6"
            style={{
                background: "rgba(7, 7, 13, 0.7)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.07)",
                minHeight: 200,
            }}
        >
            {/* Label */}
            <span
                className="text-[11px] font-bold uppercase tracking-widest mb-3"
                style={{ color: "#7C6FFF" }}
            >
                {title}
            </span>

            {/* Big Number */}
            <span
                className="text-4xl font-extrabold tracking-tight"
                style={{
                    background: "linear-gradient(135deg, #e2e8f0, #7C6FFF)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}
            >
                {String(value)}
            </span>

            {/* Delta */}
            {delta && (
                <div className="flex items-center gap-1.5 mt-3">
                    <span
                        className="text-lg font-bold"
                        style={{ color: deltaColor }}
                    >
                        {deltaArrow}
                    </span>
                    <span
                        className="text-sm font-semibold"
                        style={{ color: deltaColor }}
                    >
                        {delta}
                    </span>
                </div>
            )}
        </div>
    );
}
