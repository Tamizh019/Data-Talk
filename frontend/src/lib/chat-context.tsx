"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "./api";
import { createClient } from "./supabase";

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: number;
}

interface ChatContextType {
    conversations: Conversation[];
    activeId: string | null;
    activeConversation: Conversation | null;
    createNewChat: () => void;
    setActiveChat: (id: string) => void;
    deleteChat: (id: string) => void;
    renameChat: (id: string, newTitle: string) => void;
    updateMessages: (id: string, updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = "datatalk_history";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function buildWelcomeMessages(): ChatMessage[] {
    const defaultMsg: ChatMessage = {
        role: "assistant",
        content: "Hello! I'm **Data-Talk AI**. Connect your database, then ask me anything — I'll generate the SQL, run it, and visualize the results automatically.",
    };
    if (typeof window === "undefined") return [defaultMsg];
    
    try {
        const stored = localStorage.getItem("datatalk_suggestions");
        if (stored) {
            const sug = JSON.parse(stored);
            if (sug && sug.categories) {
                let prompt = `Hello! I'm **Data-Talk AI**. Your database is connected.\n\n${sug.greeting || "Here are some things you can ask me to get started:"}\n\nFollow-ups:\n`;
                sug.categories.forEach((cat: any) => {
                    cat.questions.forEach((q: string) => { prompt += `- ${q}\n`; });
                });
                return [{ role: "assistant", content: prompt }];
            }
        }
    } catch {}
    return [defaultMsg];
}

/**
 * Sync conversations to Supabase via backend API.
 * Fires-and-forgets — failures are silently logged so they never break the UI.
 */
async function syncToSupabase(conversations: Conversation[], token: string) {
    try {
        // Only sync the 20 most recent; strip heavy fields (rows/charts) to keep payload small
        const recent = conversations.slice(0, 20).map(c => ({
            id: c.id,
            title: c.title,
            updated_at: c.updatedAt,         // ← snake_case to match Pydantic model
            messages: c.messages.map(m => ({
                role: m.role,
                content: m.content,
                sql: m.sql,
                createdAt: m.createdAt,
                error: m.error,
                // deliberately omit: rows, charts, steps (too heavy for Supabase storage)
            })),
        }));
        await fetch(`${API_URL}/api/conversations/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ conversations: recent }),
        });
    } catch (e) {
        console.warn("[ChatContext] Supabase sync failed (non-critical):", e);
    }
}

async function loadFromSupabase(token: string): Promise<Conversation[]> {
    try {
        const res = await fetch(`${API_URL}/api/conversations`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.conversations || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            messages: c.messages || [],
            updatedAt: c.updated_at,
        }));
    } catch {
        return [];
    }
}

async function deleteFromSupabase(conversationId: string, token: string) {
    try {
        await fetch(`${API_URL}/api/conversations/${conversationId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
        });
    } catch {}
}


export function ChatProvider({ children }: { children: ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const supabase = useRef(createClient()).current;
    // Store the session token so sync functions can use it
    const sessionTokenRef = useRef<string | null>(null);
    // Debounce timer ref for syncing
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Load conversations (Supabase first, localStorage fallback) ──────────
    useEffect(() => {
        const loadConversations = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            sessionTokenRef.current = session?.access_token ?? null;

            // Try Supabase first if logged in
            if (session?.access_token) {
                const remote = await loadFromSupabase(session.access_token);
                if (remote.length > 0) {
                    setConversations(remote);
                    setActiveId(remote[0].id);
                    setIsLoaded(true);
                    return;
                }
            }

            // Fallback: localStorage
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored) as Conversation[];
                    if (parsed.length > 0) {
                        setConversations(parsed);
                        setActiveId(parsed[0].id);
                        setIsLoaded(true);
                        // Immediately back-fill Supabase with local history
                        if (session?.access_token) {
                            syncToSupabase(parsed, session.access_token);
                        }
                        return;
                    }
                }
            } catch (e) {
                console.error("Failed to load chat history:", e);
            }

            // Initialize empty if nothing found
            const initialId = uuidv4();
            const initial: Conversation = {
                id: initialId,
                title: "New Conversation",
                messages: buildWelcomeMessages(),
                updatedAt: Date.now(),
            };
            setConversations([initial]);
            setActiveId(initialId);
            setIsLoaded(true);
        };

        loadConversations();
    }, []);

    // ── Save to localStorage + debounced Supabase sync on every change ──────
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));

        // Debounce Supabase sync by 2 seconds to avoid hammering on every keypress
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
            if (sessionTokenRef.current) {
                syncToSupabase(conversations, sessionTokenRef.current);
            }
        }, 2000);
    }, [conversations, isLoaded]);

    // Keep session token fresh
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            sessionTokenRef.current = session?.access_token ?? null;
        });
        return () => subscription.unsubscribe();
    }, []);

    const activeConversation = conversations.find(c => c.id === activeId) || null;

    const createNewChat = () => {
        const newId = uuidv4();
        setConversations(prev => [
            { id: newId, title: "New Conversation", messages: buildWelcomeMessages(), updatedAt: Date.now() },
            ...prev
        ]);
        setActiveId(newId);
    };

    const setActiveChat = (id: string) => {
        setActiveId(id);
    };

    const deleteChat = (id: string) => {
        // Fire-and-forget delete from Supabase
        if (sessionTokenRef.current) {
            deleteFromSupabase(id, sessionTokenRef.current);
        }
        setConversations(prev => {
            const next = prev.filter(c => c.id !== id);
            if (next.length === 0) {
                const initialId = uuidv4();
                next.push({ id: initialId, title: "New Conversation", messages: buildWelcomeMessages(), updatedAt: Date.now() });
                setActiveId(initialId);
            } else if (activeId === id) {
                setActiveId(next[0].id);
            }
            return next;
        });
    };

    const renameChat = (id: string, newTitle: string) => {
        setConversations(prev => prev.map(c =>
            c.id === id ? { ...c, title: newTitle.trim() || "Untitled" } : c
        ));
    };

    const updateMessages = (id: string, updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
        setConversations(prev => prev.map(c => {
            if (c.id === id) {
                const newMessages = typeof updater === "function" ? updater(c.messages) : updater;

                // Auto-generate a title based on the first user message
                let title = c.title;
                if (title === "New Conversation") {
                    const firstUserMsg = newMessages.find(m => m.role === "user");
                    if (firstUserMsg && firstUserMsg.content) {
                        title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "");
                    }
                }
                return { ...c, messages: newMessages, title, updatedAt: Date.now() };
            }
            return c;
        }).sort((a, b) => b.updatedAt - a.updatedAt));
    };

    if (!isLoaded) return null;

    return (
        <ChatContext.Provider value={{
            conversations,
            activeId,
            activeConversation,
            createNewChat,
            setActiveChat,
            deleteChat,
            renameChat,
            updateMessages
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}
