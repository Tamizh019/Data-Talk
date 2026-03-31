"use client";
/**
 * SchemaExplorer — standalone schema browser panel.
 * Shows tables with expandable column lists and a live refresh button.
 */
import { useState, useEffect } from "react";
import { Database, TableProperties, Columns, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { fetchSchema, type SchemaTable } from "@/lib/api";

interface SchemaExplorerProps {
    dbConnected?: boolean;
}

export default function SchemaExplorer({ dbConnected }: SchemaExplorerProps) {
    const [tables, setTables] = useState<SchemaTable[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    const load = async () => {
        if (!dbConnected) return;
        setLoading(true);
        try {
            const data = await fetchSchema();
            setTables(data.tables || []);
        } catch {}
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [dbConnected]);

    const toggleTable = (table: string) => {
        setExpandedTables(prev => {
            const next = new Set(prev);
            if (next.has(table)) next.delete(table);
            else next.add(table);
            return next;
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden transition-colors duration-300"
            style={{ background: "var(--glass-bg)" }}>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--glass-border)" }}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "rgba(124,111,255,0.12)", border: "1px solid rgba(124,111,255,0.20)" }}>
                        <Database className="w-3 h-3" style={{ color: "#7C6FFF" }} />
                    </div>
                    <div>
                        <p className="text-[12px] font-bold text-foreground">Schema Explorer</p>
                        {tables.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">{tables.length} tables</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={load}
                    disabled={loading || !dbConnected}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    title="Refresh schema"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Table list */}
            <div className="flex-1 overflow-y-auto py-2 px-2">
                {!dbConnected ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(124,111,255,0.08)", border: "1px solid rgba(124,111,255,0.15)" }}>
                            <Database className="w-5 h-5" style={{ color: "#7C6FFF", opacity: 0.5 }} />
                        </div>
                        <p className="text-[12px] text-muted-foreground/70 text-center leading-relaxed px-4">
                            Connect a database to explore tables and columns
                        </p>
                    </div>
                ) : loading ? (
                    <div className="space-y-2 p-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-8 rounded-lg animate-pulse"
                                style={{ background: "var(--glass-bg-hover)" }} />
                        ))}
                    </div>
                ) : tables.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground/60 italic text-center py-6">No tables found</p>
                ) : (
                    <div className="space-y-0.5">
                        {tables.map(t => {
                            const isExpanded = expandedTables.has(t.table);
                            const cols = t.columns
                                ? t.columns.split(",").map(c => c.trim()).filter(Boolean)
                                : [];

                            return (
                                <div key={t.table}>
                                    <button
                                        onClick={() => toggleTable(t.table)}
                                        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-foreground/5 transition-colors group text-left"
                                    >
                                        <span className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors shrink-0">
                                            {isExpanded
                                                ? <ChevronDown className="w-3 h-3" />
                                                : <ChevronRight className="w-3 h-3" />}
                                        </span>
                                        <TableProperties className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                                        <span className="text-[12px] font-medium text-muted-foreground/80 group-hover:text-foreground transition-colors truncate">
                                            {t.table}
                                        </span>
                                        {cols.length > 0 && (
                                            <span className="ml-auto text-[10px] text-muted-foreground/40 shrink-0">
                                                {cols.length}
                                            </span>
                                        )}
                                    </button>

                                    {/* Column list */}
                                    {isExpanded && cols.length > 0 && (
                                        <div className="pl-8 pb-1 space-y-0.5">
                                            {cols.map(col => (
                                                <div key={col}
                                                    className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-foreground/5 transition-colors cursor-default">
                                                    <Columns className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                                    <span className="text-[11px] text-muted-foreground/60 truncate">{col}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
