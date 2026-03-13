// SSE streaming API client for Data-Talk

export interface ChatMessage {
    role: "user" | "assistant";
    content?: string;
    sql?: string;
    plotlyConfig?: PlotlyConfig;
    rowCount?: number;
    attempts?: number;
    isCached?: boolean;
    isStreaming?: boolean;
    error?: string;
}

export interface PlotlyConfig {
    data: object[];
    layout: object;
    chart_type?: string;
}

interface StreamCallbacks {
    onIntent?: (intent: "sql" | "chat") => void;
    onSql?: (sql: string) => void;
    onResult?: (rows: object[], columns: string[], rowCount: number, attempts: number) => void;
    onVisualization?: (config: PlotlyConfig) => void;
    onExplanation?: (text: string) => void;
    onCached?: (data: object) => void;
    onError?: (message: string) => void;
    onDone?: () => void;
}

export async function streamChat(
    sessionId: string,
    message: string,
    history: object[],
    callbacks: StreamCallbacks
): Promise<void> {
    const abortController = new AbortController();
    
    const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message, history }),
        signal: abortController.signal,
    });

    if (!res.ok || !res.body) {
        callbacks.onError?.(`HTTP ${res.status}: ${res.statusText}`);
        return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.startsWith("data:")) continue;

                try {
                    const eventStr = line.slice(5).trim();
                    if (!eventStr) continue;

                    const event = JSON.parse(eventStr);
                    switch (event.event) {
                        case "intent": callbacks.onIntent?.(event.intent); break;
                        case "sql_generated": callbacks.onSql?.(event.sql); break;
                        case "query_result":
                            callbacks.onResult?.(event.rows, event.columns, event.row_count, event.attempts);
                            break;
                        case "visualization": callbacks.onVisualization?.(event.plotly_config); break;
                        case "explanation": callbacks.onExplanation?.(event.text); break;
                        case "cached_result": callbacks.onCached?.(event); break;
                        case "error": callbacks.onError?.(event.message); break;
                        case "done": callbacks.onDone?.(); return;
                    }
                } catch (err) {
                    console.error("Failed to parse stream event:", line, err);
                }
            }
        }
    } finally {
        // Essential to prevent browser connection pool exhaustion (max 6 connections)
        reader.releaseLock();
        abortController.abort();
    }
}

/** Connect to a new database by providing a PostgreSQL connection URL. */
export async function connectDatabase(dbUrl: string): Promise<{ status: string; message: string }> {
    const res = await fetch("http://localhost:8000/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db_url: dbUrl }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Connection failed");
    }
    return res.json();
}

export interface SchemaTable {
    table: string;
    columns: string;
}

/** Fetch current database schema */
export async function fetchSchema(): Promise<{ tables: SchemaTable[] }> {
    const res = await fetch("http://localhost:8000/api/schema", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        throw new Error("Failed to fetch schema");
    }
    return res.json();
}

