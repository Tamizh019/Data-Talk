"use client";

import React, { useState, useMemo } from "react";

export interface DataTableConfig {
    columns: string[];
    data: (string | number)[][];
}

interface DataTableProps {
    config: DataTableConfig;
}

// Helper constants for beautiful luxury badge colors
const PILL_COLORS = [
    { bg: "rgba(124, 111, 255, 0.15)", text: "#9a8cff", border: "rgba(124, 111, 255, 0.3)" }, // Purple
    { bg: "rgba(0, 201, 177, 0.15)", text: "#34d399", border: "rgba(0, 201, 177, 0.3)" },   // Teal
    { bg: "rgba(244, 114, 182, 0.15)", text: "#f472b6", border: "rgba(244, 114, 182, 0.3)" }, // Pink
    { bg: "rgba(250, 204, 21, 0.15)", text: "#facc15", border: "rgba(250, 204, 21, 0.3)" },   // Yellow
    { bg: "rgba(96, 165, 250, 0.15)", text: "#60a5fa", border: "rgba(96, 165, 250, 0.3)" },   // Blue
];

export default function DataTable({ config }: DataTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [showingAll, setShowingAll] = useState(false);

    // 1. Column Intelligence: Detect if a column is purely numeric
    const colStats = useMemo(() => {
        if (!config || !config.data || !config.columns) return [];
        return config.columns.map((col, cIdx) => {
            let isNumeric = true;
            let max = 0;
            
            for (let rIdx = 0; rIdx < config.data.length; rIdx++) {
                const val = config.data[rIdx][cIdx];
                if (val === null || val === undefined || val === "") continue;
                
                const num = Number(val);
                if (isNaN(num)) {
                    isNumeric = false;
                    break;
                }
                if (num > max) max = num;
            }
            return { isNumeric, max };
        });
    }, [config]);

    if (!config || !config.columns || !config.data) return null;

    const toggleRow = (idx: number) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(idx)) newSet.delete(idx);
        else newSet.add(idx);
        setExpandedRows(newSet);
    };

    const isPillColumn = (colName: string) => {
        const name = colName.toLowerCase();
        return name.includes("role") || name.includes("status") || name.includes("gender") || name.includes("type") || name.includes("department");
    };

    const getPillColor = (val: string) => {
        // Hash string to consistently pick a color
        let hash = 0;
        for (let i = 0; i < val.length; i++) hash = val.charCodeAt(i) + ((hash << 5) - hash);
        return PILL_COLORS[Math.abs(hash) % PILL_COLORS.length];
    };

    const displayData = showingAll ? config.data : config.data.slice(0, 10);

    return (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-[#0f0f16]">
            <div className="relative overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-300 relative border-collapse">
                    <thead className="bg-[#1A1A24] border-b border-white/10 text-slate-300 font-semibold tracking-wide sticky top-0 z-20 shadow-md">
                        <tr>
                            {/* Empty header for the expand chevron */}
                            <th className="px-3 py-3.5 w-10 sticky left-0 bg-[#1A1A24] z-30"></th>
                            {config.columns.map((col, idx) => {
                                const isPrimary = idx === 0;
                                return (
                                    <th 
                                        key={idx} 
                                        className={`px-5 py-3.5 whitespace-nowrap ${isPrimary ? "sticky left-10 bg-[#1A1A24] z-30 shadow-[4px_0_12px_rgba(0,0,0,0.3)] border-transparent" : ""} ${colStats[idx].isNumeric ? "text-right" : "text-left"}`}
                                    >
                                        {col.toUpperCase()}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {displayData.map((row, rowIdx) => {
                            const isExpanded = expandedRows.has(rowIdx);
                            return (
                                <React.Fragment key={rowIdx}>
                                    {/* Main Row */}
                                    <tr 
                                        onClick={() => toggleRow(rowIdx)}
                                        className={`group cursor-pointer transition-all duration-200 border-l-[3px] ${isExpanded ? "bg-white/[0.08] border-[#7C6FFF]" : "border-transparent hover:bg-white/[0.04]"}`}
                                    >
                                        {/* Chevron Cell */}
                                        <td className={`px-3 py-3 text-slate-500 group-hover:text-slate-300 transition-colors sticky left-0 z-20 ${isExpanded ? "bg-[#14141c]" : "bg-[#0f0f16] group-hover:bg-[#15151e]"}`}>
                                            <svg
                                                width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                className={`transition-transform duration-300 ${isExpanded ? "rotate-180 text-[#00C9B1]" : "rotate-0"}`}
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </td>
                                        
                                        {/* Data Cells */}
                                        {row.map((cell, cellIdx) => {
                                            const isPrimary = cellIdx === 0;
                                            const stat = colStats[cellIdx];
                                            const colName = config.columns[cellIdx];
                                            const isPill = isPillColumn(colName);
                                            const cellValStr = String(cell);

                                            return (
                                                <td 
                                                    key={cellIdx} 
                                                    className={`relative px-5 py-3 whitespace-nowrap ${isPrimary ? "sticky left-10 z-20 shadow-[4px_0_12px_rgba(0,0,0,0.3)] font-medium text-slate-200" : "text-slate-400"} ${isExpanded ? (isPrimary ? "bg-[#14141c]" : "") : (isPrimary ? "bg-[#0f0f16] group-hover:bg-[#15151e]" : "")} ${stat.isNumeric ? "text-right" : "text-left"}`}
                                                >
                                                    {isPill && cellValStr ? (
                                                        <span 
                                                            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide"
                                                            style={{
                                                                backgroundColor: getPillColor(cellValStr).bg,
                                                                color: getPillColor(cellValStr).text,
                                                                border: `1px solid ${getPillColor(cellValStr).border}`
                                                            }}
                                                        >
                                                            {cellValStr.toUpperCase()}
                                                        </span>
                                                    ) : stat.isNumeric ? (
                                                        <span className="relative z-10 font-mono text-[13px] text-slate-300">{cellValStr}</span>
                                                    ) : (
                                                        <span>{cellValStr}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Expanded Detail Drawer */}
                                    {isExpanded && (
                                        <tr className="bg-[#0b0b10] shadow-inner">
                                            <td colSpan={config.columns.length + 1} className="p-0">
                                                <div 
                                                    className="px-8 py-5 text-sm animate-fadein"
                                                    style={{ borderLeft: "3px solid #7C6FFF" }}
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {config.columns.map((c, i) => (
                                                            <div key={i} className="flex flex-col gap-1 p-3 rounded-md bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                                                                <span className="text-[10px] uppercase font-bold text-[#7C6FFF] tracking-wider">{c}</span>
                                                                <span className="text-slate-200 font-medium truncate">{String(row[i])}</span>
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
                <div className="px-6 py-3 text-xs text-slate-500 bg-[#1A1A24] border-t border-white/10 flex justify-between items-center tracking-wide">
                    <span>Showing {displayData.length} of {config.data.length} records</span>
                    <button 
                        onClick={() => setShowingAll(!showingAll)}
                        className="text-[#00C9B1] font-semibold tracking-wider uppercase cursor-pointer hover:text-teal-300 transition-colors focus:outline-none"
                    >
                        {showingAll ? "Collapse Table" : "View All Records"}
                    </button>
                </div>
            )}
        </div>
    );
}
