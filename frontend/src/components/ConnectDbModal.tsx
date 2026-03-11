"use client";

import { useState } from "react";
import { connectDatabase } from "@/lib/api";

interface ConnectDbModalProps {
    onClose: () => void;
    onConnected: () => void;
}

export default function ConnectDbModal({ onClose, onConnected }: ConnectDbModalProps) {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleConnect = async () => {
        if (!url.trim()) return;
        setStatus("loading");
        setErrorMsg("");
        try {
            await connectDatabase(url.trim());
            setStatus("success");
            setTimeout(() => {
                onConnected();
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "Connection failed");
        }
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Modal */}
            <div
                className="w-full max-w-[480px] mx-4 rounded-2xl overflow-hidden shadow-2xl animate-fadein"
                style={{
                    background: "rgba(13,13,22,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(30px)",
                }}
            >
                {/* Header */}
                <div
                    className="px-6 py-4 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                        >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[14px] font-bold text-white">Connect Database</h2>
                            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Enter your PostgreSQL connection URL</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Format hint */}
                    <div
                        className="px-3 py-2.5 rounded-xl text-[11px] font-mono"
                        style={{
                            background: "rgba(124,111,255,0.08)",
                            border: "1px solid rgba(124,111,255,0.15)",
                            color: "#7C6FFF",
                        }}
                    >
                        postgresql://user:password@host:5432/database
                    </div>

                    {/* Input */}
                    <div>
                        <label className="block text-[11px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                            DATABASE URL
                        </label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                            placeholder="postgresql://postgres:password@localhost:5432/mydb"
                            autoFocus
                            className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all"
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                border: `1px solid ${status === "error" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                                color: "white",
                                caretColor: "#7C6FFF",
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                        {status === "error" && (
                            <p className="mt-2 text-[11px]" style={{ color: "#f87171" }}>
                                ⚠ {errorMsg}
                            </p>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="space-y-1.5">
                        {[
                            "Supports PostgreSQL only",
                            "Use URL-encoded special chars in passwords (@ → %40)",
                            "The database schema will be indexed automatically",
                        ].map((tip, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span style={{ color: "#00C9B1", fontSize: "10px", marginTop: "2px" }}>◆</span>
                                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-6 py-4 flex items-center justify-end gap-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-[12px] font-medium transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConnect}
                        disabled={!url.trim() || status === "loading" || status === "success"}
                        className="px-5 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: status === "success" ? "#10b981" : "#4f46e5",
                            minWidth: "120px",
                        }}
                    >
                        {status === "loading" ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Connecting...
                            </span>
                        ) : status === "success" ? (
                            "✓ Connected!"
                        ) : (
                            "Connect Database"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
