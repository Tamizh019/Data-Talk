"use client";

import { useEffect, useRef, useState } from "react";
import { streamChat, clearSession, Source } from "@/lib/api";
import SourceCard from "./SourceCard";
import MarkdownRenderer from "./MarkdownRenderer";
import { v4 as uuidv4 } from "uuid";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    isStreaming?: boolean;
}

const WELCOME_MSG: Message = {
    id: "welcome",
    role: "assistant",
    content: "Hello! I'm your AI assistant. Upload a complex PDF (like a research paper or resume), then ask me anything about it. I'll read through it and cite my sources so you can verify my answers.",
};

export default function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => uuidv4());
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }, [input]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: Message = { id: uuidv4(), role: "user", content: text };
        const asstId = uuidv4();
        const asstMsg: Message = { id: asstId, role: "assistant", content: "", isStreaming: true };

        setMessages((p) => [...p, userMsg, asstMsg]);
        setInput("");
        setIsLoading(true);

        await streamChat(
            sessionId,
            text,
            (token) =>
                setMessages((p) =>
                    p.map((m) => (m.id === asstId ? { ...m, content: m.content + token } : m))
                ),
            (sources) =>
                setMessages((p) =>
                    p.map((m) => (m.id === asstId ? { ...m, sources } : m))
                ),
            () => {
                setMessages((p) =>
                    p.map((m) => (m.id === asstId ? { ...m, isStreaming: false } : m))
                );
                setIsLoading(false);
            },
            (error) => {
                setMessages((p) =>
                    p.map((m) =>
                        m.id === asstId
                            ? { ...m, content: `Error: ${error}`, isStreaming: false }
                            : m
                    )
                );
                setIsLoading(false);
            }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleClear = async () => {
        await clearSession(sessionId);
        setMessages([WELCOME_MSG]);
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b]">

            {/* ─── Message list ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="w-full max-w-3xl mx-auto space-y-10">
                    {messages.map((msg) =>
                        msg.role === "user" ? (
                            /* USER bubble */
                            <div key={msg.id} className="flex justify-end">
                                <div className="max-w-2xl rounded-3xl bg-[#eff6ff] text-slate-900 px-6 py-3.5 text-[15px] leading-relaxed shadow-sm">
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            /* ASSISTANT message — no background bubble, clean typography */
                            <div key={msg.id} className="flex gap-5 items-start">
                                {/* Avatar */}
                                <div className="shrink-0 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center mt-0.5 bg-gradient-to-b from-white/[0.08] to-transparent">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-90">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0 space-y-4 pt-1">
                                    <div className="text-[16px] leading-[1.7] text-[#e4e4e7] whitespace-pre-wrap font-normal">
                                        {msg.content === "" && msg.role === "assistant" ? (
                                            <div className="flex gap-1.5 items-center h-6">
                                                {[0, 1, 2].map((i) => (
                                                    <span
                                                        key={i}
                                                        className="w-1.5 h-1.5 rounded-full bg-indigo-500/80 animate-bounce"
                                                        style={{ animationDelay: `${i * 0.15}s` }}
                                                    />
                                                ))}
                                            </div>
                                        ) : msg.isStreaming ? (
                                            // Raw text during streaming — avoids half-parsed markdown flicker
                                            <div className="text-[16px] leading-[1.8] text-[#d4d4d8] whitespace-pre-wrap">
                                                {msg.content}
                                                <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 align-middle animate-[blink_1s_step-end_infinite] rounded-sm" />
                                            </div>
                                        ) : (
                                            // Fully rendered markdown once streaming completes
                                            <div className="prose-sm">
                                                <MarkdownRenderer content={msg.content} />
                                            </div>
                                        )}
                                    </div>
                                    {!msg.isStreaming && msg.sources && (
                                        <SourceCard sources={msg.sources} />
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    <div ref={bottomRef} className="h-4" />
                </div>
            </div>

            {/* ─── Composer ────────────────────────────────────── */}
            <div className="shrink-0 pt-4 pb-8 px-4 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent">
                <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
                    {/* Input Box */}
                    <div className="relative flex items-end gap-3 rounded-2xl bg-[#18181b] border border-white/[0.06] shadow-xl px-5 py-4 focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message your RAG assistant..."
                            rows={1}
                            disabled={isLoading}
                            className="flex-1 resize-none bg-transparent text-[16px] text-white/95 placeholder-white/30 truncate focus:outline-none focus:ring-0 leading-relaxed max-h-48 min-h-[26px] py-0.5"
                        />

                        <div className="flex items-center gap-2 shrink-0 pb-0.5">
                            {/* Clear button */}
                            {messages.length > 1 && (
                                <button
                                    onClick={handleClear}
                                    title="Clear chat"
                                    className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                                    </svg>
                                </button>
                            )}

                            {/* Send button */}
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                            >
                                {isLoading ? (
                                    <span className="w-4 h-4 border-2 border-black/80 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-[12px] text-[#71717a] font-medium pt-1">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
