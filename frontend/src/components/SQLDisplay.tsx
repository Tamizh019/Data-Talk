"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Copy, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { explainSqlApi } from "@/lib/api";

interface SQLDisplayProps {
    sql: string;
    attempts?: number;
}

// ── SQL Formatter ─────────────────────────────────────────────────────────────
// Breaks a flat SQL string into a properly indented, keyword-per-line structure
function formatSQL(raw: string): string {
    if (!raw) return raw;

    // Already multi-line (e.g. subqueries from agent) — just normalise indentation
    const alreadyFormatted = raw.trim().split("\n").length > 3;

    // Top-level keywords that go on their own line (not indented)
    const TOP_KEYWORDS = [
        "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING",
        "LIMIT", "OFFSET", "UNION ALL", "UNION", "EXCEPT", "INTERSECT",
        "WITH", "INSERT INTO", "UPDATE", "DELETE FROM", "SET", "VALUES",
    ];

    // JOIN types go on their own line
    const JOIN_KEYWORDS = [
        "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN",
        "CROSS JOIN", "FULL OUTER JOIN", "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "JOIN",
    ];

    if (alreadyFormatted) return raw.trim();

    // Collapse whitespace for consistent parsing
    let sql = raw.replace(/\s+/g, " ").trim();

    // Build regex that splits at top-level keyword boundaries
    const allTopKeywords = [...TOP_KEYWORDS, ...JOIN_KEYWORDS];
    // Sort by length descending so longer matches (e.g. "GROUP BY") take priority over "GROUP"
    const sorted = allTopKeywords.sort((a, b) => b.length - a.length);
    const pattern = new RegExp(
        `\\b(${sorted.map(k => k.replace(/ /g, "\\s+")).join("|")})\\b`,
        "gi"
    );

    // Split into tokens: keyword | content
    const tokens: { type: "keyword" | "content"; text: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(sql)) !== null) {
        const before = sql.slice(lastIndex, match.index).trim();
        if (before) tokens.push({ type: "content", text: before });
        tokens.push({ type: "keyword", text: match[0].toUpperCase() });
        lastIndex = match.index + match[0].length;
    }
    const remaining = sql.slice(lastIndex).trim();
    if (remaining) tokens.push({ type: "content", text: remaining });

    // Build formatted output
    const lines: string[] = [];
    const INDENT = "    "; // 4 spaces

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const next = tokens[i + 1];

        if (token.type === "keyword") {
            const content = next?.type === "content" ? next.text : "";

            if (token.text === "SELECT") {
                const cols = splitColumns(content);
                if (cols.length <= 3) {
                    lines.push(`${token.text} ${content}`);
                } else {
                    lines.push(`${token.text}`);
                    cols.forEach((col, ci) => {
                        const comma = ci < cols.length - 1 ? "," : "";
                        lines.push(`${INDENT}${col.trim()}${comma}`);
                    });
                }
                if (next?.type === "content") i++; 
            } else if (token.text === "WHERE") {
                lines.push(`${token.text} ${content}`);
                if (next?.type === "content") i++;
            } else {
                lines.push(`${token.text}${content ? " " + content : ""}`);
                if (next?.type === "content") i++;
            }
        } else {
            lines.push(token.text);
        }
    }

    return lines.join("\n");
}

function splitColumns(s: string): string[] {
    const cols: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of s) {
        if (ch === "(") { depth++; current += ch; }
        else if (ch === ")") { depth--; current += ch; }
        else if (ch === "," && depth === 0) { cols.push(current.trim()); current = ""; }
        else { current += ch; }
    }
    if (current.trim()) cols.push(current.trim());
    return cols;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SQLDisplay({ sql, attempts = 1 }: SQLDisplayProps) {
    const [copied, setCopied] = useState(false);
    const [isExplaining, setIsExplaining] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [showExplanation, setShowExplanation] = useState(true);
    const formatted = formatSQL(sql);

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-fetch explanation when SQL is available
    useEffect(() => {
        if (!sql) return;
        setIsExplaining(true);
        setExplanation(null);
        setShowExplanation(true);
        explainSqlApi(sql)
            .then(setExplanation)
            .catch(() => setExplanation("Failed to generate explanation."))
            .finally(() => setIsExplaining(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sql]);

    return (
        <div
            className="overflow-hidden rounded-xl mt-3 shadow-lg max-w-full"
            style={{
                background: "var(--code-bg)",
                border: "1px solid rgba(124,111,255,0.20)",
                overflowX: "auto",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between py-2.5 px-4"
                style={{
                    background: "rgba(20, 20, 35, 0.95)",
                    borderBottom: "1px solid rgba(124,111,255,0.15)",
                }}
            >
                <div className="flex items-center gap-2.5">
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
                                background: "rgba(255,255,255,0.07)",
                                border: "1px solid rgba(255,255,255,0.10)",
                                color: "rgba(255,255,255,0.45)",
                            }}
                        >
                            {attempts} attempts
                        </span>
                    )}
                    <span
                        className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                            background: "rgba(16,185,129,0.12)",
                            border: "1px solid rgba(16,185,129,0.25)",
                            color: "#34d399",
                        }}
                    >
                        <CheckCircle className="w-3 h-3" />
                        Query Executed
                    </span>
                    {/* Explain toggle button */}
                    <button
                        onClick={() => setShowExplanation(p => !p)}
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all"
                        style={{
                            background: showExplanation ? "rgba(124,111,255,0.15)" : "rgba(255,255,255,0.07)",
                            color: showExplanation ? "#7C6FFF" : "rgba(255,255,255,0.55)",
                            border: `1px solid ${showExplanation ? "rgba(124,111,255,0.35)" : "rgba(255,255,255,0.10)"}`,
                        }}
                    >
                        <Sparkles className="w-3 h-3" />
                        Explain
                        {showExplanation
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
                        style={{
                            background: copied ? "rgba(0,201,177,0.15)" : "rgba(255,255,255,0.07)",
                            color: copied ? "#00C9B1" : "rgba(255,255,255,0.55)",
                            border: `1px solid ${copied ? "rgba(0,201,177,0.35)" : "rgba(255,255,255,0.10)"}`,
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
                    lineHeight: "1.75",
                    whiteSpace: "pre-wrap",
                }}
                codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
            >
                {formatted}
            </SyntaxHighlighter>

            {/* Explanation Panel — visible by default, user can toggle */}
            {showExplanation && (
                <div
                    className="border-t animate-fadein"
                    style={{
                        borderColor: "rgba(124,111,255,0.20)",
                        background: "linear-gradient(135deg, rgba(124,111,255,0.07) 0%, rgba(0,201,177,0.04) 100%)",
                    }}
                >
                    {/* Panel header */}
                    <div
                        className="flex items-center gap-2 px-4 pt-3 pb-2"
                        style={{ borderBottom: "1px solid rgba(124,111,255,0.10)" }}
                    >
                        <div
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                            style={{ background: "rgba(124,111,255,0.18)", color: "#7C6FFF" }}
                        >
                            <Sparkles className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "#7C6FFF" }}>
                            Query Explanation
                        </span>
                    </div>

                    {/* Panel body */}
                    <div className="px-4 py-3">
                        {isExplaining ? (
                            <div className="flex flex-col gap-2">
                                {["w-3/4", "w-full", "w-5/6"].map((w, i) => (
                                    <div
                                        key={i}
                                        className={`h-3 rounded-full animate-pulse ${w}`}
                                        style={{ background: "rgba(124,111,255,0.15)", animationDelay: `${i * 120}ms` }}
                                    />
                                ))}
                            </div>
                        ) : explanation ? (
                            <ul className="flex flex-col gap-2">
                                {explanation
                                    .split("\n")
                                    .map(line => line.trim())
                                    .filter(line => line.length > 0)
                                    .map((line, i) => {
                                        // Strip leading bullets/dashes/dots the AI may add
                                        const clean = line.replace(/^[•\-\*→]+\s*/, "").trim();
                                        return (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <span
                                                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{ background: "#7C6FFF", opacity: 0.7 }}
                                                />
                                                <span
                                                    className="text-[13px] leading-relaxed"
                                                    style={{ color: "rgba(255,255,255,0.82)" }}
                                                >
                                                    {clean}
                                                </span>
                                            </li>
                                        );
                                    })
                                }
                            </ul>
                        ) : (
                            <p className="text-[12px] italic" style={{ color: "rgba(255,255,255,0.35)" }}>
                                No explanation available.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
