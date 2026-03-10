/**
 * API client — all communication with the FastAPI backend.
 * Handles both regular requests and SSE streaming for chat.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IngestResponse {
    message: string;
    details: {
        source: string;
        chunks: number;
        status: string;
    };
}

export interface Source {
    source: string;
    score: number;
    text_preview: string;
}

export interface StreamChunk {
    type: "token" | "sources" | "done" | "error";
    data?: string | Source[];
}

// ─── Ingestion ────────────────────────────────────────────────────────────────

export async function ingestPDF(file: File): Promise<IngestResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/ingest`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Ingestion failed");
    }

    return res.json();
}

// ─── Chat (SSE Streaming) ─────────────────────────────────────────────────────

export async function streamChat(
    sessionId: string,
    message: string,
    onToken: (token: string) => void,
    onSources: (sources: Source[]) => void,
    onDone: () => void,
    onError: (error: string) => void
): Promise<void> {
    const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message }),
    });

    if (!res.ok) {
        const error = await res.json();
        onError(error.detail || "Chat request failed");
        return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
        onError("No response body");
        return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                try {
                    const parsed: StreamChunk = JSON.parse(line.slice(6));
                    if (parsed.type === "token") onToken(parsed.data as string);
                    else if (parsed.type === "sources") onSources(parsed.data as Source[]);
                    else if (parsed.type === "done") onDone();
                    else if (parsed.type === "error") onError(parsed.data as string);
                } catch {
                    // Ignore malformed chunks
                }
            }
        }
    }
}

// ─── Session Management ───────────────────────────────────────────────────────

export async function clearSession(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/chat/${sessionId}`, { method: "DELETE" });
}

export async function healthCheck(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/health`);
        return res.ok;
    } catch {
        return false;
    }
}
