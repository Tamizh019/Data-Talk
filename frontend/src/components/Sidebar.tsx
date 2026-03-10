"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MessageSquare, Database, Settings, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";


interface SidebarProps {
    dbConnected?: boolean;
}

export default function Sidebar({ dbConnected = false }: SidebarProps) {
    const { conversations, activeId, setActiveChat, createNewChat, deleteChat } = useChat();

    // Group conversations by date if we want later, for now just simple list
    return (
        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-[240px] shrink-0">
            {/* ── Brand ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shadow-sm">
                    <Database className="w-4 h-4 text-zinc-900" />
                </div>
                <span className="text-[16px] font-bold text-zinc-100 tracking-tight">Data-Talk</span>
            </div>

            {/* ── DB Status ─────────────────────────────────────────── */}
            <div className="px-4 pb-3">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] uppercase font-bold tracking-wider w-full justify-center py-1.5 rounded-lg",
                        dbConnected
                            ? "text-emerald-500 border-zinc-800 bg-zinc-900/50"
                            : "text-zinc-500 border-zinc-800 bg-zinc-900/30"
                    )}
                >
                    {dbConnected ? "● Postgres Connected" : "○ Not Connected"}
                </Badge>
            </div>

            {/* ── New Chat ──────────────────────────────────────────── */}
            <div className="px-4 pb-4">
                <Button
                    onClick={createNewChat}
                    className="w-full gap-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg h-9 shadow-sm transition-colors"
                >
                    <PlusCircle className="w-4 h-4" />
                    New Chat
                </Button>
            </div>

            <Separator className="bg-zinc-800/80 mx-4 w-auto" />

            <div className="px-3 pt-4">
                <p className="text-[11px] font-semibold text-zinc-500 px-3 pb-2">
                    Recent Queries
                </p>
                <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-0.5 px-1">
                        {conversations.map((item) => (
                            <div key={item.id} className={cn(
                                "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors group cursor-pointer",
                                activeId === item.id
                                    ? "bg-zinc-800 text-zinc-100"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                            )} onClick={() => setActiveChat(item.id)}>
                                <div className="flex items-center gap-3 w-full text-left text-[13px]">
                                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                    <span className="truncate flex-1">{item.title}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteChat(item.id); }}
                                    className={cn("p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 focus:opacity-100",
                                        activeId === item.id ? "opacity-100" : "group-hover:opacity-100"
                                    )}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* ── User ──────────────────────────────────────────────── */}
            <div className="mt-auto px-4 pb-5">
                <Separator className="bg-zinc-800/80 mb-4" />
                <div className="flex items-center gap-3 px-1">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-zinc-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-200 truncate">Workspace</p>
                        <p className="text-[11px] text-zinc-500 truncate">Admin Access</p>
                    </div>
                    <Settings className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors shrink-0" />
                </div>
            </div>
        </div>
    );
}
