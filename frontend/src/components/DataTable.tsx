"use client";

import React, { useState, useMemo } from "react";

export interface DataTableConfig {
    columns: string[];
    data: (string | number)[][];
}

interface DataTableProps {
    config: DataTableConfig;
}

const PILL_COLORS = [
    { bg: "rgba(124, 111, 255, 0.15)", text: "#7C6FFF", border: "rgba(124, 111, 255, 0.30)" },
    { bg: "rgba(0, 201, 177, 0.15)",   text: "#00A896", border: "rgba(0, 201, 177, 0.30)"   },
    { bg: "rgba(244, 114, 182, 0.15)", text: "#E0569A", border: "rgba(244, 114, 182, 0.30)" },
    { bg: "rgba(250, 204, 21, 0.15)",  text: "#C08B00", border: "rgba(250, 204, 21, 0.30)"  },
    { bg: "rgba(96, 165, 250, 0.15)",  text: "#2B7CE0", border: "rgba(96, 165, 250, 0.30)"  },
];

export default function DataTable({ config }: DataTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [showingAll, setShowingAll] = useState(false);

    const colStats = useMemo(() => {
        if (!config?.data || !config?.columns) return [];
        return config.columns.map((_, cIdx) => {
            let isNumeric = true;
            let max = 0;
            for (let rIdx = 0; rIdx < config.data.length; rIdx++) {
                const rawRow = config.data[rIdx] as any;
                let val = rawRow[cIdx];
                if (!Array.isArray(rawRow) && typeof rawRow === "object") {
                    const colName = config.columns[cIdx];
                    val = colName in rawRow ? rawRow[colName] : Object.values(rawRow)[cIdx];
                }
                
                if (val === null || val === undefined || val === "") continue;
                const num = Number(val);
                if (isNaN(num)) { isNumeric = false; break; }
                if (num > max) max = num;
            }
            return { isNumeric, max };
        });
    }, [config]);

    if (!config?.columns || !config?.data) return null;

    const toggleRow = (idx: number) => {
        const s = new Set(expandedRows);
        s.has(idx) ? s.delete(idx) : s.add(idx);
        setExpandedRows(s);
    };

    const isPillColumn = (col: string) => {
        const n = col.toLowerCase();
        return n.includes("role") || n.includes("status") || n.includes("gender") || n.includes("type") || n.includes("department");
    };

    const getPillColor = (val: string) => {
        let hash = 0;
        for (let i = 0; i < val.length; i++) hash = val.charCodeAt(i) + ((hash << 5) - hash);
        return PILL_COLORS[Math.abs(hash) % PILL_COLORS.length];
    };

    const displayData = showingAll ? config.data : config.data.slice(0, 10);

    return (
        <div
            className="w-full overflow-hidden rounded-xl shadow-md"
            style={{
                background: "var(--table-bg)",
                border: "1px solid var(--table-border)",
            }}
        >
            <div className="relative overflow-x-auto w-full">
                <table
                    className="w-full text-left text-sm border-collapse"
                    style={{ color: "var(--table-text)" }}
                >
                    {/* ── Header ── */}
                    <thead
                        style={{
                            background: "var(--table-header-bg)",
                            borderBottom: "1px solid var(--table-border)",
                        }}
                    >
                        <tr>
                            <th className="px-3 py-3.5 w-10" style={{ background: "var(--table-header-bg)" }} />
                            {config.columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-5 py-3.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider ${colStats[idx]?.isNumeric ? "text-right" : "text-left"}`}
                                    style={{ color: "var(--table-text-muted)" }}
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody>
                        {displayData.map((rawRow, rowIdx) => {
                            // Safe fallback in case the backend sends objects instead of arrays
                            const row = Array.isArray(rawRow) ? rawRow : config.columns.map((c, i) => {
                                return c in (rawRow as any) ? (rawRow as any)[c] : Object.values(rawRow)[i];
                            });

                            const isExpanded = expandedRows.has(rowIdx);
                            return (
                                <React.Fragment key={rowIdx}>
                                    {/* Main Row */}
                                    <tr
                                        onClick={() => toggleRow(rowIdx)}
                                        className="group cursor-pointer transition-all duration-150"
                                        style={{
                                            borderBottom: "1px solid var(--table-border)",
                                            borderLeft: `3px solid ${isExpanded ? "#7C6FFF" : "transparent"}`,
                                            background: isExpanded ? "rgba(124,111,255,0.05)" : "var(--table-row-bg)",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = "var(--table-row-hover)";
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isExpanded) (e.currentTarget as HTMLTableRowElement).style.background = "var(--table-row-bg)";
                                        }}
                                    >
                                        {/* Expand chevron */}
                                        <td className="px-3 py-3" style={{ color: "var(--table-text-muted)" }}>
                                            <svg
                                                width="15" height="15" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                                style={{ color: isExpanded ? "#7C6FFF" : "var(--table-text-muted)" }}
                                            >
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </td>

                                        {row.map((cell, cellIdx) => {
                                            const stat = colStats[cellIdx];
                                            const colName = config.columns[cellIdx];
                                            const isPill = isPillColumn(colName);
                                            const cellStr = String(cell ?? "");
                                            const isPrimary = cellIdx === 0;

                                            return (
                                                <td
                                                    key={cellIdx}
                                                    className={`px-5 py-3 whitespace-nowrap ${stat?.isNumeric ? "text-right" : "text-left"}`}
                                                    style={{
                                                        color: isPrimary ? "var(--table-text)" : "var(--table-text-muted)",
                                                        fontWeight: isPrimary ? 600 : 400,
                                                    }}
                                                >
                                                    {isPill && cellStr ? (
                                                        <span
                                                            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide"
                                                            style={{
                                                                backgroundColor: getPillColor(cellStr).bg,
                                                                color: getPillColor(cellStr).text,
                                                                border: `1px solid ${getPillColor(cellStr).border}`,
                                                            }}
                                                        >
                                                            {cellStr.toUpperCase()}
                                                        </span>
                                                    ) : stat?.isNumeric ? (
                                                        <span className="font-mono text-[13px]">{cellStr}</span>
                                                    ) : (
                                                        <span>{cellStr}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Expanded detail drawer */}
                                    {isExpanded && (
                                        <tr style={{ background: "var(--table-header-bg)", borderBottom: "1px solid var(--table-border)" }}>
                                            <td colSpan={config.columns.length + 1} className="p-0">
                                                <div
                                                    className="px-8 py-5 text-sm animate-fadein"
                                                    style={{ borderLeft: "3px solid #7C6FFF" }}
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {config.columns.map((c, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex flex-col gap-1 p-3 rounded-lg transition-colors"
                                                                style={{
                                                                    background: "var(--glass-bg)",
                                                                    border: "1px solid var(--table-border)",
                                                                }}
                                                            >
                                                                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "#7C6FFF" }}>{c}</span>
                                                                <span className="font-medium truncate" style={{ color: "var(--table-text)" }}>{String(row[i])}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {config.data.length > 10 && (
                <div
                    className="px-6 py-3 text-xs flex justify-between items-center tracking-wide"
                    style={{
                        background: "var(--table-header-bg)",
                        borderTop: "1px solid var(--table-border)",
                        color: "var(--table-text-muted)",
                    }}
                >
                    <span>Showing {displayData.length} of {config.data.length} records</span>
                    <button
                        onClick={() => setShowingAll(!showingAll)}
                        className="font-semibold tracking-wider uppercase cursor-pointer transition-colors"
                        style={{ color: "#00C9B1" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#7C6FFF")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#00C9B1")}
                    >
                        {showingAll ? "Collapse Table" : "View All Records"}
                    </button>
                </div>
            )}
        </div>
    );
}
