"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <Card className="bg-zinc-950 border-zinc-800 overflow-hidden shadow-sm mt-3">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 bg-zinc-900/80 border-b border-zinc-800 space-y-0">
                <div className="flex items-center gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                        <rect x="3" y="3" width="4" height="18" /><rect x="10" y="3" width="4" height="18" />
                        <rect x="17" y="3" width="4" height="18" />
                    </svg>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        SQL Logic
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {attempts > 1 && (
                        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800 bg-transparent px-2 py-0.5 rounded-md">
                            {attempts} attempts
                        </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800 bg-zinc-900/50 px-2 py-0.5 rounded-md gap-1.5 hidden sm:flex">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        Query Executed
                    </Badge>
                    <button
                        onClick={handleCopy}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 text-[11px] font-medium ml-1 bg-zinc-800/50 hover:bg-zinc-800 px-2.5 py-1 rounded-md"
                    >
                        <Copy className="w-3 h-3" />
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <SyntaxHighlighter
                    language="sql"
                    style={oneDark}
                    customStyle={{
                        margin: 0,
                        padding: "1rem 1.25rem",
                        background: "transparent",
                        fontSize: "13px",
                        lineHeight: "1.6",
                    }}
                    codeTagProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
                >
                    {sql}
                </SyntaxHighlighter>
            </CardContent>
        </Card>
    );
}
