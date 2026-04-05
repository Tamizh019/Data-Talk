"use client";

/**
 * ConnectDbModal.tsx
 *
 * Premium database connection modal.
 * Supports PostgreSQL, MySQL, SQLite, MongoDB, Redis via a visual provider selector.
 * Parameters and Connection URI modes are both available.
 * Backdrop click is intentionally disabled — only Cancel closes the modal.
 */

import { useState } from "react";
import { connectDatabase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

interface ConnectDbModalProps {
    onClose: () => void;
    onConnected: (data?: any) => void;
}

// ─── Database Provider Registry ──────────────────────────────────────────────

const DB_PROVIDERS = [
    {
        id: "postgresql",
        label: "POSTGRES",
        defaultPort: "5432",
        uriPrefix: "postgresql://user:password@host:5432/dbname",
        icon: (active: boolean) => (
            <svg viewBox="0 0 256 264" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path d="M255.625 158.51c-2.644-14.799-8.595-26.163-18.097-34.476-4.636-4.085-10.093-7.35-16.22-9.77.56-2.12 1.07-4.292 1.52-6.512 5.267-25.836 1.4-51.032-10.39-68.498C199.226 21.6 178.553 11.5 155.042 11.5c-9.836 0-19.294 2.025-27.994 5.97-5.22-2.44-10.79-3.97-16.62-4.47-12.5-1.07-24.87 2.7-34.89 10.65-17.17 13.56-24.83 36.05-23.66 68.9.18 4.96.6 10.01 1.23 15.05-4.52 1.77-8.72 4.06-12.5 6.85-10.73 7.89-17.53 19.47-20.75 35.33-3.49 17.31-1.55 35.43 5.48 51.06 8.15 18.36 21.94 29.32 38.93 30.87 1.43.13 2.87.19 4.32.19 9.3 0 19.12-2.91 28.75-8.64 4.5 2.46 9.29 4.36 14.32 5.59.19 1.98.42 3.88.71 5.65.97 6 3.12 11.18 6.52 15.42 4.28 5.33 10.41 8.38 18.23 9.08.94.08 1.87.12 2.79.12 12.2 0 24.7-5.86 34.71-16.35 7.75-8.07 13.48-18.55 16.05-29.68 5.62-1.16 10.89-3.1 15.6-5.85 10.42-6.08 17.66-15.57 21.48-28.21 3.42-11.36 3.64-23.9.62-36.24z" fill={active ? "#336791" : "rgba(51,103,145,0.55)"} />
                    <path d="M127.5 25.5c7.34 0 14.47 1.55 21.19 4.48-16.02 8.04-30.21 22.37-38.63 40.6-4.14 8.95-6.58 18.42-7.36 28.06-2.43-.93-4.88-1.74-7.33-2.41.25-3.53.38-7.02.38-10.43 0-30.4 13.8-60.3 31.75-60.3zM77.3 108.16c.06-.07.12-.14.19-.2l-.19.2z" fill={active ? "#fff" : "var(--color-muted-foreground)"} />
                    <text x="128" y="148" textAnchor="middle" fontSize="72" fontWeight="bold" fill={active ? "var(--color-foreground)" : "var(--color-muted-foreground)"} fontFamily="monospace">PG</text>
                </g>
            </svg>
        ),
    },
    {
        id: "mysql",
        label: "MYSQL",
        defaultPort: "3306",
        uriPrefix: "mysql://user:password@host:3306/dbname",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 90.5c9.2.4 15.8-1 21.4-5.7 1.6-1.3 3.4-2.5 2.7-4.8-.7-2.2-3-2.4-5-2.7-4.7-.7-9.4-.3-14.1-.5-1.6-.1-3.3-.4-4.8-.9V90.5z" fill={active ? "#00758F" : "rgba(0,117,143,0.5)"} />
                <path d="M2 66.3c8.1.5 16.1.2 24.1-.9 3.3-.5 6.5-1.7 7.7-5.2 1.3-3.7-.8-6.4-3.6-8.4-4.6-3.3-10.1-4.5-15.5-5.7C11.3 45.4 7 44.4 2 42.7v23.6z" fill={active ? "#00758F" : "rgba(0,117,143,0.5)"} />
                <text x="64" y="80" textAnchor="middle" fontSize="44" fontWeight="bold" fill={active ? "#F29111" : "rgba(242,145,17,0.5)"} fontFamily="Arial, sans-serif">My</text>
                <text x="64" y="108" textAnchor="middle" fontSize="22" fontWeight="bold" fill={active ? "#00758F" : "rgba(0,117,143,0.5)"} fontFamily="Arial, sans-serif">SQL</text>
            </svg>
        ),
    },
    {
        id: "sqlite",
        label: "SQLITE",
        defaultPort: "",
        uriPrefix: "sqlite:///path/to/database.db",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="40" cy="64" rx="22" ry="56" fill={active ? "#0F80CC" : "rgba(15,128,204,0.5)"} />
                <ellipse cx="40" cy="64" rx="13" ry="48" fill={active ? "#44A8DE" : "rgba(68,168,222,0.5)"} />
                <rect x="40" y="8" width="55" height="112" rx="6" fill={active ? "#003B57" : "rgba(0,59,87,0.5)"} />
                <text x="67" y="75" textAnchor="middle" fontSize="28" fontWeight="bold" fill={active ? "#0F80CC" : "rgba(15,128,204,0.5)"} fontFamily="monospace">SQL</text>
            </svg>
        ),
    },
    {
        id: "mongodb",
        label: "MONGODB",
        defaultPort: "27017",
        uriPrefix: "mongodb://user:password@host:27017/dbname",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                <path d="M64 4C37 4 22 34 22 64c0 24.4 10.6 44.6 26 54.3l7.3 2.5v-12C42 100.3 34 83.5 34 64c0-25.6 12-44 30-44s30 18.4 30 44c0 19.5-8 36.3-21.3 44.8v12l7.3-2.5C96 108.6 106 88.4 106 64c0-30-15-60-42-60z" fill={active ? "#4FAA41" : "rgba(79,170,65,0.5)"} />
                <path d="M64 4v118.8l4-1.4C84 112.3 94 88 94 64 94 30 80 4 64 4z" fill={active ? "#3D8C34" : "rgba(61,140,52,0.5)"} />
                <ellipse cx="64" cy="110" rx="5" ry="12" fill={active ? "#4FAA41" : "rgba(79,170,65,0.5)"} />
            </svg>
        ),
    },
    {
        id: "redis",
        label: "REDIS",
        defaultPort: "6379",
        uriPrefix: "redis://user:password@host:6379",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 88l56 20 56-20-56-20z" fill={active ? "#722b1b" : "rgba(114,43,27,0.5)"} />
                <path d="M8 72l56 20 56-20-56-20z" fill={active ? "#a33625" : "rgba(163,54,37,0.5)"} />
                <path d="M8 56l56 20 56-20-56-20z" fill={active ? "#D9371D" : "rgba(217,55,29,0.5)"} />
                <path d="M8 40l56 20 56-20L64 20z" fill={active ? "#F04030" : "rgba(240,64,48,0.5)"} />
                <path d="M64 20l56 20-56 20z" fill={active ? "#C02515" : "rgba(192,37,21,0.5)"} />
            </svg>
        ),
    },
] as const;

type DbId = (typeof DB_PROVIDERS)[number]["id"];

// ─── Shared Input Style Helper ────────────────────────────────────────────────

const mkInputStyle = (hasError: boolean) => ({
    background: "#f8fafc",
    border: `1px solid ${hasError ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.1)"}`,
    color: "#1e293b",
    caretColor: "#7C6FFF",
});

function InputField({
    label, type = "text", value, onChange, placeholder, onKeyDown, icon, hasError,
}: {
    label: string; type?: string; value: string; onChange: (v: string) => void;
    placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void;
    icon?: React.ReactNode; hasError: boolean;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground">{label}</label>
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">{icon}</span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className={`w-full rounded-xl text-[13px] outline-none transition-all placeholder:text-muted-foreground/50 ${icon ? "pl-9 pr-3" : "px-3"} py-2.5`}
                    style={mkInputStyle(hasError)}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(124,111,255,0.6)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.1), inset 0 1px 0 rgba(255,255,255,0.04)";
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = hasError ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.1)";
                        e.currentTarget.style.boxShadow = "none";
                    }}
                />
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const PersonIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const LinkIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConnectDbModal({ onClose, onConnected }: ConnectDbModalProps) {
    const { user: authUser } = useAuth();
    const supabase = createClient();

    const [selectedDb, setSelectedDb] = useState<DbId>("postgresql");
    const [connectionType, setConnectionType] = useState<"parameters" | "uri">("parameters");

    const [uri, setUri] = useState("");
    const [host, setHost] = useState("localhost");
    const [port, setPort] = useState("5432");
    const [db_user, setDbUser] = useState("postgres");
    const [password, setPassword] = useState("");
    const [dbname, setDbname] = useState("");

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const hasError = status === "error";

    const handleProviderSelect = (id: DbId) => {
        setSelectedDb(id);
        const provider = DB_PROVIDERS.find((p) => p.id === id);
        if (provider) {
            setPort(provider.defaultPort);
        }
        
        // Smart defaults
        if (id === "mysql") {
            setDbUser("root");
        } else if (id === "postgresql") {
            setDbUser("postgres");
        }

        setStatus("idle");
        setErrorMsg("");
    };

    const currentProvider = DB_PROVIDERS.find((p) => p.id === selectedDb)!;

    const handleConnect = async () => {
        let url = "";

        if (connectionType === "parameters") {
            if (!host || !db_user || !password || !dbname) {
                setStatus("error");
                setErrorMsg("Please fill in all required connection fields.");
                return;
            }
            const portStr = port ? `:${port}` : "";
            if (selectedDb === "sqlite") {
                url = `sqlite:///${dbname}`;
            } else if (selectedDb === "mongodb") {
                url = `mongodb://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}${portStr}/${dbname}`;
            } else if (selectedDb === "redis") {
                url = `redis://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}${portStr}`;
            } else if (selectedDb === "mysql") {
                url = `mysql://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}${portStr}/${dbname}`;
            } else {
                url = `postgresql://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}${portStr}/${dbname}`;
            }
        } else {
            if (!uri.trim()) {
                setStatus("error");
                setErrorMsg("Please enter a valid connection URI.");
                return;
            }
            let finalUri = uri.trim();
            try {
                const match = finalUri.match(/^(postgresql:\/\/|postgres:\/\/)(.*)/);
                if (match) {
                    const protocol = match[1];
                    const rest = match[2];
                    const firstColon = rest.indexOf(":");
                    const lastAt = rest.lastIndexOf("@");
                    if (firstColon !== -1 && lastAt !== -1 && firstColon < lastAt) {
                        const u = rest.substring(0, firstColon);
                        const p = rest.substring(firstColon + 1, lastAt);
                        const hostPortDb = rest.substring(lastAt + 1);
                        const safePassword = encodeURIComponent(decodeURIComponent(p));
                        finalUri = `${protocol}${u}:${safePassword}@${hostPortDb}`;
                    }
                }
            } catch {
                // Ignore parse errors — backend will validate
            }
            url = finalUri;
        }

        setStatus("loading");
        setErrorMsg("");
        try {
            const result = await connectDatabase(url);

            if (authUser) {
                await supabase
                    .from("db_connections")
                    .update({ is_active: false })
                    .eq("user_id", authUser.id);

                const connName = connectionType === "parameters" ? dbname : "Main Database";
                const { error: upsertError } = await supabase.from("db_connections").upsert({
                    user_id: authUser.id,
                    name: connName,
                    connection_uri: url,
                    is_active: true,
                });
                if (upsertError) console.error("Supabase save failed:", upsertError);
            }

            setStatus("success");
            setTimeout(() => {
                onConnected(result);
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "Connection failed. Check your credentials.");
        }
    };

    const isSqlite = selectedDb === "sqlite";

    return (
        /* Backdrop — click intentionally does NOT close the modal */
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
            }}
        >

            {/* Modal Card */}
            <div
                className="relative w-full mx-4 rounded-[20px] overflow-hidden shadow-2xl animate-modal-in backdrop-blur-xl bg-white/95 text-slate-800"
                style={{
                    maxWidth: 580,
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.1), 0 0 40px rgba(124,111,255,0.06)",
                }}
            >
                {/* Top accent line */}
                <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #7C6FFF 40%, #00C9B1 70%, transparent)" }} />

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="px-7 pt-6 pb-5 flex items-start justify-between border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: "linear-gradient(135deg, rgba(124,111,255,0.25), rgba(0,201,177,0.15))",
                                border: "1px solid rgba(124,111,255,0.3)",
                                boxShadow: "0 0 20px rgba(124,111,255,0.15)",
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="#7C6FFF" viewBox="0 0 24 24" strokeWidth={1.8}>
                                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[18px] font-bold text-slate-800 tracking-tight">Connect to Database</h2>
                            <p className="text-[10px] font-semibold tracking-[0.18em] mt-0.5" style={{ color: "rgba(124,111,255,0.7)" }}>
                                INFRASTRUCTURE INTEGRATION
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all mt-0.5"
                        style={{ background: "#f1f5f9", color: "#64748B", border: "1px solid rgba(0,0,0,0.05)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748B"; }}
                        title="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="px-7 py-6 space-y-6">

                    {/* Provider Selector */}
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] mb-3" style={{ color: "var(--color-muted-foreground)" }}>SELECT PROVIDER</p>
                        <div className="grid grid-cols-5 gap-3">
                            {DB_PROVIDERS.map((provider) => {
                                const active = selectedDb === provider.id;
                                const isComingSoon = provider.id !== "postgresql" && provider.id !== "mysql";
                                return (
                                    <div key={provider.id} className="relative w-full group">
                                        <button
                                            onClick={() => !isComingSoon && handleProviderSelect(provider.id)}
                                            className={`w-full flex flex-col items-center justify-center gap-2.5 rounded-[14px] py-4 transition-all duration-300 relative overflow-hidden`}
                                            disabled={isComingSoon}
                                            style={{
                                                background: active ? "rgba(124,111,255,0.08)" : "transparent",
                                                border: active
                                                    ? "1.5px solid #7C6FFF"
                                                    : "1.5px solid rgba(0,0,0,0.06)",
                                                boxShadow: active ? "0 4px 12px rgba(124,111,255,0.15)" : "none",
                                                cursor: isComingSoon ? "not-allowed" : "pointer",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!active && !isComingSoon) {
                                                    e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                                                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!active && !isComingSoon) {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                                                }
                                            }}
                                        >
                                            <div className={`transition-all duration-300 ${isComingSoon ? "opacity-30 blur-[1px] grayscale" : active ? "scale-110" : "grayscale opacity-70 hover:grayscale-0 hover:opacity-100"}`}>
                                                {provider.icon(active || !isComingSoon)}
                                            </div>
                                            <span
                                                className={`text-[9.5px] font-bold tracking-widest mt-1 ${isComingSoon ? "opacity-40" : ""}`}
                                                style={{ color: active ? "#7C6FFF" : "#64748B" }}
                                            >
                                                {provider.label}
                                            </span>
                                            
                                            {/* Locked Overlay */}
                                            {isComingSoon && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-[1px] z-10 transition-opacity">
                                                    <div className="bg-slate-800/90 p-1.5 rounded-full shadow-sm mb-1">
                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[7.5px] font-bold text-slate-700 tracking-wider bg-white/90 px-1.5 py-0.5 rounded shadow-sm">COMING SOON</span>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div
                        className="flex gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/50"
                    >
                        {(["parameters", "uri"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setConnectionType(tab); setStatus("idle"); setErrorMsg(""); }}
                                className="flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all duration-200 tracking-wide"
                                style={{
                                    background: connectionType === tab ? "#fff" : "transparent",
                                    color: connectionType === tab ? "#7C6FFF" : "#64748B",
                                    border: connectionType === tab ? "1px solid rgba(0,0,0,0.05)" : "1px solid transparent",
                                    boxShadow: connectionType === tab ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                                }}
                            >
                                {tab === "parameters" ? "Parameters" : "Connection URI"}
                            </button>
                        ))}
                    </div>

                    {/* ── Parameters Form ── */}
                    {connectionType === "parameters" ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <InputField
                                        label="HOST ADDRESS"
                                        value={host}
                                        onChange={setHost}
                                        placeholder={isSqlite ? "N/A for SQLite" : "db.example.com"}
                                        hasError={hasError}
                                    />
                                </div>
                                <InputField
                                    label="PORT"
                                    value={port}
                                    onChange={setPort}
                                    placeholder={isSqlite ? "—" : currentProvider.defaultPort}
                                    hasError={hasError}
                                />
                            </div>

                            {!isSqlite && (
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="USERNAME"
                                        value={db_user}
                                        onChange={setDbUser}
                                        placeholder="admin_user"
                                        icon={<PersonIcon />}
                                        hasError={hasError}
                                    />
                                    <InputField
                                        label="PASSWORD"
                                        type="password"
                                        value={password}
                                        onChange={setPassword}
                                        placeholder="••••••••••"
                                        icon={<LockIcon />}
                                        hasError={hasError}
                                    />
                                </div>
                            )}

                            <InputField
                                label={isSqlite ? "FILE PATH" : "DATABASE NAME"}
                                value={dbname}
                                onChange={setDbname}
                                placeholder={isSqlite ? "/absolute/path/to/database.db" : "production_ledger_v2"}
                                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                                hasError={hasError}
                            />
                        </div>
                    ) : (
                        /* ── Connection URI Form ── */
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold tracking-widest text-muted-foreground">
                                    CONNECTION STRING
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                                        <LinkIcon />
                                    </span>
                                    <input
                                        type="text"
                                        value={uri}
                                        onChange={(e) => setUri(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                                        placeholder={currentProvider.uriPrefix}
                                        autoComplete="off"
                                        spellCheck={false}
                                        className="w-full rounded-xl pl-9 pr-3 py-3 text-[12px] font-mono outline-none transition-all placeholder:text-muted-foreground/40"
                                        style={mkInputStyle(hasError)}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = "rgba(124,111,255,0.6)";
                                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,255,0.1), inset 0 1px 0 rgba(255,255,255,0.04)";
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = hasError ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.1)";
                                            e.currentTarget.style.boxShadow = "none";
                                        }}
                                    />
                                </div>
                                {/* URI Format hint */}
                                <div
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg mt-1"
                                    style={{ background: "rgba(124,111,255,0.06)", border: "1px solid rgba(124,111,255,0.1)" }}
                                >
                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#7C6FFF" viewBox="0 0 24 24" strokeWidth={2}>
                                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" strokeLinecap="round" />
                                    </svg>
                                    <span className="text-[10px] font-mono" style={{ color: "rgba(124,111,255,0.7)" }}>
                                        {currentProvider.uriPrefix}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {status === "error" && (
                        <div
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#f87171" viewBox="0 0 24 24" strokeWidth={2}>
                                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[11px]" style={{ color: "#f87171" }}>{errorMsg}</span>
                        </div>
                    )}

                    {/* Info Tips */}
                    <div className="flex items-center gap-6 pt-1">
                        {[
                            "Supports SSL connections",
                            "Connection schema will be indexed",
                        ].map((tip, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00C9B1", boxShadow: "0 0 6px #00C9B1" }} />
                                <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                <div
                    className="px-7 py-5 flex items-center justify-between border-t border-slate-200/50 bg-slate-50/50"
                >
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentProvider.id === "postgresql" ? "#336791" : currentProvider.id === "mysql" ? "#F29111" : currentProvider.id === "sqlite" ? "#0F80CC" : currentProvider.id === "mongodb" ? "#4FAA41" : "#D9371D" }} />
                        <span className="text-[10px] font-semibold tracking-wider" style={{ color: "var(--color-muted-foreground)" }}>
                            {currentProvider.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-[12px] font-semibold tracking-wide transition-all duration-200"
                            style={{
                                background: "#f1f5f9",
                                color: "#64748B",
                                border: "1px solid rgba(0,0,0,0.06)",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#1e293b"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748B"; }}
                        >
                            CANCEL
                        </button>

                        <button
                            onClick={handleConnect}
                            disabled={status === "loading" || status === "success"}
                            className="px-7 py-2.5 rounded-xl text-[12px] font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: status === "success"
                                    ? "linear-gradient(135deg, #059669, #10b981)"
                                    : "linear-gradient(135deg, #6B5CE7, #7C6FFF 50%, #9B8FFF)",
                                color: "var(--color-foreground)",
                                minWidth: 160,
                                boxShadow: status === "success"
                                    ? "0 6px 24px rgba(16,185,129,0.35)"
                                    : "0 6px 24px rgba(124,111,255,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
                            }}
                            onMouseEnter={(e) => {
                                if (status !== "loading" && status !== "success") {
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 10px 32px rgba(124,111,255,0.45), inset 0 1px 0 rgba(255,255,255,0.15)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,111,255,0.35), inset 0 1px 0 rgba(255,255,255,0.12)";
                            }}
                        >
                            {status === "loading" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    CONNECTING...
                                </span>
                            ) : status === "success" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    CONNECTED!
                                </span>
                            ) : (
                                "CONNECT DATABASE"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
