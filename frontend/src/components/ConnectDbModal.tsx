"use client";

import { useState } from "react";
import { connectDatabase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

interface ConnectDbModalProps {
    onClose: () => void;
    onConnected: () => void;
}

export default function ConnectDbModal({ onClose, onConnected }: ConnectDbModalProps) {
    const { user: authUser } = useAuth();
    const supabase = createClient();

    const [connectionType, setConnectionType] = useState<"parameters" | "uri">("parameters");
    const [uri, setUri] = useState("");
    const [host, setHost] = useState("localhost");
    const [port, setPort] = useState("5432");
    const [db_user, setDbUser] = useState("postgres"); // Changed from 'user' to avoid conflict
    const [password, setPassword] = useState("");
    const [dbname, setDbname] = useState("");
    
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleConnect = async () => {
        let url = "";

        if (connectionType === "parameters") {
            if (!host || !port || !db_user || !password || !dbname) {
                setStatus("error");
                setErrorMsg("Please fill in all connection fields.");
                return;
            }
            url = `postgresql://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}:${port}/${dbname}`;
        } else {
            if (!uri.trim()) {
                setStatus("error");
                setErrorMsg("Please enter a connection URI.");
                return;
            }
            let finalUri = uri.trim();
            // Automatically url-encode the password part if it contains special characters
            try {
                const match = finalUri.match(/^(postgresql:\/\/|postgres:\/\/)(.*)/);
                if (match) {
                    const protocol = match[1];
                    const rest = match[2];
                    const firstColon = rest.indexOf(':');
                    const lastAt = rest.lastIndexOf('@');
                    
                    if (firstColon !== -1 && lastAt !== -1 && firstColon < lastAt) {
                        const u = rest.substring(0, firstColon);
                        const p = rest.substring(firstColon + 1, lastAt);
                        const hostPortDb = rest.substring(lastAt + 1);
                        
                        // Decode first in case it's partially encoded, then encode
                        const safePassword = encodeURIComponent(decodeURIComponent(p));
                        finalUri = `${protocol}${u}:${safePassword}@${hostPortDb}`;
                    }
                }
            } catch (e) {
                // Ignore parse errors, let backend handle it
            }
            url = finalUri;
        }

        setStatus("loading");
        setErrorMsg("");
        try {
            // 1. Backend Connection
            await connectDatabase(url);

            // 2. Persist to Supabase if logged in
            if (authUser) {
                // Deactivate all existing connections for this user
                await supabase
                    .from("db_connections")
                    .update({ is_active: false })
                    .eq("user_id", authUser.id);

                // Upsert this new connection
                // We'll use the DB name as the name if using parameters, or 'Main Database' for URI
                const connName = connectionType === "parameters" ? dbname : "Main Database";
                
                const { error: upsertError } = await supabase
                    .from("db_connections")
                    .upsert({
                        user_id: authUser.id,
                        name: connName,
                        connection_uri: url,
                        is_active: true
                    });
                
                if (upsertError) {
                    console.error("Failed to save connection to Supabase:", upsertError);
                    // We don't block the UI if Supabase save fails but backend succeeded
                }
            }

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

    const inputStyles = {
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${status === "error" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
        color: "white",
        caretColor: "#7C6FFF",
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
                            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Enter PostgreSQL connection details</p>
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
                    {/* Toggle */}
                    <div className="flex p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <button
                            onClick={() => setConnectionType("parameters")}
                            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${connectionType === "parameters" ? "text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
                            style={{ background: connectionType === "parameters" ? "rgba(124,111,255,0.15)" : "transparent" }}
                        >
                            Parameters
                        </button>
                        <button
                            onClick={() => setConnectionType("uri")}
                            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${connectionType === "uri" ? "text-white shadow-sm" : "text-white/40 hover:text-white/60"}`}
                            style={{ background: connectionType === "uri" ? "rgba(124,111,255,0.15)" : "transparent" }}
                        >
                            Connection URI
                        </button>
                    </div>

                    {connectionType === "parameters" ? (
                        <>
                            {/* Input Grid */}
                            <div className="grid grid-cols-2 gap-4">
                        {/* Host */}
                        <div>
                            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>HOST</label>
                            <input
                                type="text"
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                placeholder="localhost"
                                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all"
                                style={inputStyles}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                        </div>
                        {/* Port */}
                        <div>
                            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>PORT</label>
                            <input
                                type="text"
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                                placeholder="5432"
                                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all"
                                style={inputStyles}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                        </div>
                        {/* User */}
                        <div>
                            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>USERNAME</label>
                            <input
                                type="text"
                                value={db_user}
                                onChange={(e) => setDbUser(e.target.value)}
                                placeholder="postgres"
                                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all"
                                style={inputStyles}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                        </div>
                        {/* Password */}
                        <div>
                            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>PASSWORD</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all"
                                style={inputStyles}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                        </div>
                    </div>
                    {/* Database Name */}
                    <div>
                        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>DATABASE NAME</label>
                        <input
                            type="text"
                            value={dbname}
                            onChange={(e) => setDbname(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                            placeholder="my_database"
                            className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all"
                            style={inputStyles}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                    </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>CONNECTION URI</label>
                            <input
                                type="text"
                                value={uri}
                                onChange={(e) => setUri(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                                placeholder="postgresql://user:password@host:port/dbname"
                                className="w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-all"
                                style={inputStyles}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,111,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.08)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                        </div>
                    )}
                    
                    {status === "error" && (
                        <p className="mt-2 text-[11px]" style={{ color: "#f87171" }}>
                            ⚠ {errorMsg}
                        </p>
                    )}

                    {/* Tips */}
                    <div className="space-y-1.5 pt-2">
                        {[
                            "Supports PostgreSQL only",
                            "The database schema will be indexed automatically",
                            "Using Supabase? Use the IPv4 Session Pooler connection details",
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
                        disabled={
                            (connectionType === "parameters" && (!host || !port || !db_user || !password || !dbname)) || 
                            (connectionType === "uri" && !uri.trim()) || 
                            status === "loading" || status === "success"
                        }
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
