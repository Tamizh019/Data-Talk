"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, Paperclip, Zap, CheckCircle2, ChevronDown, ChevronUp, BrainCircuit } from "lucide-react";
import { streamChat, type ChatMessage, type EChartsConfig } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import SQLDisplay from "./SQLDisplay";
import DashboardPanel from "./DashboardPanel";
import MarkdownRenderer from "./MarkdownRenderer";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";

export default function ChatWindow() {
    const { activeId, activeConversation, updateMessages } = useChat();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [collapsedThinking, setCollapsedThinking] = useState<Record<number, boolean>>({});
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messages = activeConversation?.messages || [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeId) return;
        
        setIsUploading(true);
        // Show optimistic upload message
        const userMsg: ChatMessage = { role: "user", content: `*(Uploading ${file.name}...)*`, createdAt: Date.now() };
        updateMessages(activeId, (p) => [...p, userMsg]);
        
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const res = await fetch("http://localhost:8000/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            
            if (res.ok) {
                const successMsg: ChatMessage = { role: "assistant", content: `✅ **${file.name}** has been successfully uploaded and indexed! You can now ask questions about its contents.`, createdAt: Date.now() };
                updateMessages(activeId, (p) => [...p, successMsg]);
            } else {
                throw new Error(data.detail || "Upload failed");
            }
        } catch (error: any) {
            const errorMsg: ChatMessage = { role: "assistant", content: `❌ Error uploading document: ${error.message}`, error: error.message, createdAt: Date.now() };
            updateMessages(activeId, (p) => [...p, errorMsg]);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading || !activeId) return;

        const userMsg: ChatMessage = { role: "user", content: text, createdAt: Date.now() };
        const asstMsg: ChatMessage = { role: "assistant", isStreaming: true, createdAt: Date.now(), steps: [{ label: "Connecting to agent...", status: "pending" }] };

        updateMessages(activeId, (p) => [...p, userMsg, asstMsg]);
        setInput("");
        setIsLoading(true);

        const history = messages
            .filter((m) => m.content)
            .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [m.content ?? ""] }));

        await streamChat(activeId, text, history, {
            onSql: (sql) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, sql } : m)),
            onResult: (rows, columns, rowCount, attempts) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, rowCount, attempts } : m)),
            onVisualization: (charts) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, charts } : m)),
            onExplanation: (text) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, content: text } : m)),
            onCached: (data: { sql?: string; charts?: EChartsConfig[]; explanation?: string }) =>
                updateMessages(activeId, (p) => p.map((m, i) =>
                    i === p.length - 1 ? { ...m, sql: data.sql, charts: data.charts, content: data.explanation, isCached: true } : m
                )),
            onError: (message) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, content: undefined, error: message } : m)),
            onStep: (label) =>
                updateMessages(activeId, (p) => p.map((m, i) => {
                    if (i === p.length - 1) {
                        const currentSteps = m.steps || [];
                        const newSteps: { label: string; status: "pending" | "done" }[] = currentSteps.map(s => ({ ...s, status: "done" }));
                        newSteps.push({ label, status: "pending" });
                        return { ...m, steps: newSteps };
                    }
                    return m;
                })),
            onDone: () => {
                updateMessages(activeId, (p) => p.map((m, i) => {
                    if (i === p.length - 1) {
                        const newSteps = (m.steps || []).map(s => ({ ...s, status: "done" as const }));
                        return { ...m, isStreaming: false, steps: newSteps };
                    }
                    return m;
                }));
                setIsLoading(false);
            },
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* ── Messages ──────────────────────────────────────────── */}
            <div className="flex-1 px-6 py-8 overflow-y-auto scroll-smooth space-y-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {messages.map((msg, i) =>
                        msg.role === "user" ? (
                            // ── User bubble ──────────────────────────────────
                            <div key={i} className="flex flex-col items-end gap-1 animate-fadein">
                                <div
                                    className="max-w-xl px-5 py-3.5 text-[14px] leading-relaxed text-white shadow-md shadow-indigo-900/20"
                                    style={{
                                        background: "#4f46e5",
                                        borderRadius: "18px 18px 4px 18px",
                                    }}
                                >
                                    {msg.content}
                                </div>
                                <div className="flex items-center gap-2 mt-1 mr-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>You</span>
                                    {msg.createdAt && (
                                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // ── Assistant message ─────────────────────────────
                            <div key={i} className="flex gap-4 items-start animate-fadein">
                                {/* Avatar */}
                                <div
                                    className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                                    style={{ background: "rgba(124,111,255,0.15)", border: "1px solid rgba(124,111,255,0.2)" }}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 20 20" style={{ color: "#7C6FFF" }}>
                                        <path fill="currentColor" d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 014.75-2.906z" />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0 space-y-3 pt-0.5">
                                    {/* Header row */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "#7C6FFF" }}>
                                            Analyst AI
                                        </span>
                                        {msg.createdAt && (
                                            <span className="text-[10px] opacity-40 ml-1 text-white pr-2">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                        {msg.sql && !msg.isStreaming && (
                                            <span
                                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                                                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}
                                            >
                                                <CheckCircle2 className="w-3 h-3" />
                                                Query Executed
                                            </span>
                                        )}
                                        {msg.isCached && (
                                            <span
                                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                                                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}
                                            >
                                                <Zap className="w-3 h-3" />
                                                Cached
                                            </span>
                                        )}
                                        {msg.rowCount !== undefined && (
                                            <span
                                                className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                                            >
                                                {msg.rowCount} rows
                                            </span>
                                        )}
                                    </div>

                                    {/* ── Thinking / Progress Panel (always shown) ── */}
                                    {msg.steps && msg.steps.length > 0 && (() => {
                                        const isThinking = !!msg.isStreaming;
                                        const isCollapsed = !!collapsedThinking[i];
                                        const lastStep = msg.steps![msg.steps!.length - 1];
                                        return (
                                            <div
                                                className="rounded-xl overflow-hidden border transition-all duration-300"
                                                style={{
                                                    background: isThinking ? "rgba(124,111,255,0.06)" : "rgba(255,255,255,0.03)",
                                                    borderColor: isThinking ? "rgba(124,111,255,0.22)" : "rgba(255,255,255,0.06)",
                                                }}
                                            >
                                                <button
                                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left group"
                                                    onClick={() => !isThinking && setCollapsedThinking(p => ({ ...p, [i]: !p[i] }))}
                                                    disabled={isThinking}
                                                >
                                                    {isThinking ? (
                                                        <span className="relative flex shrink-0">
                                                            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-60" style={{ background: "#7C6FFF" }} />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#7C6FFF" }} />
                                                        </span>
                                                    ) : (
                                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#34d399" }} />
                                                    )}
                                                    <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: isThinking ? "rgba(124,111,255,0.95)" : "rgba(255,255,255,0.45)" }}>
                                                        {isThinking ? lastStep.label : `Thought for ${msg.steps!.length} steps`}
                                                    </span>
                                                    {!isThinking && (
                                                        isCollapsed
                                                            ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-white/20 group-hover:text-white/50 transition-colors" />
                                                            : <ChevronUp className="w-3.5 h-3.5 shrink-0 text-white/20 group-hover:text-white/50 transition-colors" />
                                                    )}
                                                </button>
                                                {!isCollapsed && (
                                                    <div className="px-4 pb-3 border-t" style={{ borderColor: isThinking ? "rgba(124,111,255,0.1)" : "rgba(255,255,255,0.04)" }}>
                                                        <div className="pt-2.5 space-y-1.5">
                                                            {msg.steps!.map((step, idx) => (
                                                                <div key={idx} className="flex items-start gap-2.5 animate-fadein">
                                                                    {step.status === "done" ? (
                                                                        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#34d399" }} />
                                                                    ) : (
                                                                        <svg className="w-3 h-3 mt-0.5 shrink-0 animate-spin" style={{ color: "#7C6FFF" }} fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                        </svg>
                                                                    )}
                                                                    <span className="text-[11px] leading-loose" style={{ color: step.status === "done" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)" }}>
                                                                        {step.label}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Message text — only for chat/text-only responses */}
                                    {(msg.content || msg.isStreaming) && !msg.sql && !(msg.charts && msg.charts.length > 0) && (
                                        <div className="pt-1 pb-2">
                                            {/* Streaming text */}
                                            {msg.isStreaming && msg.content && (
                                                <p className="text-[14px] leading-relaxed text-white/80 whitespace-pre-wrap">
                                                    {msg.content}
                                                    <span className="inline-block w-2 h-4 ml-1 align-middle animate-pulse rounded-sm" style={{ background: "#7C6FFF" }} />
                                                </p>
                                            )}

                                            {/* Final text */}
                                            {msg.error ? (
                                                <div className="mt-2 w-full max-w-2xl bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 shadow-lg shadow-red-500/5 animate-fadein">
                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <h4 className="text-[13px] font-semibold text-red-200">Execution Error</h4>
                                                        <p className="text-[12px] text-red-200/70 leading-relaxed font-medium">
                                                            We encountered a technical issue while generating your response. Please try rephrasing your request.
                                                        </p>
                                                        <div className="mt-2 pt-2 border-t border-red-500/10">
                                                            <div className="text-[11px] font-mono text-red-300/60 break-all bg-red-950/30 p-2.5 rounded-lg border border-red-500/10 max-h-32 overflow-y-auto">
                                                                {msg.error}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : msg.content && !msg.isStreaming && (
                                                <div className="text-[14px] leading-relaxed text-white/80 prose prose-invert max-w-none">
                                                    <MarkdownRenderer content={msg.content} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SQL block */}
                                    {msg.sql && <SQLDisplay sql={msg.sql} attempts={msg.attempts} />}

                                    {/* ECharts Dashboard */}
                                    {msg.charts && msg.charts.length > 0 && <DashboardPanel charts={msg.charts} />}

                                    {/* Explanation after SQL/chart */}
                                    {msg.content && !msg.isStreaming && (msg.sql || (msg.charts && msg.charts.length > 0)) && (
                                        <div className="text-[14px] leading-relaxed text-white/70 prose prose-invert max-w-none px-1">
                                            <MarkdownRenderer content={msg.content} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
                <div ref={bottomRef} className="h-6 w-full" />
            </div>

            {/* ── Composer ──────────────────────────────────────────── */}
            <div className="shrink-0 px-6 pb-8 pt-2 flex flex-col items-center gap-4">
                {/* Quick action chips */}
                <div className="flex gap-3">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-white/40 transition-all hover:text-white hover:-translate-y-0.5"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,111,255,0.4)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,111,255,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.05)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                        }}
                    >
                        Visualize
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-white/40 transition-all hover:text-white hover:-translate-y-0.5"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,111,255,0.4)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,111,255,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.05)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                        }}
                    >
                        Query
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-white/40 transition-all hover:text-white hover:-translate-y-0.5"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,111,255,0.4)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,111,255,0.1)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.05)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                        }}
                    >
                        Summarize
                    </button>
                </div>

                {/* Input box */}
                <div className="w-full max-w-4xl relative group">
                    {/* Glow on focus */}
                    <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-2xl pointer-events-none"
                        style={{ background: "rgba(124,111,255,0.15)" }}
                    />
                    <div
                        className="relative flex items-center rounded-2xl p-2 shadow-2xl transition-all"
                        style={{
                            background: "rgba(13,13,22,0.7)",
                            backdropFilter: "blur(20px)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
                        }}
                    >
                        {/* Attach icon */}
                        <button 
                            className="p-2.5 transition-colors relative" 
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "#00C9B1"}
                            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isLoading}
                        >
                            <Paperclip className={`w-4 h-4 ${isUploading ? 'animate-bounce text-[#00C9B1]' : ''}`} />
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".txt,.csv,.pdf,.md,.json" 
                                onChange={handleFileUpload}
                            />
                        </button>

                        {/* Textarea */}
                        <textarea
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Ask anything about your data..."
                            disabled={isLoading}
                            rows={1}
                            className="flex-1 bg-transparent outline-none border-none text-[14px] py-2.5 resize-none leading-relaxed min-h-[24px] max-h-[200px]"
                            style={{
                                color: "white",
                                caretColor: "#7C6FFF",
                            }}
                            autoComplete="off"
                        />

                        {/* Right actions */}
                        <div className="flex items-center gap-2 pr-1">
                            <button className="p-2.5 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}
                                onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "#7C6FFF"}
                                onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"}
                            >
                                <Mic className="w-4 h-4" />
                            </button>

                            {/* Send button */}
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                                style={{
                                    background: input.trim() && !isLoading
                                        ? "linear-gradient(135deg, #7C6FFF, #00C9B1)"
                                        : "rgba(255,255,255,0.08)",
                                }}
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer meta */}
                <span className="text-[10px] text-white/20 font-medium">
                    Powered by Gemini 3.1 Pro
                </span>
            </div>
        </div>
    );
}
