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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Returns a user-scoped localStorage key so different users never share history. */
function storageKey(userId: string) {
    return `datatalk_history_${userId}`;
}

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
 *
 * We save a capped snapshot of rows (max 200 per message) so that chart
 * regeneration (violin, box, bar, etc.) works correctly when the user
 * reloads or signs back in. Without rows, row-derived charts show
 * "No data available" on restore.
 */
async function syncToSupabase(conversations: Conversation[], token: string) {
    try {
        // Only sync the 20 most recent conversations
        const recent = conversations.slice(0, 20).map(c => ({
            id: c.id,
            title: c.title,
            updated_at: c.updatedAt,        
            messages: c.messages.map(m => ({
                role: m.role,
                content: m.content,
                sql: m.sql,
                createdAt: m.createdAt,
                error: m.error,
                // Persist charts + a capped rows snapshot so visualizations restore correctly.
                // 200 rows is enough for chart regeneration while keeping payload small.
                charts: m.charts,
                columns: m.columns,
                rowCount: m.rowCount,
                attempts: m.attempts,
                isCached: m.isCached,
                rows: m.rows ? (m.rows as any[]).slice(0, 200) : undefined,
                // deliberately omit: steps (transient streaming state)
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
    // Store the current user ID for localStorage namespacing
    const userIdRef = useRef<string | null>(null);
    // Debounce timer ref for syncing
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Load conversations (Supabase first, localStorage fallback) ──────────
    useEffect(() => {
        const loadConversations = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            sessionTokenRef.current = session?.access_token ?? null;
            userIdRef.current = session?.user?.id ?? null;

            // Clean up legacy shared key (before per-user namespacing was introduced)
            localStorage.removeItem("datatalk_history");

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

            // Fallback: user-scoped localStorage (only if we have a user ID)
            if (session?.user?.id) {
                try {
                    const key = storageKey(session.user.id);
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const parsed = JSON.parse(stored) as Conversation[];
                        if (parsed.length > 0) {
                            setConversations(parsed);
                            setActiveId(parsed[0].id);
                            setIsLoaded(true);
                            // Back-fill Supabase with local history
                            if (session?.access_token) {
                                syncToSupabase(parsed, session.access_token);
                            }
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Failed to load chat history:", e);
                }
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

    // ── Save to user-scoped localStorage + debounced Supabase sync ──────────
    useEffect(() => {
        if (!isLoaded) return;
        // Only write to localStorage if we know who the user is
        if (userIdRef.current) {
            localStorage.setItem(storageKey(userIdRef.current), JSON.stringify(conversations));
        }

        // Debounce Supabase sync by 2 seconds to avoid hammering on every keypress
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
            if (sessionTokenRef.current) {
                syncToSupabase(conversations, sessionTokenRef.current);
            }
        }, 2000);
    }, [conversations, isLoaded]);

    // ── Keep session token + userId fresh; clear state on sign-out ──────────
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const newUserId = session?.user?.id ?? null;

            // If the user changed (sign-out or switched account), reset local state
            if (userIdRef.current && newUserId !== userIdRef.current) {
                setConversations([]);
                setActiveId(null);
                setIsLoaded(false);
            }

            sessionTokenRef.current = session?.access_token ?? null;
            userIdRef.current = newUserId;
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
