"use client";
import { useState, useEffect } from "react";
import { BarChart2, Database, SlidersHorizontal, TableProperties, ChevronDown, ChevronRight, RefreshCw, Layers } from "lucide-react";
import { fetchSchema, type SchemaTable } from "@/lib/api";

interface StudioEmptyStateProps {
    dbConnected?: boolean;
}

export default function StudioEmptyState({ dbConnected }: StudioEmptyStateProps) {
    const [tables, setTables] = useState<SchemaTable[]>([]);
    const [loadingSchema, setLoadingSchema] = useState(false);
    const [schemaExpanded, setSchemaExpanded] = useState(true);

    const loadSchema = async () => {
        setLoadingSchema(true);
        try {
            const data = await fetchSchema();
            setTables(data.tables || []);
        } catch {}
        finally { setLoadingSchema(false); }
    };

    useEffect(() => {
        if (dbConnected) loadSchema();
    }, [dbConnected]);

    return (
        <div
            className="flex h-full overflow-hidden transition-colors duration-300"
            style={{ background: "var(--page-bg)" }}
        >
            {/* ── Left: Schema Explorer (when connected) ── */}
            {dbConnected && (
                <div
                    className="flex flex-col shrink-0 h-full overflow-hidden transition-colors duration-300"
                    style={{
                        width: 220,
                        background: "var(--glass-bg)",
                        borderRight: "1px solid var(--glass-border)",
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                style={{ background: "rgba(124,111,255,0.12)", border: "1px solid rgba(124,111,255,0.20)" }}>
                                <Database className="w-3 h-3" style={{ color: "#7C6FFF" }} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                Schema Explorer
                            </span>
                        </div>
                        <button
                            onClick={loadSchema}
                            disabled={loadingSchema}
                            className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh schema"
                        >
                            <RefreshCw className={`w-3 h-3 ${loadingSchema ? "animate-spin" : ""}`} />
                        </button>
                    </div>

                    {/* Table list */}
                    <div className="flex-1 overflow-y-auto px-2 py-2">
                        {/* Public schema group */}
                        <button
                            onClick={() => setSchemaExpanded(e => !e)}
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-foreground/5 rounded-lg transition-colors group mb-1"
                        >
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                                {schemaExpanded
                                    ? <ChevronDown className="w-3 h-3" />
                                    : <ChevronRight className="w-3 h-3" />}
                            </span>
                            <span className="text-[12px] font-semibold text-foreground/80">Public Tables</span>
                            {tables.length > 0 && (
                                <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium">{tables.length}</span>
                            )}
                        </button>

                        {schemaExpanded && (
                            <div className="pl-5 space-y-0.5">
                                {loadingSchema ? (
                                    <p className="px-2 py-1 text-[11px] text-muted-foreground/60 italic">Loading...</p>
                                ) : tables.length > 0 ? (
                                    tables.map(t => (
                                        <div
                                            key={t.table}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-foreground/5 cursor-pointer group transition-colors"
                                        >
                                            <TableProperties className="w-3 h-3 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                                            <span className="text-[12px] text-muted-foreground/80 group-hover:text-foreground transition-colors truncate">
                                                {t.table}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="px-2 py-1 text-[11px] text-muted-foreground/60 italic">No tables found</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Right: Welcome / Hints ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-12 gap-6 min-w-0">
                {/* Icon cluster */}
                <div className="relative w-20 h-20">
                    <div
                        className="absolute inset-0 rounded-2xl animate-pulse"
                        style={{ background: "rgba(124,111,255,0.08)", border: "1px solid rgba(124,111,255,0.15)" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart2 className="w-9 h-9" style={{ color: "#7C6FFF", opacity: 0.6 }} />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,201,177,0.15)", border: "1px solid rgba(0,201,177,0.30)" }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C9B1" }} />
                    </div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(124,111,255,0.15)", border: "1px solid rgba(124,111,255,0.30)" }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7C6FFF" }} />
                    </div>
                </div>

                <div className="text-center space-y-2 max-w-xs">
                    <h3 className="text-[16px] font-bold text-foreground">Dashboard Studio</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                        Ask a question in the chat — your data will appear here as a fully interactive dashboard.
                        Click <span className="font-semibold" style={{ color: "#00C9B1" }}>"X charts in Studio →"</span> on any past result to reload it.
                    </p>
                </div>

                {/* Feature tiles */}
                <div className="grid grid-cols-3 gap-3 max-w-sm w-full">
                    {[
                        { icon: <BarChart2 className="w-4 h-4" />, label: "Smart Charts", desc: "Up to 8 auto-selected", color: "#7C6FFF" },
                        { icon: <SlidersHorizontal className="w-4 h-4" />, label: "Live Filters", desc: "No re-querying needed", color: "#00C9B1" },
                        { icon: <Database className="w-4 h-4" />, label: "Drill-Down", desc: "Click any chart element", color: "#7C6FFF" },
                    ].map((f, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl text-center"
                            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                        >
                            <span style={{ color: f.color }}>{f.icon}</span>
                            <span className="text-[11px] font-bold text-foreground">{f.label}</span>
                            <span className="text-[10px] text-muted-foreground">{f.desc}</span>
                        </div>
                    ))}
                </div>

                {/* Drag hint */}
                <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5">
                    <span>✦</span> Charts are draggable, resizable, and cross-filtered
                </p>
            </div>
        </div>
    );
}
