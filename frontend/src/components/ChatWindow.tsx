"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Mic, Paperclip, Zap, CheckCircle2 } from "lucide-react";
import { streamChat, type ChatMessage, type PlotlyConfig } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import SQLDisplay from "./SQLDisplay";
import ChartRenderer from "./ChartRenderer";
import MarkdownRenderer from "./MarkdownRenderer";
import { useChat } from "@/lib/chat-context";


export default function ChatWindow() {
    const { activeId, activeConversation, updateMessages } = useChat();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const messages = activeConversation?.messages || [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading || !activeId) return;

        const userMsg: ChatMessage = { role: "user", content: text };
        const asstMsg: ChatMessage = { role: "assistant", isStreaming: true };

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
            onVisualization: (config) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, plotlyConfig: config } : m)),
            onExplanation: (text) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, content: text } : m)),
            onCached: (data: { sql?: string; plotly_config?: PlotlyConfig; explanation?: string }) =>
                updateMessages(activeId, (p) => p.map((m, i) =>
                    i === p.length - 1 ? { ...m, sql: data.sql, plotlyConfig: data.plotly_config, content: data.explanation, isCached: true } : m
                )),
            onError: (message) =>
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, content: `⚠️ ${message}`, error: message } : m)),
            onDone: () => {
                updateMessages(activeId, (p) => p.map((m, i) => i === p.length - 1 ? { ...m, isStreaming: false } : m));
                setIsLoading(false);
            },
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* ── Messages ──────────────────────────────────────────── */}
            <div className="flex-1 px-6 py-6 overflow-y-auto scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-10">
                    {messages.map((msg, i) =>
                        msg.role === "user" ? (
                            // ── User bubble ──────────────────────────────────
                            <div key={i} className="flex justify-end mb-4">
                                <div className="max-w-xl rounded-2xl bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 px-5 py-3.5 text-[15px] leading-relaxed shadow-sm">
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            // ── Assistant message ─────────────────────────────
                            <div key={i} className="flex gap-5 items-start mb-6">
                                {/* Avatar */}
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
                                    <span className="text-zinc-100 font-bold text-[13px] tracking-tighter">Z</span>
                                </div>

                                <div className="flex-1 min-w-0 space-y-4 pt-1">
                                    {/* Status badges */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[12px] font-semibold text-zinc-300 tracking-wide">
                                            Data-Talk AI
                                        </span>
                                        {msg.sql && !msg.isStreaming && (
                                            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800 bg-zinc-900/50 gap-1.5 px-2 py-0.5 rounded-md">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                Query Executed
                                            </Badge>
                                        )}
                                        {msg.isCached && (
                                            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800 bg-zinc-900/50 px-2 py-0.5 rounded-md gap-1.5">
                                                <Zap className="w-3 h-3 text-amber-500" />
                                                Cached
                                            </Badge>
                                        )}
                                        {msg.rowCount !== undefined && (
                                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800 bg-transparent px-2 py-0.5 rounded-md">
                                                {msg.rowCount} rows
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Loading dots */}
                                    {msg.isStreaming && !msg.sql && !msg.content && (
                                        <div className="flex gap-1.5 items-center h-6 mt-1">
                                            {[0, 1, 2].map((i) => (
                                                <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                    )}

                                    {/* SQL block */}
                                    {msg.sql && <SQLDisplay sql={msg.sql} attempts={msg.attempts} />}

                                    {/* Plotly chart */}
                                    {msg.plotlyConfig && <ChartRenderer config={msg.plotlyConfig} />}

                                    {/* Explanation text */}
                                    {msg.content && !msg.isStreaming && (
                                        <div className="text-[15px] leading-relaxed text-zinc-300 prose prose-invert max-w-none">
                                            <MarkdownRenderer content={msg.content} />
                                        </div>
                                    )}

                                    {/* Streaming text cursor */}
                                    {msg.isStreaming && msg.content && (
                                        <p className="text-[15px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                            {msg.content}
                                            <span className="inline-block w-2 h-4 ml-1 bg-zinc-500 align-middle animate-pulse rounded-sm" />
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
                <div ref={bottomRef} className="h-6 w-full" />
            </div>

            {/* ── Composer ──────────────────────────────────────────── */}
            <div className="shrink-0 px-6 pb-8 pt-2">
                <div className="max-w-3xl mx-auto">
                    <div className="relative flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-[#121214] p-3 shadow-sm transition-all duration-300 focus-within:border-zinc-700 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.02)] focus-within:bg-[#18181b] ring-1 ring-transparent focus-within:ring-zinc-800">
                        <textarea
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Ask Data-Talk anything..."
                            disabled={isLoading}
                            rows={1}
                            className="w-full min-h-[24px] max-h-[200px] bg-transparent outline-none border-none text-[15px] text-zinc-100 placeholder:text-zinc-500 px-2 py-1 placeholder:font-normal font-medium resize-none leading-relaxed"
                            autoComplete="off"
                        />
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1">
                                <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-zinc-800/80">
                                    <Paperclip className="w-[18px] h-[18px]" />
                                </button>
                                <button className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-zinc-800/80">
                                    <Mic className="w-[18px] h-[18px]" />
                                </button>
                            </div>
                            <Button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className="rounded-xl bg-white hover:bg-zinc-200 text-black h-9 w-9 shrink-0 transition-all font-semibold disabled:bg-zinc-800 disabled:text-zinc-500 shadow-sm"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-center items-center gap-5 pt-4 text-[12px] font-medium text-zinc-500">
                        <span className="hover:text-zinc-300 cursor-pointer transition-colors flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Insights</span>
                        <span className="hover:text-zinc-300 cursor-pointer transition-colors">Documentation</span>
                        <span className="hover:text-zinc-300 cursor-pointer transition-colors">Recent Queries</span>
                    </div>
                </div>
            </div>
        </div >
    );
}
