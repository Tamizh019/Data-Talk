"use client";

import ChartRenderer, { type EChartsConfig } from "./ChartRenderer";
import KpiCard from "./KpiCard";

interface DashboardPanelProps {
    charts: EChartsConfig[];
}

export default function DashboardPanel({ charts }: DashboardPanelProps) {
    if (!charts || charts.length === 0) return null;

    // Separate KPI cards from regular charts
    const kpiCards = charts.filter((c) => c.chart_type === "kpi_card");
    const regularCharts = charts.filter((c) => c.chart_type !== "kpi_card");

    // Determine grid layout based on count
    const totalItems = charts.length;
    const gridClass =
        totalItems === 1
            ? "grid-cols-1"
            : totalItems === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2";

    return (
        <div className="w-full mt-3 space-y-3">
            {/* Dashboard Header */}
            <div className="flex items-center gap-2 px-1">
                <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#00C9B1", boxShadow: "0 0 6px #00C9B1" }}
                />
                <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                >
                    Dashboard &middot; {totalItems} visualization{totalItems !== 1 ? "s" : ""}
                </span>
            </div>

            {/* KPI Row (if any) */}
            {kpiCards.length > 0 && (
                <div className={`grid gap-3 ${kpiCards.length === 1 ? "grid-cols-1 md:grid-cols-3" : `grid-cols-1 md:grid-cols-${Math.min(kpiCards.length, 3)}`}`}>
                    {kpiCards.map((kpi, idx) => (
                        <div
                            key={`kpi-${idx}`}
                            className="animate-fadein"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <KpiCard config={kpi} />
                        </div>
                    ))}
                </div>
            )}

            {/* Charts Grid */}
            {regularCharts.length > 0 && (
                <div className={`grid gap-3 ${gridClass}`}>
                    {regularCharts.map((chart, idx) => (
                        <div
                            key={`chart-${idx}`}
                            className="animate-fadein"
                            style={{ animationDelay: `${(kpiCards.length + idx) * 150}ms` }}
                        >
                            <ChartRenderer config={chart} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
