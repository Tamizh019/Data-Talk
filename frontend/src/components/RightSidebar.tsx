"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, TableProperties, ChevronDown, ChevronRight, RefreshCw, Layers } from "lucide-react";
import { fetchSchema, SchemaTable } from "@/lib/api";

interface RightSidebarProps {
    dbConnected?: boolean;
}

export default function RightSidebar({ dbConnected = false }: RightSidebarProps) {
    const [publicExpanded, setPublicExpanded] = useState(true);
    const [tables, setTables] = useState<SchemaTable[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadSchema = async () => {
        setIsLoading(true);
        try {
            const data = await fetchSchema();
            setTables(data.tables || []);
        } catch (error) {
            console.error("Failed to load schema:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (dbConnected) {
            loadSchema();
        }
    }, [dbConnected]);

    if (!dbConnected) return null;

    return (
        <div
            className="flex flex-col h-full shrink-0 z-40 relative animate-fadein"
            style={{
                width: "260px",
                background: "rgba(13, 13, 22, 0.85)",
                borderLeft: "1px solid rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
            }}
        >
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
                <span
                    className="font-bold text-[11px] tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                >
                    Schema Explorer
                </span>
                <button
                    className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                    title="Filter"
                >
                    <Layers className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* ── Schema Content ────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex flex-col pt-2">
                <ScrollArea className="flex-1 px-3">
                    {/* Public Schema */}
                    <div className="mb-2">
                        <button
                            onClick={() => setPublicExpanded(!publicExpanded)}
                            className="flex items-center gap-2 w-full px-2 py-2 text-left hover:bg-white/5 rounded-lg transition-colors group"
                        >
                            <span className="text-white/40 group-hover:text-white/80 transition-colors">
                                {publicExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </span>
                            <span className="text-[12px] font-semibold text-white/90">Public Tables</span>
                        </button>
                        
                        {publicExpanded && (
                            <div className="pl-6 pr-2 py-1 space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
                                {isLoading ? (
                                    <div className="px-2 py-1.5 text-[11px] text-white/40 italic">Loading tables...</div>
                                ) : tables.length > 0 ? (
                                    tables.map((tableObj) => (
                                        <div
                                            key={tableObj.table}
                                            className="flex flex-col gap-1 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <TableProperties className="w-3 h-3 text-white/30 group-hover:text-[#00C9B1] transition-colors" />
                                                <span className="text-[12px] text-white/60 group-hover:text-white/90 transition-colors">
                                                    {tableObj.table}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-2 py-1.5 text-[11px] text-white/40 italic">No tables found</div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="p-4 border-t border-white/5 mt-auto">
                <button
                    onClick={loadSchema}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[11px] font-semibold text-white/60 hover:text-white transition-all hover:bg-white/5 disabled:opacity-50"
                    style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    REFRESH SCHEMA
                </button>
            </div>
        </div>
    );
}
