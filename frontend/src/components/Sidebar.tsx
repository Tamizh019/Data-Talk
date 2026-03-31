"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, MessageSquare, Database, Settings, Trash2, Sun, Moon, ChevronDown, ChevronRight, TableProperties, Columns, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { fetchSchema, type SchemaTable } from "@/lib/api";

interface SidebarProps {
    dbConnected?: boolean;
}

export default function Sidebar({ dbConnected = false }: SidebarProps) {
    const { conversations, activeId, setActiveChat, createNewChat, deleteChat } = useChat();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [schemaOpen, setSchemaOpen] = useState(true);

    // Schema state
    const [tables, setTables] = useState<SchemaTable[]>([]);
    const [loadingSchema, setLoadingSchema] = useState(false);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    useEffect(() => { setMounted(true); }, []);

    const loadSchema = async () => {
        if (!dbConnected) return;
        setLoadingSchema(true);
        try {
            const data = await fetchSchema();
            setTables(data.tables || []);
        } catch { }
        finally { setLoadingSchema(false); }
    };

    useEffect(() => { if (dbConnected) loadSchema(); }, [dbConnected]);

    const toggleTable = (table: string) => {
        setExpandedTables(prev => {
            const next = new Set(prev);
            if (next.has(table)) next.delete(table); else next.add(table);
            return next;
        });
    };

    return (
        <div
            className="flex flex-col h-full shrink-0 z-40 relative transition-colors duration-300"
            style={{
                width: "260px",
                background: "var(--glass-bg)",
                borderRight: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
            }}
        >
            {/* ── Brand ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-5 shrink-0">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)", boxShadow: "0 0 12px rgba(124,111,255,0.35)" }}
                >
                    <svg className="w-[16px] h-[16px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    </svg>
                </div>
                <span className="font-bold text-[16px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                    Data-Talk
                </span>
            </div>

            {/* ── New Chat ──────────────────────────────────────────── */}
            <div className="px-4 pb-4 shrink-0">
                <button
                    onClick={createNewChat}
                    className="group relative w-full p-[1px] rounded-xl overflow-hidden transition-all"
                >
                    <div
                        className="absolute inset-0 rounded-xl opacity-50"
                        style={{ background: "linear-gradient(90deg, rgba(124,111,255,0.5), rgba(0,201,177,0.5))" }}
                    />
                    <div className="relative flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/40 transition-colors bg-background/50 dark:bg-[#13131F]/90 backdrop-blur-sm">
                        <span className="text-[#00C9B1] text-lg leading-none font-light">+</span>
                        <span className="text-sm font-medium text-foreground">New Chat</span>
                    </div>
                </button>
            </div>

            <div className="mx-4 border-t border-border/50 mb-3 shrink-0" />

            {/* ── Recent Chats ────────────────────────────────────────── */}
            <div className="px-3 flex flex-col min-h-0" style={{ flex: 4 }}>
                <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest px-2 pb-2 shrink-0">
                    Recent
                </p>
                <ScrollArea className="flex-1">
                    <div className="space-y-0.5 px-1 pr-2">
                        {conversations.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all group cursor-pointer border-l-2",
                                    activeId === item.id
                                        ? "bg-primary/10 border-primary text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:border-primary/30"
                                )}
                                onClick={() => setActiveChat(item.id)}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 text-left text-[12px]">
                                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                    <span className="truncate flex-1">{item.title}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteChat(item.id); }}
                                    className={cn(
                                        "p-1 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 focus:opacity-100 shrink-0",
                                        activeId === item.id ? "opacity-100" : "group-hover:opacity-100"
                                    )}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* ── Schema Explorer (bottom, collapsible) ─────────────── */}
            <div
                className="border-t flex flex-col min-h-0 overflow-hidden"
                style={{ flex: 6, borderColor: "var(--glass-border)" }}
            >
                {/* Schema header toggle — use div (not button) so the inner refresh button is valid HTML */}
                <div
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-foreground/5 transition-colors cursor-pointer select-none"
                    onClick={() => setSchemaOpen(o => !o)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && setSchemaOpen(o => !o)}
                >
                    <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "rgba(124,111,255,0.12)" }}
                    >
                        <Database className="w-3 h-3" style={{ color: "#7C6FFF" }} />
                    </div>
                    <span className="text-[11px] font-bold text-foreground/80 flex-1 text-left">Schema Explorer</span>
                    {tables.length > 0 && (
                        <span className="text-[9px] text-muted-foreground/50 mr-1">{tables.length} tables</span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); loadSchema(); }}
                        disabled={loadingSchema || !dbConnected}
                        className="p-1 rounded hover:bg-foreground/10 text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-30 mr-1"
                        title="Refresh schema"
                    >
                        <RefreshCw className={`w-2.5 h-2.5 ${loadingSchema ? "animate-spin" : ""}`} />
                    </button>
                    {schemaOpen
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    }
                </div>

                {/* Schema body */}
                {schemaOpen && (
                    <div
                        className="flex-1 overflow-y-auto custom-scrollbar"
                        style={{ borderTop: "1px solid var(--glass-border)" }}
                    >
                        {!dbConnected ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                <Database className="w-5 h-5 text-muted-foreground/30" />
                                <p className="text-[11px] text-muted-foreground/50 text-center px-4">Connect a database to explore schema</p>
                            </div>
                        ) : loadingSchema ? (
                            <div className="space-y-2 p-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-7 rounded-lg animate-pulse" style={{ background: "var(--glass-bg-hover)" }} />
                                ))}
                            </div>
                        ) : tables.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground/50 italic text-center py-4">No tables found</p>
                        ) : (
                            <div className="py-1.5 px-2 space-y-0.5">
                                {tables.map(t => {
                                    const isExpanded = expandedTables.has(t.table);
                                    const cols = t.columns ? t.columns.split(",").map(c => c.trim()).filter(Boolean) : [];
                                    return (
                                        <div key={t.table}>
                                            <button
                                                onClick={() => toggleTable(t.table)}
                                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors group text-left"
                                            >
                                                <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0">
                                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                </span>
                                                <TableProperties className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                                                <span className="text-[11px] font-medium text-muted-foreground/80 group-hover:text-foreground transition-colors truncate">
                                                    {t.table}
                                                </span>
                                                {cols.length > 0 && (
                                                    <span className="ml-auto text-[9px] text-muted-foreground/40 shrink-0">{cols.length}</span>
                                                )}
                                            </button>
                                            {isExpanded && cols.length > 0 && (
                                                <div className="pl-8 py-0.5 space-y-0.5">
                                                    {cols.map(col => (
                                                        <div key={col} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-foreground/5 transition-colors cursor-default">
                                                            <Columns className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                                                            <span className="text-[10px] text-muted-foreground/60 truncate">{col}</span>
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
                )}
            </div>

            {/* ── User / Workspace ──────────────────────────────────── */}
            <div className="px-4 pb-4 pt-3 shrink-0 border-t" style={{ borderColor: "var(--glass-border)" }}>
                <div
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-foreground/5 cursor-pointer"
                    style={{ background: "var(--glass-bg-hover)", border: "1px solid var(--glass-border)" }}
                >
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                    >
                        {user?.user_metadata?.full_name
                            ? user.user_metadata.full_name.charAt(0).toUpperCase()
                            : user?.email ? user.email.charAt(0).toUpperCase() : "DT"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-foreground truncate">
                            {user?.user_metadata?.full_name || user?.user_metadata?.name || "Premium User"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {user?.email || "Workspace Admin"}
                        </p>
                    </div>
                    {mounted && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setTheme(theme === "dark" ? "light" : "dark"); }}
                            className="p-1.5 rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Toggle Theme"
                        >
                            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <a href="/profile" onClick={(e) => e.stopPropagation()}>
                        <Settings className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0" />
                    </a>
                </div>
            </div>
        </div>
    );
}
