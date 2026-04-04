"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";

function LoginContent() {
    const { signInWithGoogle, signInWithGithub, isLoading } = useAuth();
    const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const handleGoogle = async () => {
        setLoadingProvider("google");
        await signInWithGoogle();
    };

    const handleGithub = async () => {
        setLoadingProvider("github");
        await signInWithGithub();
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: "#07070D" }}
        >
            {/* ── Background: Dot Grid ── */}
            <div className="fixed inset-0 dot-grid opacity-20 pointer-events-none z-0" />

            {/* ── Background: Bloom ── */}
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none z-0"
                style={{
                    background: "radial-gradient(ellipse at center, rgba(124,111,255,0.12) 0%, rgba(0,201,177,0.06) 50%, transparent 75%)",
                    filter: "blur(60px)",
                }}
            />

            {/* ── Card ── */}
            <div
                className="relative z-10 w-full max-w-[420px] mx-4"
                style={{
                    background: "rgba(13,13,22,0.85)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "24px",
                    backdropFilter: "blur(30px)",
                    boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
                }}
            >
                {/* Top glow line */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(124,111,255,0.6), transparent)" }}
                />

                <div className="px-8 pt-10 pb-8">
                    {/* Logo + Brand */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10"
                            style={{
                                background: "linear-gradient(135deg, #7C6FFF, #00C9B1)",
                                boxShadow: "0 0 30px rgba(124,111,255,0.35)",
                            }}
                        >
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <h1 className="text-[22px] font-bold text-white tracking-tight">Data-Talk</h1>
                            <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Autonomous Database Intelligence
                            </p>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="mb-4 px-4 py-3 rounded-xl text-[12px]"
                            style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                color: "#f87171",
                            }}
                        >
                            Authentication failed. Please try again.
                        </div>
                    )}

                    {/* OAuth Buttons */}
                    <div className="space-y-3 mb-6 mx-auto" style={{ maxWidth: "320px" }}>
                        {/* Google */}
                        <button
                            onClick={handleGoogle}
                            disabled={loadingProvider !== null}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: loadingProvider === "google" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >
                            {loadingProvider === "google" ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            {loadingProvider === "google" ? "Redirecting..." : "Continue with Google"}
                        </button>

                        {/* GitHub */}
                        <button
                            onClick={handleGithub}
                            disabled={loadingProvider !== null}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: loadingProvider === "github" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        >
                            {loadingProvider === "github" ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            )}
                            {loadingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}
                        </button>
                    </div>

                    {/* Divider with label */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                            OR CONTINUE WITH EMAIL
                        </span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                    </div>

                    {/* Email and Password form */}
                    <form className="space-y-4 mb-3" onSubmit={(e) => e.preventDefault()}>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                placeholder="Email address"
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C6FFF]/50 focus:ring-1 focus:ring-[#7C6FFF]/50 transition-all font-medium"
                                style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#7C6FFF]/50 focus:ring-1 focus:ring-[#7C6FFF]/50 transition-all font-medium"
                                style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}
                            />
                        </div>
                        <div className="flex justify-end pt-1">
                            <a href="#" className="text-[11px] font-semibold transition-colors hover:text-[#00e0c5]" style={{ color: "#00C9B1" }}>
                                Forgot password?
                            </a>
                        </div>
                    </form>

                    <button
                        className="w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all hover:opacity-90 active:scale-[0.99]"
                        style={{
                            background: "#7C6FFF",
                        }}
                    >
                        Sign In
                    </button>

                    {/* Footer note */}
                    <p className="text-center text-[11px] mt-6" style={{ color: "rgba(255,255,255,0.2)" }}>
                        By continuing, you agree to our Terms of Service.<br />
                        Your data is secured with row-level policies.
                    </p>
                </div>
            </div>

            {/* Bottom badge */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.15)" }}>
                    
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#07070D]">
                <div className="w-8 h-8 border-2 border-[#7C6FFF] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
