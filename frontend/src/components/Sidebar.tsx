"use client";

/*
 * Sidebar — Claude-style
 * - Shows conversations directly (Recents section with scrollable list)
 * - Tools section: Analytics, Schema (drawer), Reports
 * - Per-chat "..." menu with Rename + Delete
 * - Inline rename via double-click or menu
 * - Search to filter conversations
 */

import { useState, useEffect, useRef } from "react";
import {
    Plus, Search, BarChart2, FileText, Database,
    MessageSquare, Trash2, Pencil, MoreHorizontal,
    Sun, Moon, Settings, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";

export type SidebarView = "conversations" | "schema" | "analytics" | "reports";

interface SidebarProps {
    onSchemaToggle?: () => void;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ onSchemaToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
    const { conversations, activeId, setActiveChat, createNewChat, deleteChat, renameChat } = useChat();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState("");

    // Per-row context menu state
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Rename state
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // Close context menu on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setMenuOpenId(null);
        };
        if (menuOpenId) document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [menuOpenId]);

    // Focus rename input when activated
    useEffect(() => {
        if (renamingId) renameInputRef.current?.focus();
    }, [renamingId]);

    const startRename = (id: string, currentTitle: string) => {
        setMenuOpenId(null);
        setRenamingId(id);
        setRenameValue(currentTitle);
    };

    const commitRename = () => {
        if (renamingId) renameChat(renamingId, renameValue);
        setRenamingId(null);
    };

    const filteredConvs = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    const goToChat = () => {
        if (pathname !== "/chat") router.push("/chat");
    };

    const meta = user?.user_metadata || {};
    const displayName = meta.full_name || meta.name || (meta.first_name ? `${meta.first_name} ${meta.last_name || ""}`.trim() : null) || "Premium User";
    const initial = displayName !== "Premium User" ? displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "DT");

    return (
        <div
            className={cn(
                "flex flex-col h-full shrink-0 z-40 relative transition-all duration-300",
                // Mobile: fixed overlay that slides in from left
                "fixed md:relative top-0 left-0",
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}
            style={{
                width: "260px",
                background: "var(--glass-bg)",
                borderRight: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
            }}
        >
            {/* ── Brand ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 px-5 pt-5 pb-4 shrink-0">
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    {mounted ? (
                        <img 
                            src={theme === "dark" ? "/logo1.png" : "/logo.png"} 
                            alt="Data-Talk Logo" 
                            className="w-full h-full object-contain drop-shadow-md transition-opacity" 
                        />
                    ) : (
                        <div className="w-full h-full rounded-xl bg-foreground/10 animate-pulse" />
                    )}
                </div>
                <span className="font-bold text-[18px] tracking-tight text-foreground">
                    Data-Talk
                </span>
            </div>

            <div className="px-4 pb-3 shrink-0">
                <button
                    onClick={() => { createNewChat(); goToChat(); onMobileClose?.(); }}
                    className="group w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] bg-[#633BFE] hover:bg-[#5028E5] dark:bg-[#7C5DFE] dark:hover:bg-[#9175FF] text-white font-semibold text-[13px] shadow-[0_4px_12px_rgba(99,59,254,0.25)] dark:shadow-[0_4px_12px_rgba(124,93,254,0.25)]"
                >
                    <Plus className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-90" />
                    New Analysis
                </button>
            </div>

            {/* ── Search ──────────────────────────────────────────────── */}
            <div className="px-4 pb-3 shrink-0">
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "var(--glass-bg-hover)", border: "1px solid var(--glass-border)" }}
                >
                    <Search className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search analyses..."
                        className="flex-1 bg-transparent text-[12px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tools ───────────────────────────────────────────────── */}
            <div className="px-4 pb-2 shrink-0">
                <p className="text-[9px] font-extrabold text-muted-foreground/40 uppercase tracking-[0.2em] px-1 mb-2">
                    Tools
                </p>
                <nav className="space-y-0.5">
                    {/* Analytics */}
                    <button
                        onClick={() => router.push("/analytics")}
                        className={cn(
                            "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left transition-all group",
                            pathname === "/analytics"
                                ? "text-foreground bg-foreground/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                        )}
                    >
                        <BarChart2 className="w-4 h-4 shrink-0" style={{ color: pathname === "/analytics" ? "#00C9B1" : undefined }} />
                        <span className="text-[12px] font-semibold">Analytics</span>
                    </button>

                    {/* Schema — drawer toggle */}
                    <button
                        onClick={() => { goToChat(); onSchemaToggle?.(); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left transition-all text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    >
                        <Database className="w-4 h-4 shrink-0" style={{ color: "#7C6FFF" }} />
                        <span className="text-[12px] font-semibold">Schema</span>
                    </button>

                    {/* Reports */}
                    <button
                        onClick={() => router.push("/reports")}
                        className={cn(
                            "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left transition-all group",
                            pathname === "/reports"
                                ? "text-foreground bg-foreground/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                        )}
                    >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="text-[12px] font-semibold">Reports</span>
                    </button>
                </nav>
            </div>

            {/* ── Recents ─────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-h-0 px-4 pb-2">
                <p className="text-[9px] font-extrabold text-muted-foreground/40 uppercase tracking-[0.2em] px-1 mb-2 shrink-0">
                    Recents
                </p>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5">
                    {filteredConvs.length === 0 ? (
                        <div className="flex flex-col items-center py-6 gap-2">
                            <MessageSquare className="w-6 h-6 text-muted-foreground/20" />
                            <p className="text-[11px] text-muted-foreground/40 text-center">
                                {search ? "No matches found" : "No past analyses"}
                            </p>
                        </div>
                    ) : (
                        filteredConvs.map(item => {
                            const isActive = activeId === item.id;
                            const isRenaming = renamingId === item.id;
                            const isMenuOpen = menuOpenId === item.id;

                            return (
                                <div key={item.id} className="relative group/row">
                                    <div
                                        onClick={() => { if (!isRenaming) { setActiveChat(item.id); goToChat(); onMobileClose?.(); } }}
                                        className={cn(
                                            "flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-all cursor-pointer select-none border-l-2",
                                            isActive
                                                ? "text-foreground border-[#7C6FFF] ml-[2px]"
                                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-foreground/5 ml-[2px]"
                                        )}
                                        style={isActive ? {
                                            background: "rgba(124,111,255,0.08)",
                                        } : undefined}
                                    >

                                        {/* Rename input OR title */}
                                        {isRenaming ? (
                                            <input
                                                ref={renameInputRef}
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onBlur={commitRename}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") commitRename();
                                                    if (e.key === "Escape") setRenamingId(null);
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                className="flex-1 bg-transparent text-[12px] font-medium text-foreground outline-none border-b border-[#7C6FFF]/60 pb-0.5"
                                            />
                                        ) : (
                                            <span className="flex-1 text-[12px] font-medium truncate">{item.title}</span>
                                        )}

                                        {/* Confirm rename */}
                                        {isRenaming && (
                                            <button
                                                onClick={e => { e.stopPropagation(); commitRename(); }}
                                                className="shrink-0 p-0.5 rounded text-[#7C6FFF]"
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                        )}

                                        {/* "..." menu trigger — shows on hover or when active */}
                                        {!isRenaming && (
                                            <button
                                                onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : item.id); }}
                                                className={cn(
                                                    "shrink-0 p-1 rounded-md transition-all hover:bg-foreground/10",
                                                    isMenuOpen
                                                        ? "opacity-100 text-foreground"
                                                        : "opacity-0 group-hover/row:opacity-100 text-muted-foreground"
                                                )}
                                            >
                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Context menu dropdown */}
                                    {isMenuOpen && (
                                        <div
                                            ref={menuRef}
                                            className="absolute left-0 right-0 top-full mt-1 z-[200] rounded-xl overflow-hidden shadow-2xl animate-fadein"
                                            style={{
                                                background: "var(--glass-bg)",
                                                border: "1px solid var(--glass-border-strong)",
                                                backdropFilter: "blur(24px)",
                                            }}
                                        >
                                            <button
                                                onClick={e => { e.stopPropagation(); startRename(item.id, item.title); }}
                                                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors text-left"
                                            >
                                                <Pencil className="w-3.5 h-3.5 text-muted-foreground/60" />
                                                Rename
                                            </button>
                                            <div style={{ height: "1px", background: "var(--glass-border)" }} />
                                            <button
                                                onClick={e => { e.stopPropagation(); setMenuOpenId(null); deleteChat(item.id); }}
                                                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── User Footer ──────────────────────────────────────────── */}
            <div
                className="px-4 py-3 shrink-0"
                style={{ borderTop: "1px solid var(--glass-border)" }}
            >
                <div
                    className="flex items-center gap-2.5 p-2.5 rounded-xl transition-colors hover:bg-foreground/5 cursor-pointer"
                >
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[12px] shrink-0"
                        style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                    >
                        {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">
                            {displayName}
                        </p>
                        <p className="text-[9px] text-muted-foreground/50 truncate">
                            {user?.email || "Workspace Admin"}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {mounted && (
                            <button
                                onClick={e => { e.stopPropagation(); setTheme(theme === "dark" ? "light" : "dark"); }}
                                className="p-1.5 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                                title="Toggle theme"
                            >
                                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                            </button>
                        )}
                        <a href="/profile">
                            <button className="p-1.5 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
                                <Settings className="w-3.5 h-3.5" />
                            </button>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
