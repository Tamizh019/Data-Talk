"use client";

import { useState } from "react";
import { CheckCircle, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SQLDisplayProps {
    sql: string;
    attempts?: number;
}

export default function SQLDisplay({ sql, attempts = 1 }: SQLDisplayProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="overflow-hidden rounded-xl mt-3 shadow-lg"
            style={{
                background: "rgba(7, 7, 13, 0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.07)",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between py-2.5 px-4"
                style={{
                    background: "rgba(13, 13, 22, 0.9)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-center gap-2.5">
                    {/* DB columns icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C6FFF" strokeWidth="2">
                        <rect x="3" y="3" width="4" height="18" /><rect x="10" y="3" width="4" height="18" /><rect x="17" y="3" width="4" height="18" />
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#7C6FFF" }}>
                        SQL Logic
                    </span>
                </div>

                <div className="flex items-center gap-2.5">
                    {attempts > 1 && (
                        <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.35)",
                            }}
                        >
                            {attempts} attempts
                        </span>
                    )}
                    <span
                        className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                            background: "rgba(16,185,129,0.1)",
                            border: "1px solid rgba(16,185,129,0.2)",
                            color: "#34d399",
                        }}
                    >
                        <CheckCircle className="w-3 h-3" />
                        Query Executed
                    </span>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
                        style={{
                            background: copied ? "rgba(0,201,177,0.15)" : "rgba(255,255,255,0.06)",
                            color: copied ? "#00C9B1" : "rgba(255,255,255,0.5)",
                            border: `1px solid ${copied ? "rgba(0,201,177,0.3)" : "rgba(255,255,255,0.08)"}`,
                        }}
                    >
                        <Copy className="w-3 h-3" />
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            </div>

            {/* Code */}
            <SyntaxHighlighter
                language="sql"
                style={oneDark}
                customStyle={{
                    margin: 0,
                    padding: "1rem 1.25rem",
                    background: "transparent",
                    fontSize: "13px",
                    lineHeight: "1.65",
                }}
                codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
            >
                {sql}
            </SyntaxHighlighter>
        </div>
    );
}
