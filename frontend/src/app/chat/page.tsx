"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import ConnectDbModal from "@/components/ConnectDbModal";
import { ChatProvider } from "@/lib/chat-context";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase";
import { connectDatabase } from "@/lib/api";
import { Share2, Bell, Sun, Moon, Database } from "lucide-react";

function ChatLayout() {
    const { activeConversation } = useChat();
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const supabase = useRef(createClient()).current;
    const [mounted, setMounted] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [dbConnected, setDbConnected] = useState(false);
    const [showDbPopover, setShowDbPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

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

            {/* ── Sidebar ── */}
            <Sidebar dbConnected={dbConnected} />

            {/* ── Main content: full-width chat ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">

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
                    {/* Left */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#7C6FFF,#00C9B1)", boxShadow: "0 0 10px rgba(124,111,255,0.40)" }}
                        >
                            <svg className="w-[14px] h-[14px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                            </svg>
                        </div>
                        <span className="font-semibold text-[14px] tracking-tight text-foreground/85">
                            {activeConversation?.title || "Data-Talk AI"}
                        </span>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2.5">
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

                {/* ── Full-width Chat (charts render inline) ── */}
                <div className="flex-1 overflow-hidden">
                    <ChatWindow dbConnected={dbConnected} />
                </div>
            </div>

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
            <ChatLayout />
        </ChatProvider>
    );
}
