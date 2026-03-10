"use client";

import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { ChatProvider, useChat } from "@/lib/chat-context";

function ChatLayout() {
    const { activeConversation } = useChat();

    return (
        <div className="flex h-screen bg-[#09090b] overflow-hidden">
            <Sidebar dbConnected={true} />
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* ── Top bar ───────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/40 bg-[#09090b] shrink-0">
                    <h1 className="text-[15px] font-semibold text-foreground/90">
                        {activeConversation?.title || "Data-Talk AI"}
                    </h1>
                    <div className="flex items-center gap-3">
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                        </button>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Chat ──────────────────────────────────────────── */}
                <ChatWindow />
            </main>
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
