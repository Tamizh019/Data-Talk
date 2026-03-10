"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "./api";

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
    updateMessages: (id: string, updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = "datatalk_history";

const WELCOME_MESSAGES: ChatMessage[] = [
    {
        role: "assistant",
        content: "👋 Hello! I'm **Data-Talk AI**. Connect your database, then ask me anything — I'll generate the SQL, run it, and visualize the results automatically.",
    }
];

export function ChatProvider({ children }: { children: ReactNode }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Conversation[];
                if (parsed.length > 0) {
                    setConversations(parsed);
                    setActiveId(parsed[0].id);
                    setIsLoaded(true);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to load chat history:", e);
        }

        // Initialize empty state if nothing in storage
        const initialId = uuidv4();
        setConversations([{
            id: initialId,
            title: "New Conversation",
            messages: WELCOME_MESSAGES,
            updatedAt: Date.now()
        }]);
        setActiveId(initialId);
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage whenever conversations change
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }, [conversations, isLoaded]);

    const activeConversation = conversations.find(c => c.id === activeId) || null;

    const createNewChat = () => {
        const newId = uuidv4();
        setConversations(prev => [
            { id: newId, title: "New Conversation", messages: WELCOME_MESSAGES, updatedAt: Date.now() },
            ...prev
        ]);
        setActiveId(newId);
    };

    const setActiveChat = (id: string) => {
        setActiveId(id);
    };

    const deleteChat = (id: string) => {
        setConversations(prev => {
            const next = prev.filter(c => c.id !== id);
            if (next.length === 0) {
                // Keep at least one empty chat
                const initialId = uuidv4();
                next.push({ id: initialId, title: "New Conversation", messages: WELCOME_MESSAGES, updatedAt: Date.now() });
                setActiveId(initialId);
            } else if (activeId === id) {
                setActiveId(next[0].id);
            }
            return next;
        });
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
        }).sort((a, b) => b.updatedAt - a.updatedAt)); // Keep newest on top
    };

    // Don't render children until we've loaded from storage to prevent hydration mismatch
    if (!isLoaded) return null;

    return (
        <ChatContext.Provider value={{
            conversations,
            activeId,
            activeConversation,
            createNewChat,
            setActiveChat,
            deleteChat,
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
