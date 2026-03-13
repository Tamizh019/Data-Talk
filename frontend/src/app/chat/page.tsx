"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatWindow from "@/components/ChatWindow";
import ConnectDbModal from "@/components/ConnectDbModal";
import { ChatProvider, useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { connectDatabase } from "@/lib/api";

function ChatLayout() {
    const { activeConversation } = useChat();
    const { user, signOut } = useAuth();
    const supabase = useRef(createClient()).current;

    const [showConnectModal, setShowConnectModal] = useState(false);
    const [dbConnected, setDbConnected] = useState(false);
    const [showDbPopover, setShowDbPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // ── Auto Reconnect logic ──
    useEffect(() => {
        if (!user) return;

        const autoReconnect = async () => {
            try {
                const { data, error } = await supabase
                    .from("db_connections")
                    .select("connection_uri")
                    .eq("user_id", user.id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (data?.connection_uri) {
                    await connectDatabase(data.connection_uri);
                    setDbConnected(true);
                    console.log("[Auto-Reconnect] Connected successfully");
                }
            } catch (err) {
                console.error("[Auto-Reconnect] Failed:", err);
            }
        };

        autoReconnect();
    }, [user, supabase]);

    // Close popover on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setShowDbPopover(false);
            }
        };
        if (showDbPopover) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showDbPopover]);

    const handleDbButtonClick = () => {
        if (dbConnected) {
            setShowDbPopover((prev) => !prev);
        } else {
            setShowConnectModal(true);
        }
    };

    const handleDisconnectAndReconnect = async () => {
        setShowDbPopover(false);
        setDbConnected(false);
        
        // Deactivate in Supabase
        if (user) {
            await supabase
                .from("db_connections")
                .update({ is_active: false })
                .eq("user_id", user.id);
        }

        setShowConnectModal(true);
    };

    return (
        <div className="flex h-screen overflow-hidden relative" style={{ background: "#07070D" }}>
            {/* ── Background: Dot Grid ── */}
            <div className="fixed inset-0 dot-grid opacity-30 pointer-events-none z-0" />
            {/* ── Background: Bloom ── */}
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bloom-bg opacity-40 pointer-events-none z-0"
            />

            {/* ── Sidebar ── */}
            <Sidebar dbConnected={dbConnected} />

            {/* ── Main Layout (Header + Content) ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* ── Top Bar / Header ── */}
                <header className="h-14 glass-panel border-b border-white/5 flex items-center justify-between px-6 z-50 shrink-0">
                    {/* Left: Logo + Title */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 shrink-0"
                            style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)", boxShadow: "0 0 10px rgba(124,111,255,0.4)" }}
                        >
                            <svg className="w-[14px] h-[14px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                        </div>
                        <span
                            className="font-semibold text-[14px] tracking-tight"
                            style={{ color: "rgba(255,255,255,0.85)" }}
                        >
                            {activeConversation?.title || "Data-Talk AI"}
                        </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {/* ── DB Button (context-aware) ── */}
                        <div className="relative" ref={popoverRef}>
                            <button
                                onClick={handleDbButtonClick}
                                className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all active:scale-[0.97]"
                                style={{
                                    background: dbConnected
                                        ? "rgba(16,185,129,0.12)"
                                        : "rgba(255,255,255,0.05)",
                                    border: dbConnected
                                        ? "1px solid rgba(16,185,129,0.35)"
                                        : "1px solid rgba(255,255,255,0.15)",
                                }}
                            >
                                {/* Pulsing dot */}
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{
                                        background: dbConnected ? "#34d399" : "#f87171",
                                        boxShadow: dbConnected ? "0 0 6px #34d399" : "0 0 6px #f87171",
                                        animation: "pulse 2s infinite",
                                    }}
                                />
                                {dbConnected ? "Connected" : "Connect Database"}
                            </button>

                            {/* ── Disconnect Popover ── */}
                            {showDbPopover && dbConnected && (
                                <div
                                    className="absolute top-full right-0 mt-2 w-[230px] rounded-xl overflow-hidden shadow-2xl z-[100] animate-fadein"
                                    style={{
                                        background: "rgba(13,13,22,0.97)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        backdropFilter: "blur(24px)",
                                    }}
                                >
                                    <div className="px-4 pt-3 pb-2 border-b border-white/5">
                                        <p className="text-[11px] font-bold text-white/80">Database Connected</p>
                                        <p className="text-[10px] text-white/40 mt-0.5">PostgreSQL is currently active. What would you like to do?</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => setShowDbPopover(false)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 5px #34d399" }} />
                                            Keep Connected
                                        </button>
                                        <button
                                            onClick={handleDisconnectAndReconnect}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Disconnect &amp; Reconnect
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-5 opacity-10" style={{ background: "white" }} />

                        {/* Share */}
                        <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "white"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                        </button>

                        {/* Notification */}
                        <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center relative transition-colors"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "white"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            <span
                                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border border-[#07070D]"
                                style={{ background: "#7C6FFF" }}
                            />
                        </button>

                        {/* Avatar + Sign out */}
                        <div className="relative group">
                            <button
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white hover:scale-105 transition-transform border border-white/15 overflow-hidden"
                                style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                                title={user?.email ?? "Account"}
                            >
                                {user?.user_metadata?.full_name
                                    ? user.user_metadata.full_name.charAt(0).toUpperCase()
                                    : user?.email
                                        ? user.email.charAt(0).toUpperCase()
                                        : "DT"}
                            </button>
                            {/* Dropdown Menu */}
                            <div
                                className="absolute top-full right-0 mt-2 hidden group-hover:flex flex-col w-36 py-1.5 rounded-xl z-50 animate-fadein"
                                style={{
                                    background: "rgba(13,13,22,0.97)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    backdropFilter: "blur(16px)",
                                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                                }}
                            >
                                <a
                                    href="/profile"
                                    className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Profile
                                </a>
                                <div className="h-px w-full my-1 bg-white/5" />
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* ── Chat Window ── */}
                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        <ChatWindow />
                    </main>

                    {/* ── Right Sidebar ── */}
                    <RightSidebar dbConnected={dbConnected} />
                </div>
            </div>

            {/* ── Connect DB Modal ── */}
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
