"use client";

import { useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import UploadZone from "@/components/UploadZone";
import { IngestResponse } from "@/lib/api";

interface KnowledgeDoc {
    name: string;
    chunks: number;
}

export default function ChatPage() {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleUploadSuccess = (result: IngestResponse) => {
        setDocs((prev) => [
            ...prev,
            { name: result.details.source, chunks: result.details.chunks },
        ]);
    };

    return (
        <div className="flex h-screen bg-[#09090b] text-[#fafafa] overflow-hidden">
            {/* ═══ LEFT SIDEBAR ═══════════════════════════════════════ */}
            <aside
                className={`${sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
                    } shrink-0 flex flex-col border-r border-[#27272a] bg-[#09090b] transition-all duration-300`}
            >
                {/* Brand — text only, no logo */}
                <div className="px-6 py-6 border-b border-[#27272a]">
                    <h2 className="text-[16px] font-bold tracking-tight text-white">RAG Chatbot</h2>
                    <p className="text-[12px] text-[#71717a] mt-1">LlamaIndex · Qdrant · Groq</p>
                </div>

                {/* Upload section */}
                <div className="px-5 py-6 border-b border-[#27272a]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a] mb-4">
                        Upload Document
                    </p>
                    <UploadZone onSuccess={handleUploadSuccess} />
                </div>

                {/* Knowledge Base */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a] mb-4">
                        Knowledge Base
                    </p>

                    {docs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#52525b]">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                </svg>
                            </div>
                            <p className="text-[13px] text-[#52525b]">No documents yet</p>
                            <p className="text-[11px] text-[#3f3f46]">Upload a PDF to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {docs.map((doc, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-xl px-4 py-3 bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400 shrink-0">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                    </svg>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] text-white/90 font-medium truncate">{doc.name}</p>
                                        <p className="text-[11px] text-[#71717a] mt-1">{doc.chunks} chunks</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[#27272a]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                        <span className="text-[12px] text-[#71717a]">Connected</span>
                    </div>
                </div>
            </aside>

            {/* ═══ MAIN CONTENT ════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
                {/* Top bar */}
                <header className="flex items-center justify-between h-16 px-6 border-b border-[#27272a] bg-[#09090b] shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen((v) => !v)}
                            className="p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#18181b] transition-colors"
                            title="Toggle sidebar"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                        <div className="h-5 w-px bg-[#27272a]" />
                        <h1 className="text-[15px] font-semibold text-white">New Chat</h1>
                    </div>

                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[12px] font-medium text-[#a1a1aa]">llama-3.3-70b</span>
                    </div>
                </header>

                {/* Chat area */}
                <main className="flex-1 overflow-hidden">
                    <ChatWindow />
                </main>
            </div>
        </div>
    );
}
