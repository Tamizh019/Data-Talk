"use client";
import { Source } from "@/lib/api";

interface SourceCardProps {
    sources: Source[];
}

export default function SourceCard({ sources }: SourceCardProps) {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 pl-0.5 opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                </svg>
                <span className="text-[11px] font-bold uppercase tracking-wider">
                    References
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {sources.map((src, i) => {
                    const isHigh = src.score >= 0.75;
                    const isMed = src.score >= 0.6;

                    return (
                        <div
                            key={i}
                            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#18181b] pl-3 pr-2 py-1 hover:bg-[#27272a] transition-all cursor-default group"
                            title={src.text_preview}
                        >
                            <span className="text-[12px] font-medium text-white/80 max-w-[120px] truncate">
                                {src.source}
                            </span>
                            <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isHigh ? "bg-emerald-500/10 text-emerald-400" :
                                        isMed ? "bg-amber-500/10 text-amber-400" :
                                            "bg-red-500/10 text-red-400"
                                    }`}
                            >
                                {Math.round(src.score * 100)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
