"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, MessageSquare, Database, Settings, User, Trash2, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";

interface SidebarProps {
    dbConnected?: boolean;
}

export default function Sidebar({ dbConnected = false }: SidebarProps) {
    const { conversations, activeId, setActiveChat, createNewChat, deleteChat } = useChat();

    return (
        <div
            className="flex flex-col h-full shrink-0 z-40 relative"
            style={{
                width: "260px",
                background: "rgba(13, 13, 22, 0.85)",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
            }}
        >
            {/* ── Brand ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-5">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 shrink-0"
                    style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)", boxShadow: "0 0 10px rgba(124,111,255,0.4)" }}
                >
                    <svg className="w-[16px] h-[16px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    </svg>
                </div>
                <span
                    className="font-bold text-[16px] tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(to right, #fff, #94a3b8)" }}
                >
                    Data-Talk
                </span>
            </div>



            {/* ── New Chat ──────────────────────────────────────────── */}
            <div className="px-4 pb-4">
                <button
                    onClick={createNewChat}
                    className="group relative w-full p-[1px] rounded-xl overflow-hidden transition-all"
                >
                    <div
                        className="absolute inset-0 rounded-xl opacity-50"
                        style={{ background: "linear-gradient(90deg, rgba(124,111,255,0.5), rgba(0,201,177,0.5))" }}
                    />
                    <div
                        className="relative flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 transition-colors"
                        style={{ background: "rgba(19,19,31,0.9)" }}
                    >
                        <span className="text-[#00C9B1] text-lg leading-none font-light">+</span>
                        <span className="text-sm font-medium text-white">New Chat</span>
                    </div>
                </button>
            </div>

            {/* ── Divider ───────────────────────────────────────────── */}
            <div className="mx-4 border-t border-white/5 mb-4" />

            {/* ── Recent Queries ────────────────────────────────────── */}
            <div className="px-3 flex-1 overflow-hidden flex flex-col">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 pb-2">
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
                                        ? "bg-[#7C6FFF]/10 border-[#7C6FFF] text-white"
                                        : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 hover:border-[#7C6FFF]/30"
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

            {/* ── User / Workspace ──────────────────────────────────── */}
            <div className="px-4 pb-5 mt-auto">
                <div className="border-t border-white/5 mb-4" />
                <div
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                    style={{
                        background: "rgba(13, 13, 22, 0.6)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        backdropFilter: "blur(10px)",
                    }}
                >
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[#7C6FFF] text-sm shrink-0"
                        style={{ background: "rgba(124,111,255,0.15)" }}
                    >
                        DT
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-white truncate">Data-Talk</p>
                        <p className="text-[10px] text-white/30">Workspace Admin</p>
                    </div>
                    <Settings className="w-4 h-4 text-white/30 hover:text-white/70 cursor-pointer transition-colors shrink-0" />
                </div>
            </div>
        </div>
    );
}
