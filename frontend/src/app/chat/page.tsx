"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import ConnectDbModal from "@/components/ConnectDbModal";
import { ChatProvider } from "@/lib/chat-context";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";
import { connectDatabase, fetchSchema, type SchemaTable } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    Share2, Bell, Sun, Moon, Database, X,
    MessageSquare, Trash2, ChevronDown, ChevronRight,
    TableProperties, Columns, RefreshCw, Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

function SchemaDrawer({
    dbConnected,
    open,
    onClose,
}: {
    dbConnected: boolean;
    open: boolean;
    onClose: () => void;
}) {
    const [tables, setTables] = useState<SchemaTable[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    const loadSchema = async () => {
        if (!dbConnected) return;
        setLoading(true);
        try { const d = await fetchSchema(); setTables(d.tables || []); }
        catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { if (dbConnected && open) loadSchema(); }, [dbConnected, open]);

    const toggleTable = (t: string) => {
        setExpandedTables(prev => {
            const n = new Set(prev);
            n.has(t) ? n.delete(t) : n.add(t);
            return n;
        });
    };

    return (
        <>
            {/* Backdrop (mobile) */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer panel */}
            <div
                className="fixed right-0 top-0 h-full z-40 flex flex-col transition-transform duration-300 ease-in-out"
                style={{
                    width: "300px",
                    transform: open ? "translateX(0)" : "translateX(100%)",
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(24px)",
                    borderLeft: "1px solid var(--glass-border)",
                    boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: "rgba(124,111,255,0.15)" }}>
                            <Database className="w-3.5 h-3.5" style={{ color: "#7C6FFF" }} />
                        </div>
                        <span className="text-[12px] font-bold text-foreground">Schema Explorer</span>
                        {tables.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-muted-foreground/60"
                                style={{ background: "var(--glass-bg-hover)", border: "1px solid var(--glass-border)" }}>
                                {tables.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={loadSchema}
                            disabled={loading || !dbConnected}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-30"
                            title="Refresh schema"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-3">
                        {!dbConnected ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
                                <Database className="w-8 h-8 text-muted-foreground/20" />
                                <p className="text-[12px] text-muted-foreground text-center">
                                    Connect a database to view tables and columns.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="space-y-2 p-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 rounded-xl animate-pulse"
                                        style={{ background: "var(--glass-bg-hover)" }} />
                                ))}
                            </div>
                        ) : tables.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground/50 text-center py-8 italic">
                                No tables found.
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {tables.map(t => {
                                    const isExpanded = expandedTables.has(t.table);
                                    const cols = t.columns
                                        ? t.columns.split(",").map(c => c.trim()).filter(Boolean)
                                        : [];
                                    return (
                                        <div
                                            key={t.table}
                                            className="rounded-xl overflow-hidden"
                                            style={{ border: "1px solid var(--glass-border)" }}
                                        >
                                            <button
                                                onClick={() => toggleTable(t.table)}
                                                className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-foreground/5 transition-colors group text-left"
                                            >
                                                <span className="text-muted-foreground/40 group-hover:text-muted-foreground shrink-0">
                                                    {isExpanded
                                                        ? <ChevronDown className="w-3.5 h-3.5" />
                                                        : <ChevronRight className="w-3.5 h-3.5" />}
                                                </span>
                                                <TableProperties className="w-3.5 h-3.5 shrink-0"
                                                    style={{ color: "#7C6FFF" }} />
                                                <span className="text-[12px] font-semibold text-foreground/80 flex-1 truncate">
                                                    {t.table}
                                                </span>
                                                {cols.length > 0 && (
                                                    <span className="text-[9px] font-bold text-muted-foreground/40
                                                        px-1.5 py-0.5 rounded-full shrink-0"
                                                        style={{ background: "var(--glass-bg-hover)" }}>
                                                        {cols.length}
                                                    </span>
                                                )}
                                            </button>
                                            {isExpanded && cols.length > 0 && (
                                                <div className="border-t px-3 py-2 space-y-0.5"
                                                    style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-hover)" }}>
                                                    {cols.map(col => (
                                                        <div key={col} className="flex items-center gap-2 px-1 py-1 rounded-md">
                                                            <Columns className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                                            <span className="text-[11px] text-muted-foreground/60 truncate font-mono">
                                                                {col}
                                                            </span>
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
            </div>
        </>
    );
}

// ── Main Chat Layout ───────────────────────────────────────────────────────
function ChatLayout() {
    const { activeConversation } = useChat();
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const supabase = useRef(createClient()).current;
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [dbConnected, setDbConnected] = useState(false);
    const [showDbPopover, setShowDbPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Panel states
    const [schemaOpen, setSchemaOpen] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Auto-reconnect on load
    useEffect(() => {
        if (!user) return;
        const reconnect = async () => {
            try {
                const { data } = await supabase
                    .from("db_connections").select("connection_uri")
                    .eq("user_id", user.id).eq("is_active", true).maybeSingle();
                if (data?.connection_uri) { await connectDatabase(data.connection_uri); setDbConnected(true); }
            } catch {}
        };
        reconnect();
    }, [user, supabase]);

    // Close DB popover on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node))
                setShowDbPopover(false);
        };
        if (showDbPopover) document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [showDbPopover]);

    const isDark = mounted && theme === "dark";

    return (
        <div
            className="flex h-screen overflow-hidden relative transition-colors duration-300"
            style={{ background: "var(--page-bg)" }}
        >
            {/* Dot grid background */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{ backgroundImage: "radial-gradient(var(--dot-color) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] pointer-events-none z-0"
                style={{ background: "radial-gradient(circle at 50% 50%, var(--bloom-color) 0%, transparent 70%)", filter: "blur(80px)" }}
            />

            {/* ── Sidebar (Claude-style with conversations built-in) ── */}
            <Sidebar onSchemaToggle={() => setSchemaOpen(v => !v)} />

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">

                {/* Top Bar */}
                <header
                    className="h-14 flex items-center justify-between px-6 z-50 shrink-0 transition-colors duration-300"
                    style={{
                        background: "var(--glass-bg)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        borderBottom: "1px solid var(--header-border)",
                    }}
                >
                    {/* Left — active conversation title */}
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: "#7C6FFF" }} />
                        <span className="font-semibold text-[14px] tracking-tight text-foreground/85 truncate max-w-[300px]">
                            {activeConversation?.title || "Data-Talk AI"}
                        </span>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">

                        {/* Schema toggle button — always visible in header */}
                        <button
                            onClick={() => setSchemaOpen(v => !v)}
                            title="Toggle Schema Explorer"
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
                                schemaOpen
                                    ? "text-white"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            style={schemaOpen ? {
                                background: "rgba(124,111,255,0.85)",
                                boxShadow: "0 2px 12px rgba(124,111,255,0.35)",
                            } : {
                                background: "var(--glass-bg-hover)",
                                border: "1px solid var(--glass-border-strong)",
                            }}
                        >
                            <Database className="w-3.5 h-3.5" />
                            Schema
                        </button>

                        {/* DB pill */}
                        <div className="relative" ref={popoverRef}>
                            <button
                                onClick={() => dbConnected ? setShowDbPopover(p => !p) : setShowConnectModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-foreground transition-all active:scale-[0.97]"
                                style={{
                                    background: dbConnected ? "rgba(16,185,129,0.10)" : "var(--glass-bg-hover)",
                                    border: dbConnected ? "1px solid rgba(16,185,129,0.30)" : "1px solid var(--glass-border-strong)",
                                }}
                            >
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ background: dbConnected ? "#34d399" : "#f87171", boxShadow: dbConnected ? "0 0 6px #34d399" : "0 0 6px #f87171" }}
                                />
                                {dbConnected ? "Connected" : "Connect DB"}
                            </button>
                            {showDbPopover && dbConnected && (
                                <div
                                    className="absolute top-full right-0 mt-2 w-[220px] rounded-xl overflow-hidden shadow-2xl z-[100] animate-fadein"
                                    style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border-strong)", backdropFilter: "blur(24px)" }}
                                >
                                    <div className="px-4 pt-3 pb-2 border-b border-border/50">
                                        <p className="text-[11px] font-bold text-foreground/80">Database Connected</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">PostgreSQL is active.</p>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={async () => {
                                                setShowDbPopover(false); setDbConnected(false);
                                                if (user) await supabase.from("db_connections").update({ is_active: false }).eq("user_id", user.id);
                                                setShowConnectModal(true);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Database className="w-3.5 h-3.5" /> Disconnect &amp; Reconnect
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-5 bg-border/60" />
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center relative text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#7C6FFF" }} />
                        </button>
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                            >
                                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        )}
                        {/* Avatar */}
                        <div className="relative group">
                            <button
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white hover:scale-105 transition-transform"
                                style={{ background: "linear-gradient(135deg,#7C6FFF,#00C9B1)" }}
                            >
                                {user?.user_metadata?.full_name
                                    ? user.user_metadata.full_name[0].toUpperCase()
                                    : user?.email ? user.email[0].toUpperCase() : "DT"}
                            </button>
                            <div
                                className="absolute top-full right-0 mt-2 hidden group-hover:flex flex-col w-36 py-1.5 rounded-xl z-50 animate-fadein"
                                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border-strong)", backdropFilter: "blur(16px)", boxShadow: "0 10px 40px var(--shadow-color)" }}
                            >
                                <a href="/profile" className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">Profile</a>
                                <div className="h-px w-full my-1 bg-border/60" />
                                <button onClick={signOut} className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">Sign out</button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Chat window — always visible ── */}
                <div className="flex-1 overflow-hidden">
                    <ChatWindow dbConnected={dbConnected} />
                </div>
            </div>

            {/* ── Schema drawer (right side, overlays chat) ── */}
            <SchemaDrawer
                dbConnected={dbConnected}
                open={schemaOpen}
                onClose={() => setSchemaOpen(false)}
            />

            {showConnectModal && (
                <ConnectDbModal
                    onClose={() => setShowConnectModal(false)}
                    onConnected={() => setDbConnected(true)}
                />
            )}
        </div>
    );
}

export default function ChatPage() {
    return (
        <ChatProvider>
            <Suspense fallback={null}>
                <ChatLayout />
            </Suspense>
        </ChatProvider>
    );
}
