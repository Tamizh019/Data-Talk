"use client";
import { X, Database, ChevronRight } from "lucide-react";
import DataTable from "@/components/DataTable";
import type { DrillDownState } from "@/lib/studio-context";

interface DrillDownDrawerProps {
    drilldown: DrillDownState;
    onClose: () => void;
}

export default function DrillDownDrawer({ drilldown, onClose }: DrillDownDrawerProps) {
    const { column, value, rows } = drilldown;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const tableData = rows.map(r => columns.map(c => r[c] ?? ""));

    return (
        <div
            className="shrink-0 flex flex-col h-full overflow-hidden animate-fadein transition-colors duration-300"
            style={{
                width: 380,
                background: "var(--glass-bg)",
                borderLeft: "1px solid var(--glass-border)",
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-border/50">
                <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: "rgba(0,201,177,0.15)", border: "1px solid rgba(0,201,177,0.25)" }}
                >
                    <Database className="w-3.5 h-3.5" style={{ color: "#00C9B1" }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground leading-tight">Drill-Down</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                        <span className="text-muted-foreground/60">{column}</span>
                        <ChevronRight className="w-3 h-3 inline mx-0.5 opacity-50" />
                        <span className="font-semibold" style={{ color: "#00C9B1" }}>{value}</span>
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C9B1", boxShadow: "0 0 5px #00C9B1" }} />
                    <span className="text-[11px] text-muted-foreground font-medium">
                        <span className="font-bold text-foreground">{rows.length}</span> related rows
                    </span>
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-y-auto p-3">
                {rows.length > 0 ? (
                    <DataTable config={{ columns, data: tableData }} />
                ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No related rows found.
                    </div>
                )}
            </div>
        </div>
    );
}
