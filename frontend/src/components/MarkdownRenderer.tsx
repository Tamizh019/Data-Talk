"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
    content: string;
}

/**
 * Preprocesses LLM output to fix common formatting issues before ReactMarkdown parses it.
 *
 * Problem: LLMs often return bullets as "• item1 • item2 • item3" in a single paragraph.
 * ReactMarkdown treats the entire thing as one <p> tag, so bullets render inline.
 *
 * Fix: Split those inline bullet chars into proper markdown list items on separate lines.
 */
function preprocessContent(raw: string): string {
    // Process line by line
    const lines = raw.split("\n");
    const output: string[] = [];

    for (const line of lines) {
        // Detect lines that contain multiple inline bullets (• or ▸)
        // e.g. "• Item one • Item two • Item three"
        // Split on the bullet character but only when it appears mid-sentence (not at start)
        if (/•/.test(line)) {
            // Split on • to get individual items
            const parts = line.split("•").map(s => s.trim()).filter(Boolean);

            if (parts.length > 1) {
                // Check if the first part is a non-bullet intro phrase (no bullet at start)
                const startsWithBullet = line.trimStart().startsWith("•");

                if (!startsWithBullet && parts.length >= 2) {
                    // First part is intro text (e.g. "Key Observations:"), rest are bullets
                    output.push(parts[0]);
                    output.push(""); // blank line before list
                    for (const item of parts.slice(1)) {
                        if (item) output.push(`- ${item}`);
                    }
                } else {
                    // All parts are bullets
                    for (const item of parts) {
                        if (item) output.push(`- ${item}`);
                    }
                }
                output.push(""); // blank line after list block
                continue;
            }
        }

        // Lines that are already properly formatted bullets (• item) — normalize to markdown
        if (/^\s*•\s+/.test(line)) {
            output.push(line.replace(/^\s*•\s+/, "- "));
            continue;
        }

        output.push(line);
    }

    return output.join("\n");
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const processed = preprocessContent(content);

    const components: Components = {
        // ── Headings ─────────────────────────────────────────────
        h1: ({ children }) => (
            <h1 className="text-[20px] font-bold text-foreground mb-3 mt-5 leading-snug">{children}</h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-[17px] font-semibold text-foreground mb-2.5 mt-4 leading-snug">{children}</h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold text-foreground/90 mb-2 mt-3 leading-snug">{children}</h3>
        ),

        // ── Paragraph — detect structured analyst patterns ──────
        p: ({ children }) => {
            const text = typeof children === "string" ? children : "";

            // Key Insight line — render with accent left border
            if (text.includes("📊") || text.includes("Key Insight")) {
                return (
                    <div
                        className="flex items-start gap-2.5 pl-3 py-2 mb-3 rounded-lg"
                        style={{
                            borderLeft: "3px solid #7C6FFF",
                            background: "rgba(124,111,255,0.06)",
                        }}
                    >
                        <p className="text-[14px] leading-relaxed text-foreground/90 font-medium">{children}</p>
                    </div>
                );
            }

            // Recommendation line — render with green accent
            if (text.includes("💡") || text.includes("Recommendation")) {
                return (
                    <div
                        className="flex items-start gap-2.5 pl-3 py-2 mb-3 rounded-lg"
                        style={{
                            borderLeft: "3px solid #00C9B1",
                            background: "rgba(0,201,177,0.06)",
                        }}
                    >
                        <p className="text-[14px] leading-relaxed text-foreground/90 font-medium">{children}</p>
                    </div>
                );
            }

            return (
                <p className="text-[14px] leading-[1.75] text-foreground/85 mb-3 last:mb-0">{children}</p>
            );
        },

        // ── Bold / Italic ─────────────────────────────────────────
        strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
            <em className="italic text-muted-foreground">{children}</em>
        ),

        // ── Lists — tighter spacing ──────────────────────────────
        ul: ({ children }) => (
            <ul className="list-none space-y-1.5 mb-3 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 mb-3 text-foreground/85">{children}</ol>
        ),
        li: ({ children }) => (
            <li className="flex items-start gap-2 text-[14px] leading-relaxed text-foreground/85">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{children}</span>
            </li>
        ),

        // ── Horizontal Rule ───────────────────────────────────────
        hr: () => <hr className="border-t border-border my-4" />,

        // ── Blockquote ────────────────────────────────────────────
        blockquote: ({ children }) => (
            <blockquote className="pl-4 border-l-2 border-primary/50 text-muted-foreground italic my-3 text-[14px]">
                {children}
            </blockquote>
        ),

        // ── Code Block / Inline Code ──────────────────────────────
        code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match);
            const codeString = String(children).replace(/\n$/, "");

            if (isBlock) {
                return (
                    <div className="my-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(124,111,255,0.20)" }}>
                        <div
                            className="flex items-center justify-between px-4 py-2"
                            style={{ background: "rgba(20,20,35,0.95)", borderBottom: "1px solid rgba(124,111,255,0.15)" }}
                        >
                            <span className="text-[11px] font-mono font-medium text-white/50 uppercase tracking-wider">
                                {match![1]}
                            </span>
                            <button
                                onClick={() => navigator.clipboard.writeText(codeString)}
                                className="text-[11px] text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
                                title="Copy code"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                copy
                            </button>
                        </div>
                        <SyntaxHighlighter
                            style={oneDark}
                            language={match![1]}
                            PreTag="div"
                            customStyle={{
                                margin: 0,
                                padding: "1rem",
                                background: "#0d0d1a",
                                fontSize: "13px",
                                lineHeight: "1.6",
                                borderRadius: 0,
                            }}
                            codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </div>
                );
            }

            return (
                <code
                    className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[13px] font-mono border border-primary/20"
                    {...props}
                >
                    {children}
                </code>
            );
        },

        // ── Markdown Table ────────────────────────────────────────
        table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-border">
                <table className="w-full text-[13px] text-left">{children}</table>
            </div>
        ),
        thead: ({ children }) => (
            <thead className="bg-muted text-muted-foreground uppercase text-[11px] tracking-wider border-b border-border">
                {children}
            </thead>
        ),
        tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
        ),
        tr: ({ children }) => (
            <tr className="hover:bg-muted/50 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
            <th className="px-4 py-2.5 font-semibold text-foreground/80">{children}</th>
        ),
        td: ({ children }) => (
            <td className="px-4 py-2.5 text-foreground/75">{children}</td>
        ),
    };

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {processed}
        </ReactMarkdown>
    );
}
