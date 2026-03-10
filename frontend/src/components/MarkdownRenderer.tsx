"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
    content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const components: Components = {
        // ── Headings ───────────────────────────────────────────────
        h1: ({ children }) => (
            <h1 className="text-[22px] font-bold text-white mb-4 mt-6 leading-snug">{children}</h1>
        ),
        h2: ({ children }) => (
            <h2 className="text-[18px] font-semibold text-white mb-3 mt-5 leading-snug">{children}</h2>
        ),
        h3: ({ children }) => (
            <h3 className="text-[16px] font-semibold text-white/90 mb-2 mt-4 leading-snug">{children}</h3>
        ),

        // ── Paragraph ──────────────────────────────────────────────
        p: ({ children }) => (
            <p className="text-[16px] leading-[1.8] text-[#d4d4d8] mb-4 last:mb-0">{children}</p>
        ),

        // ── Bold / Italic ─────────────────────────────────────────
        strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
            <em className="italic text-[#a1a1aa]">{children}</em>
        ),

        // ── Lists ─────────────────────────────────────────────────
        ul: ({ children }) => (
            <ul className="list-none space-y-2 mb-4 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-2 mb-4 text-[#d4d4d8]">{children}</ol>
        ),
        li: ({ children }) => (
            <li className="flex items-start gap-2.5 text-[15px] leading-relaxed text-[#d4d4d8]">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>{children}</span>
            </li>
        ),

        // ── Horizontal Rule ───────────────────────────────────────
        hr: () => <hr className="border-t border-[#27272a] my-5" />,

        // ── Blockquote ────────────────────────────────────────────
        blockquote: ({ children }) => (
            <blockquote className="pl-4 border-l-2 border-indigo-500/50 text-[#a1a1aa] italic my-4 text-[15px]">
                {children}
            </blockquote>
        ),

        // ── Inline Code ───────────────────────────────────────────
        code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match);
            const codeString = String(children).replace(/\n$/, "");

            if (isBlock) {
                return (
                    <div className="my-4 rounded-xl overflow-hidden border border-[#27272a]">
                        {/* Language label bar */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-[#27272a]">
                            <span className="text-[11px] font-mono font-medium text-[#71717a] uppercase tracking-wider">
                                {match![1]}
                            </span>
                            <button
                                onClick={() => navigator.clipboard.writeText(codeString)}
                                className="text-[11px] text-[#71717a] hover:text-white transition-colors flex items-center gap-1"
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
                                background: "#09090b",
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

            // Inline code
            return (
                <code
                    className="px-1.5 py-0.5 rounded-md bg-[#27272a] text-indigo-300 text-[13px] font-mono"
                    {...props}
                >
                    {children}
                </code>
            );
        },

        // ── Table ─────────────────────────────────────────────────
        table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#27272a]">
                <table className="w-full text-[14px] text-left">{children}</table>
            </div>
        ),
        thead: ({ children }) => (
            <thead className="bg-[#18181b] text-[#a1a1aa] uppercase text-[11px] tracking-wider">
                {children}
            </thead>
        ),
        tbody: ({ children }) => (
            <tbody className="divide-y divide-[#27272a]">{children}</tbody>
        ),
        tr: ({ children }) => (
            <tr className="hover:bg-[#18181b] transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
            <th className="px-4 py-3 font-semibold">{children}</th>
        ),
        td: ({ children }) => (
            <td className="px-4 py-3 text-[#d4d4d8]">{children}</td>
        ),
    };

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
        </ReactMarkdown>
    );
}
