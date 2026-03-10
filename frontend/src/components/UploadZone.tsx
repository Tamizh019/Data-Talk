"use client";

import { useCallback, useState } from "react";
import { ingestPDF, IngestResponse } from "@/lib/api";

interface UploadZoneProps {
    onSuccess: (result: IngestResponse) => void;
}

export default function UploadZone({ onSuccess }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    const handleFile = useCallback(
        async (file: File) => {
            if (!file.name.endsWith(".pdf")) {
                setStatus({ type: "error", msg: "Only PDF files are supported." });
                return;
            }
            setStatus(null);
            setIsUploading(true);
            try {
                const result = await ingestPDF(file);
                setStatus({ type: "success", msg: `${result.details.chunks} chunks indexed` });
                onSuccess(result);
            } catch (e: any) {
                setStatus({ type: "error", msg: e.message || "Upload failed." });
            } finally {
                setIsUploading(false);
            }
        },
        [onSuccess]
    );

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    return (
        <div>
            <label
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all duration-200 ${isDragging
                        ? "border-indigo-500/60 bg-indigo-500/[0.08]"
                        : isUploading
                            ? "border-[#27272a] bg-[#18181b] cursor-wait"
                            : "border-[#27272a] bg-[#18181b] hover:border-indigo-500/40 hover:bg-[#1f1f23]"
                    }`}
            >
                <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    disabled={isUploading}
                />

                {isUploading ? (
                    <>
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[13px] text-[#a1a1aa]">Processing PDF…</p>
                    </>
                ) : (
                    <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#52525b]">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <div className="text-center">
                            <p className="text-[13px] text-[#a1a1aa]">
                                Drop PDF or <span className="text-indigo-400 font-medium">browse</span>
                            </p>
                            <p className="text-[11px] text-[#52525b] mt-1">Max 50MB</p>
                        </div>
                    </>
                )}
            </label>

            {status && (
                <div className={`mt-3 px-4 py-3 rounded-lg text-[12px] font-medium ${status.type === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                    {status.type === "success" ? "✓ " : "✗ "}{status.msg}
                </div>
            )}
        </div>
    );
}
