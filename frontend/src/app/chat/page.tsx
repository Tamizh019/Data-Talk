"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import ConnectDbModal from "@/components/ConnectDbModal";
import { ChatProvider, useChat } from "@/lib/chat-context";

function ChatLayout() {
    const { activeConversation } = useChat();
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [dbConnected, setDbConnected] = useState(true); // default from .env

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

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
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
                        {/* DB Connection Status pill */}
                        <div
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
                            style={{
                                background: dbConnected ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                                borderColor: dbConnected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    background: dbConnected ? "#34d399" : "#f87171",
                                    boxShadow: dbConnected ? "0 0 6px #34d399" : "0 0 6px #f87171",
                                    animation: "pulse 2s infinite",
                                }}
                            />
                            <span
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: dbConnected ? "#34d399" : "#f87171" }}
                            >
                                {dbConnected ? "Postgres Connected" : "Not Connected"}
                            </span>
                        </div>

                        {/* ── Connect Database Button ── */}
                        <button
                            onClick={() => setShowConnectModal(true)}
                            className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.97]"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.15)",
                            }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            </svg>
                            Connect Database
                        </button>

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

                        {/* Avatar */}
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer hover:scale-105 transition-transform border border-white/15"
                            style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                        >
                            DT
                        </div>
                    </div>
                </header>

                {/* ── Chat Window ── */}
                <ChatWindow />
            </main>

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
