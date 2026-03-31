"use client";

import ChartRenderer, { type VisualizerBlock } from "./ChartRenderer";
import KpiCard from "./KpiCard";

interface DashboardPanelProps {
    charts: VisualizerBlock[];
}

export default function DashboardPanel({ charts }: DashboardPanelProps) {
    if (!charts || charts.length === 0) return null;

    // Separate KPI cards from regular visualizer blocks
    const kpiCards = charts.filter((c) => c.library === "kpi" || c.chart_type === "kpi_card");
    const regularCharts = charts.filter((c) => c.library !== "kpi" && c.chart_type !== "kpi_card");

    // Determine grid layout based on count
    const totalItems = charts.length;
    const gridClass =
        regularCharts.length === 1
            ? "grid-cols-1"
            : regularCharts.length === 2
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
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Dashboard &middot; {totalItems} component{totalItems !== 1 ? "s" : ""}
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
                            <KpiCard block={kpi} />
                        </div>
                    ))}
                </div>
            )}

            {/* Charts Grid */}
            {regularCharts.length > 0 && (
                <div className={`grid gap-3 ${gridClass}`}>
                    {regularCharts.map((chart, idx) => {
                        const isTable = chart.library === "table";
                        return (
                            <div
                                key={`chart-${idx}`}
                                className={`animate-fadein ${isTable ? "md:col-span-full" : ""}`}
                                style={{ animationDelay: `${(kpiCards.length + idx) * 150}ms` }}
                            >
                                <ChartRenderer block={chart} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
