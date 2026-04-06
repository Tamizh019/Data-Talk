"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* ─── Shared background blobs ─── */
function Background() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
                className="absolute -top-1/4 -left-1/4 w-[700px] h-[700px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(108,95,230,0.14) 0%, transparent 65%)", filter: "blur(70px)" }}
            />
            <div
                className="absolute -bottom-1/4 -right-1/4 w-[700px] h-[700px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(0,201,177,0.14) 0%, transparent 65%)", filter: "blur(70px)" }}
            />
            {/* Grid */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: "linear-gradient(rgba(108,95,230,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(108,95,230,0.06) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />
        </div>
    );
}

/* ─── Left branding panel ─── */
function BrandPanel() {
    return (
        <div
            className="hidden lg:flex flex-col relative overflow-hidden w-[480px] flex-shrink-0"
            style={{
                background: "linear-gradient(155deg, #0F0C29 0%, #1a163d 40%, #0d1f2d 100%)",
            }}
        >
            {/* Blobs */}
            <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(124,111,255,0.3) 0%, transparent 70%)", filter: "blur(60px)" }} />
            <div className="absolute bottom-[-80px] right-[-60px] w-[350px] h-[350px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,201,177,0.25) 0%, transparent 70%)", filter: "blur(60px)" }} />

            {/* Grid lines */}
            <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
            }} />

            <div className="relative z-10 flex flex-col h-full px-14 py-12">
                {/* Logo top */}
                <div className="flex items-center gap-3 mb-auto">
                    <img src="/logo.png" alt="Data-Talk" className="w-9 h-9 object-contain" />
                    <span className="text-white font-bold text-[17px] tracking-tight">Data-Talk</span>
                </div>

                {/* Center quote */}
                <div className="mb-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8" style={{ background: "rgba(124,111,255,0.15)", border: "1px solid rgba(124,111,255,0.25)" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#7C6FFF]" style={{ boxShadow: "0 0 6px #7C6FFF" }} />
                        <span className="text-[11px] font-semibold text-[#b0a8ff] tracking-widest uppercase">AI-Powered Analytics</span>
                    </div>

                    <h2 className="text-[38px] font-bold leading-[1.18] text-white mb-6 tracking-tight">
                        Turn your data<br />
                        <span style={{ background: "linear-gradient(90deg, #7C6FFF, #00C9B1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            into intelligence.
                        </span>
                    </h2>

                    <p className="text-[15px] text-white/50 leading-relaxed max-w-[320px]">
                        Ask questions in plain English. Get instant SQL, charts, and insights from your database — no code required.
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2.5 mt-10">
                        {["Natural Language SQL", "Auto Visualization", "Schema-Aware AI"].map(f => (
                            <div key={f} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium text-white/70" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <svg className="w-3 h-3 text-[#00C9B1]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {f}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom integrations */}
                <div className="mt-auto pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4">Seamlessly Connects To</p>
                    <div className="flex flex-wrap gap-2.5">
                        {[
                            { name: "PostgreSQL", color: "#336791" }, 
                            { name: "MySQL", color: "#F29111" }, 
                            { name: "SQLite", color: "#003B57" }
                        ].map(db => (
                            <div key={db.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/70" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: db.color }} />
                                {db.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Google icon ─── */
function GoogleIcon() {
    return (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

/* ─── GitHub icon ─── */
function GithubIcon() {
    return (
        <svg className="w-4 h-4 text-slate-800 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
    );
}

/* ─── Spinner ─── */
function Spinner() {
    return (
        <svg className="w-4 h-4 animate-spin text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

/* ─────────────────────────────────────
   LOGIN CONTENT
───────────────────────────────────── */
function LoginContent() {
    const { signInWithGoogle, signInWithGithub, signInWithPassword } = useAuth();
    const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | "email" | null>(null);
    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const handleGoogle = async () => { setLoadingProvider("google"); await signInWithGoogle(); };
    const handleGithub = async () => { setLoadingProvider("github"); await signInWithGithub(); };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setLoadingProvider("email");
        try {
            await signInWithPassword(email, password);
            window.location.href = "/";
        } catch (err: any) {
            setLocalError(err.message || "Failed to sign in. Please check your credentials.");
            setLoadingProvider(null);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F7F8FC] relative">
            <Background />
            <BrandPanel />

            {/* ── Right: Form ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-2.5 mb-10">
                    <img src="/logo.png" alt="Data-Talk" className="w-8 h-8 object-contain" />
                    <span className="text-slate-800 font-bold text-[16px] tracking-tight">Data-Talk</span>
                </div>

                <div className="w-full max-w-[400px] animate-fadein">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1.5">Welcome back</h1>
                        <p className="text-[14px] text-slate-500">Sign in to your Data-Talk workspace.</p>
                    </div>

                    {/* Error */}
                    {(error || localError) && (
                        <div className="mb-6 px-4 py-3 rounded-xl text-[13px] font-medium bg-red-50 border border-red-100 text-red-600 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {localError || "Authentication failed. Please try again."}
                        </div>
                    )}

                    {/* OAuth */}
                    <div className="grid grid-cols-2 gap-3 mb-7">
                        <button
                            onClick={handleGoogle}
                            disabled={loadingProvider !== null}
                            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-[12px] bg-white border border-slate-200/80 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                        >
                            {loadingProvider === "google" ? <Spinner /> : <GoogleIcon />}
                            Google
                        </button>
                        <button
                            onClick={handleGithub}
                            disabled={loadingProvider !== null}
                            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-[12px] bg-white border border-slate-200/80 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                        >
                            {loadingProvider === "github" ? <Spinner /> : <GithubIcon />}
                            GitHub
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-7">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleEmailLogin}>
                        <div>
                            <label className="block text-[12px] font-semibold text-slate-600 mb-2">Email</label>
                            <input
                                type="email"
                                autoComplete="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-[12px] bg-white border border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5FE6] focus:ring-[3px] focus:ring-[#6C5FE6]/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[12px] font-semibold text-slate-600">Password</label>
                                <a href="#" className="text-[12px] font-medium text-[#6C5FE6] hover:text-[#5040d0] transition-colors">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPw ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 pr-12 rounded-[12px] bg-white border border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5FE6] focus:ring-[3px] focus:ring-[#6C5FE6]/10 transition-all shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                >
                                    {showPw ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loadingProvider !== null || !email || !password}
                            className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] mt-1 shadow-lg shadow-[#6C5FE6]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ background: "linear-gradient(135deg, #6C5FE6 0%, #4B3BFF 100%)" }}
                        >
                            {loadingProvider === "email" && <Spinner />}
                            {loadingProvider === "email" ? "Signing in..." : "Sign in to Data-Talk"}
                        </button>
                    </form>

                    {/* Footer link */}
                    <p className="text-center text-[13px] text-slate-500 mt-8">
                        Don't have an account?{" "}
                        <Link href="/signup" className="font-semibold text-[#6C5FE6] hover:text-[#5040d0] transition-colors">
                            Create one
                        </Link>
                    </p>
                </div>

                {/* Bottom */}
                <p className="absolute bottom-6 text-[11px] text-slate-400 tracking-wide">
                    © 2026 Data-Talk Intelligence. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC]">
                <div className="w-8 h-8 border-2 border-[#6C5FE6] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
