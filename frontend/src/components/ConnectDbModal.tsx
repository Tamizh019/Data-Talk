"use client";

/**
 * ConnectDbModal.tsx
 *
 * Premium database connection modal with SQL / NoSQL provider grouping.
 * Supports PostgreSQL, MySQL, SQLite (SQL) and MongoDB, Redis (NoSQL).
 * Cassandra is shown as a locked future provider.
 * NoSQL providers display a "query support coming soon" banner when selected.
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

type DbCategory = "sql" | "nosql";

interface DbProvider {
    id: string;
    label: string;
    category: DbCategory;
    defaultPort: string;
    uriPrefix: string;
    color: string;
    locked?: boolean;
    icon: (active: boolean) => React.ReactNode;
}

const DB_PROVIDERS: DbProvider[] = [
    // ── SQL Databases ──
    {
        id: "postgresql",
        label: "Postgres",
        category: "sql",
        defaultPort: "5432",
        color: "#336791",
        uriPrefix: "postgresql://user:password@host:5432/dbname",
        icon: (active: boolean) => (
            <svg viewBox="0 0 256 264" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path d="M255.625 158.51c-2.644-14.799-8.595-26.163-18.097-34.476-4.636-4.085-10.093-7.35-16.22-9.77.56-2.12 1.07-4.292 1.52-6.512 5.267-25.836 1.4-51.032-10.39-68.498C199.226 21.6 178.553 11.5 155.042 11.5c-9.836 0-19.294 2.025-27.994 5.97-5.22-2.44-10.79-3.97-16.62-4.47-12.5-1.07-24.87 2.7-34.89 10.65-17.17 13.56-24.83 36.05-23.66 68.9.18 4.96.6 10.01 1.23 15.05-4.52 1.77-8.72 4.06-12.5 6.85-10.73 7.89-17.53 19.47-20.75 35.33-3.49 17.31-1.55 35.43 5.48 51.06 8.15 18.36 21.94 29.32 38.93 30.87 1.43.13 2.87.19 4.32.19 9.3 0 19.12-2.91 28.75-8.64 4.5 2.46 9.29 4.36 14.32 5.59.19 1.98.42 3.88.71 5.65.97 6 3.12 11.18 6.52 15.42 4.28 5.33 10.41 8.38 18.23 9.08.94.08 1.87.12 2.79.12 12.2 0 24.7-5.86 34.71-16.35 7.75-8.07 13.48-18.55 16.05-29.68 5.62-1.16 10.89-3.1 15.6-5.85 10.42-6.08 17.66-15.57 21.48-28.21 3.42-11.36 3.64-23.9.62-36.24z" fill={active ? "#336791" : "rgba(51,103,145,0.45)"} />
                    <text x="128" y="148" textAnchor="middle" fontSize="72" fontWeight="bold" fill="#fff" fontFamily="monospace">PG</text>
                </g>
            </svg>
        ),
    },
    {
        id: "mysql",
        label: "MySQL",
        category: "sql",
        defaultPort: "3306",
        color: "#F29111",
        uriPrefix: "mysql://user:password@host:3306/dbname",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 90.5c9.2.4 15.8-1 21.4-5.7 1.6-1.3 3.4-2.5 2.7-4.8-.7-2.2-3-2.4-5-2.7-4.7-.7-9.4-.3-14.1-.5-1.6-.1-3.3-.4-4.8-.9V90.5z" fill={active ? "#00758F" : "rgba(0,117,143,0.4)"} />
                <path d="M2 66.3c8.1.5 16.1.2 24.1-.9 3.3-.5 6.5-1.7 7.7-5.2 1.3-3.7-.8-6.4-3.6-8.4-4.6-3.3-10.1-4.5-15.5-5.7C11.3 45.4 7 44.4 2 42.7v23.6z" fill={active ? "#00758F" : "rgba(0,117,143,0.4)"} />
                <text x="64" y="80" textAnchor="middle" fontSize="44" fontWeight="bold" fill={active ? "#F29111" : "rgba(242,145,17,0.45)"} fontFamily="Arial, sans-serif">My</text>
                <text x="64" y="108" textAnchor="middle" fontSize="22" fontWeight="bold" fill={active ? "#00758F" : "rgba(0,117,143,0.45)"} fontFamily="Arial, sans-serif">SQL</text>
            </svg>
        ),
    },
    {
        id: "sqlite",
        label: "SQLite",
        category: "sql",
        defaultPort: "",
        color: "#0F80CC",
        uriPrefix: "sqlite:///path/to/database.db",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="40" cy="64" rx="22" ry="56" fill={active ? "#0F80CC" : "rgba(15,128,204,0.4)"} />
                <ellipse cx="40" cy="64" rx="13" ry="48" fill={active ? "#44A8DE" : "rgba(68,168,222,0.4)"} />
                <rect x="40" y="8" width="55" height="112" rx="6" fill={active ? "#003B57" : "rgba(0,59,87,0.4)"} />
                <text x="67" y="75" textAnchor="middle" fontSize="28" fontWeight="bold" fill={active ? "#0F80CC" : "rgba(15,128,204,0.4)"} fontFamily="monospace">SQL</text>
            </svg>
        ),
    },
    // ── NoSQL Databases ──
    {
        id: "mongodb",
        label: "MongoDB",
        category: "nosql",
        defaultPort: "27017",
        color: "#4FAA41",
        uriPrefix: "mongodb://user:password@host:27017/dbname",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <path d="M64 4C37 4 22 34 22 64c0 24.4 10.6 44.6 26 54.3l7.3 2.5v-12C42 100.3 34 83.5 34 64c0-25.6 12-44 30-44s30 18.4 30 44c0 19.5-8 36.3-21.3 44.8v12l7.3-2.5C96 108.6 106 88.4 106 64c0-30-15-60-42-60z" fill={active ? "#4FAA41" : "rgba(79,170,65,0.4)"} />
                <path d="M64 4v118.8l4-1.4C84 112.3 94 88 94 64 94 30 80 4 64 4z" fill={active ? "#3D8C34" : "rgba(61,140,52,0.4)"} />
                <ellipse cx="64" cy="110" rx="5" ry="12" fill={active ? "#4FAA41" : "rgba(79,170,65,0.4)"} />
            </svg>
        ),
    },
    {
        id: "redis",
        label: "Redis",
        category: "nosql",
        defaultPort: "6379",
        color: "#D9371D",
        uriPrefix: "redis://user:password@host:6379",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 88l56 20 56-20-56-20z" fill={active ? "#722b1b" : "rgba(114,43,27,0.4)"} />
                <path d="M8 72l56 20 56-20-56-20z" fill={active ? "#a33625" : "rgba(163,54,37,0.4)"} />
                <path d="M8 56l56 20 56-20-56-20z" fill={active ? "#D9371D" : "rgba(217,55,29,0.4)"} />
                <path d="M8 40l56 20 56-20L64 20z" fill={active ? "#F04030" : "rgba(240,64,48,0.4)"} />
                <path d="M64 20l56 20-56 20z" fill={active ? "#C02515" : "rgba(192,37,21,0.4)"} />
            </svg>
        ),
    },
    {
        id: "cassandra",
        label: "Cassandra",
        category: "nosql",
        defaultPort: "9042",
        color: "#1287B1",
        locked: true,
        uriPrefix: "cassandra://user:password@host:9042/keyspace",
        icon: (active: boolean) => (
            <svg viewBox="0 0 128 128" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                <circle cx="64" cy="38" r="22" fill={active ? "#1287B1" : "rgba(18,135,177,0.4)"} />
                <ellipse cx="40" cy="80" rx="18" ry="18" fill={active ? "#1287B1" : "rgba(18,135,177,0.4)"} />
                <ellipse cx="88" cy="80" rx="18" ry="18" fill={active ? "#1287B1" : "rgba(18,135,177,0.4)"} />
                <line x1="64" y1="58" x2="44" y2="66" stroke={active ? "#0d6e8f" : "rgba(13,110,143,0.4)"} strokeWidth="4" />
                <line x1="64" y1="58" x2="84" y2="66" stroke={active ? "#0d6e8f" : "rgba(13,110,143,0.4)"} strokeWidth="4" />
                <line x1="56" y1="82" x2="72" y2="82" stroke={active ? "#0d6e8f" : "rgba(13,110,143,0.4)"} strokeWidth="4" />
            </svg>
        ),
    },
];

type DbId = string;

// ─── Shared Input Style Helper ────────────────────────────────────────────────

const mkInputStyle = (hasError: boolean) => ({
    background: "#f8fafc",
    border: `1px solid ${hasError ? "rgba(239,68,68,0.5)" : "rgba(0,0,0,0.1)"}`,
    color: "#1e293b",
    caretColor: "#7C6FFF",
});

function InputField({
    label, type = "text", value, onChange, placeholder, onKeyDown, icon, hasError, disabled,
}: {
    label: string; type?: string; value: string; onChange: (v: string) => void;
    placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void;
    icon?: React.ReactNode; hasError: boolean; disabled?: boolean;
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
                    disabled={disabled}
                    className={`w-full rounded-xl text-[13px] outline-none transition-all placeholder:text-muted-foreground/50 ${icon ? "pl-9 pr-3" : "px-3"} py-2.5 disabled:opacity-40 disabled:cursor-not-allowed`}
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

// ─── Provider Card ───────────────────────────────────────────────────────────

function ProviderCard({ provider, active, onClick }: { provider: DbProvider; active: boolean; onClick: () => void }) {
    const isLocked = !!provider.locked;
    return (
        <div className="relative group">
            <button
                onClick={() => !isLocked && onClick()}
                disabled={isLocked}
                className="w-full flex flex-col items-center justify-center gap-1.5 rounded-[12px] py-3 px-1 transition-all duration-200 relative overflow-hidden"
                style={{
                    background: active ? `${provider.color}10` : "transparent",
                    border: active ? `1.5px solid ${provider.color}80` : "1.5px solid rgba(0,0,0,0.06)",
                    boxShadow: active ? `0 2px 12px ${provider.color}20` : "none",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    minHeight: "72px",
                }}
                onMouseEnter={(e) => {
                    if (!active && !isLocked) {
                        e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                        e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!active && !isLocked) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                    }
                }}
            >
                <div className={`transition-all duration-200 ${isLocked ? "opacity-25 grayscale blur-[0.5px]" : active ? "scale-105" : "grayscale-[30%] opacity-70 hover:grayscale-0 hover:opacity-100"}`}>
                    {provider.icon(active || !isLocked)}
                </div>
                <span
                    className={`text-[8.5px] font-bold tracking-[0.12em] ${isLocked ? "opacity-30" : ""}`}
                    style={{ color: active ? provider.color : "#64748B" }}
                >
                    {provider.label.toUpperCase()}
                </span>

                {/* Locked Overlay */}
                {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[0.5px] z-10">
                        <div className="bg-slate-800/90 p-1 rounded-full shadow-sm mb-0.5">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                        <span className="text-[6.5px] font-bold text-slate-600 tracking-wider bg-white/90 px-1 py-0.5 rounded shadow-sm">COMING SOON</span>
                    </div>
                )}
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConnectDbModal({ onClose, onConnected }: ConnectDbModalProps) {
    const { user: authUser } = useAuth();
    const supabase = createClient();

    const [selectedDb, setSelectedDb] = useState<DbId>("postgresql");
    const [connectionType, setConnectionType] = useState<"parameters" | "uri">("parameters");

    const [uri, setUri] = useState("");
    const [host, setHost] = useState("");
    const [port, setPort] = useState("5432");
    const [db_user, setDbUser] = useState("postgres");
    const [password, setPassword] = useState("");
    const [dbname, setDbname] = useState("");

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const hasError = status === "error";

    const sqlProviders = DB_PROVIDERS.filter(p => p.category === "sql");
    const nosqlProviders = DB_PROVIDERS.filter(p => p.category === "nosql");

    const handleProviderSelect = (id: DbId) => {
        setSelectedDb(id);
        const provider = DB_PROVIDERS.find((p) => p.id === id);
        if (provider) {
            setPort(provider.defaultPort);
        }

        // Smart defaults
        if (id === "mysql") {
            setDbUser("root");
            setHost("");
        } else if (id === "postgresql") {
            setDbUser("postgres");
            setHost("");
        } else if (id === "mongodb") {
            setDbUser("admin");
            setHost("");
        } else if (id === "redis") {
            setDbUser("");
            setHost("");
        } else if (id === "sqlite") {
            setHost("");
            setDbUser("");
            setPassword("");
        }

        setStatus("idle");
        setErrorMsg("");
    };

    const currentProvider = DB_PROVIDERS.find((p) => p.id === selectedDb)!;
    const isNoSql = currentProvider.category === "nosql";
    const isSqlite = selectedDb === "sqlite";
    const isRedis = selectedDb === "redis";

    const handleConnect = async () => {
        let url = "";

        if (connectionType === "parameters") {
            if (isSqlite) {
                if (!dbname) {
                    setStatus("error");
                    setErrorMsg("Please provide the SQLite database file path.");
                    return;
                }
                url = `sqlite:///${dbname}`;
            } else if (isRedis) {
                if (!host) {
                    setStatus("error");
                    setErrorMsg("Please provide the Redis host address.");
                    return;
                }
                const portStr = port ? `:${port}` : "";
                const authStr = password ? `:${encodeURIComponent(password)}@` : "";
                url = `redis://${authStr}${host}${portStr}`;
            } else {
                if (!host || !dbname) {
                    setStatus("error");
                    setErrorMsg("Please fill in all required connection fields.");
                    return;
                }
                const portStr = port ? `:${port}` : "";
                if (selectedDb === "mongodb") {
                    const userPass = db_user ? `${encodeURIComponent(db_user)}${password ? `:${encodeURIComponent(password)}` : ""}@` : "";
                    url = `mongodb://${userPass}${host}${portStr}/${dbname}`;
                } else if (selectedDb === "mysql") {
                    url = `mysql://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}${portStr}/${dbname}`;
                } else {
                    url = `postgresql://${encodeURIComponent(db_user)}:${encodeURIComponent(password)}@${host}${portStr}/${dbname}`;
                }
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

                const connName = connectionType === "parameters" ? (dbname || currentProvider.label) : "Main Database";
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

    return (
        /* Backdrop — click intentionally does NOT close the modal */
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
            style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
            }}
        >
            {/* Modal Card — full sheet on mobile, centered card on desktop */}
            <div
                className="relative w-full sm:mx-4 rounded-t-[20px] sm:rounded-[20px] overflow-hidden shadow-2xl animate-modal-in backdrop-blur-xl bg-white/95 text-slate-800 max-h-[95vh] sm:max-h-[85vh] overflow-y-auto"
                style={{
                    maxWidth: 620,
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.1), 0 0 40px rgba(124,111,255,0.06)",
                }}
            >
                {/* Top accent line */}
                <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #7C6FFF 40%, #00C9B1 70%, transparent)" }} />

                {/* ── Header ── */}
                <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 sm:pb-5 flex items-start justify-between border-b border-border/50">
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

                {/* ── Body ── */}
                <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-5 custom-scrollbar">

                    {/* ── Provider Selector: Grouped ── */}
                    <div className="space-y-4">
                        {/* SQL Group */}
                        <div>
                            <div className="flex items-center gap-2 mb-2.5">
                                <span
                                    className="text-[8px] font-extrabold tracking-[0.25em] px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(124,111,255,0.08)", color: "#7C6FFF", border: "1px solid rgba(124,111,255,0.15)" }}
                                >
                                    SQL
                                </span>
                                <div className="flex-1 h-px bg-slate-200/60" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {sqlProviders.map((p) => (
                                    <ProviderCard
                                        key={p.id}
                                        provider={p}
                                        active={selectedDb === p.id}
                                        onClick={() => handleProviderSelect(p.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* NoSQL Group */}
                        <div>
                            <div className="flex items-center gap-2 mb-2.5">
                                <span
                                    className="text-[8px] font-extrabold tracking-[0.25em] px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(0,201,177,0.08)", color: "#00C9B1", border: "1px solid rgba(0,201,177,0.15)" }}
                                >
                                    NOSQL
                                </span>
                                <div className="flex-1 h-px bg-slate-200/60" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {nosqlProviders.map((p) => (
                                    <ProviderCard
                                        key={p.id}
                                        provider={p}
                                        active={selectedDb === p.id}
                                        onClick={() => handleProviderSelect(p.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── NoSQL Coming Soon Banner ── */}
                    {isNoSql && (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl animate-fadein"
                            style={{
                                background: "linear-gradient(135deg, rgba(0,201,177,0.06), rgba(124,111,255,0.06))",
                                border: "1px solid rgba(0,201,177,0.18)",
                            }}
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(0,201,177,0.12)" }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="#00C9B1" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path d="M13 16h-1v-4h-1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[12px] font-semibold text-slate-700">Connection ready · Query support coming soon</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    You can connect and explore schema now. Natural language to {currentProvider.label} queries will be available in future updates.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab Switcher */}
                    <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/50">
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
                            {/* Host + Port (hidden for SQLite) */}
                            {!isSqlite && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <InputField
                                            label="HOST ADDRESS"
                                            value={host}
                                            onChange={setHost}
                                            placeholder={selectedDb === "postgresql" ? "db.project.supabase.co" : selectedDb === "mysql" ? "mysql.railway.app" : selectedDb === "mongodb" ? "cluster0.abc12.mongodb.net" : "redis-host.cloud.redislabs.com"}
                                            hasError={hasError}
                                        />
                                    </div>
                                    <InputField
                                        label="PORT"
                                        value={port}
                                        onChange={setPort}
                                        placeholder={currentProvider.defaultPort}
                                        hasError={hasError}
                                    />
                                </div>
                            )}

                            {/* Username + Password (hidden for SQLite + Redis with no auth) */}
                            {!isSqlite && (
                                <div className={`grid gap-4 ${isRedis ? "grid-cols-1" : "grid-cols-2"}`}>
                                    {!isRedis && (
                                        <InputField
                                            label="USERNAME"
                                            value={db_user}
                                            onChange={setDbUser}
                                            placeholder={selectedDb === "mongodb" ? "admin" : "admin_user"}
                                            icon={<PersonIcon />}
                                            hasError={hasError}
                                        />
                                    )}
                                    <InputField
                                        label={isRedis ? "PASSWORD (OPTIONAL)" : "PASSWORD"}
                                        type="password"
                                        value={password}
                                        onChange={setPassword}
                                        placeholder="••••••••••"
                                        icon={<LockIcon />}
                                        hasError={hasError}
                                    />
                                </div>
                            )}

                            {/* Database Name / File Path */}
                            {!isRedis && (
                                <InputField
                                    label={isSqlite ? "FILE PATH" : selectedDb === "mongodb" ? "DATABASE NAME" : "DATABASE NAME"}
                                    value={dbname}
                                    onChange={setDbname}
                                    placeholder={isSqlite ? "/absolute/path/to/database.db" : selectedDb === "mongodb" ? "my_database" : "production_ledger_v2"}
                                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                                    hasError={hasError}
                                />
                            )}
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
                            isNoSql ? "Schema discovery supported" : "Supports SSL connections",
                            isNoSql ? "Connection health monitoring" : "Connection schema will be indexed",
                        ].map((tip, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00C9B1", boxShadow: "0 0 6px #00C9B1" }} />
                                <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                <div className="px-7 py-5 flex items-center justify-between border-t border-slate-200/50 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentProvider.color }} />
                        <span className="text-[10px] font-semibold tracking-wider" style={{ color: "var(--color-muted-foreground)" }}>
                            {currentProvider.label.toUpperCase()}
                        </span>
                        {isNoSql && (
                            <span
                                className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full ml-1"
                                style={{ background: "rgba(0,201,177,0.1)", color: "#00C9B1", border: "1px solid rgba(0,201,177,0.2)" }}
                            >
                                NOSQL
                            </span>
                        )}
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
