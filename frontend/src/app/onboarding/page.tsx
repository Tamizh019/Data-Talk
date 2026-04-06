"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

/* ─── Animated background ─── */
function Background() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div
                className="absolute -top-1/3 -left-1/4 w-[800px] h-[800px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(108,95,230,0.12) 0%, transparent 65%)", filter: "blur(80px)" }}
            />
            <div
                className="absolute -bottom-1/3 -right-1/4 w-[800px] h-[800px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(0,201,177,0.10) 0%, transparent 65%)", filter: "blur(80px)" }}
            />
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: "linear-gradient(rgba(108,95,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(108,95,230,0.04) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />
        </div>
    );
}

function Spinner() {
    return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

/* ─── Animated checkmark for welcome screen ─── */
function CheckCircle() {
    return (
        <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="url(#cg)" strokeWidth="2" />
            <path
                d="M20 32l8 8 16-16"
                stroke="url(#cg2)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7C6FFF" />
                    <stop offset="1" stopColor="#00C9B1" />
                </linearGradient>
                <linearGradient id="cg2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7C6FFF" />
                    <stop offset="1" stopColor="#00C9B1" />
                </linearGradient>
            </defs>
        </svg>
    );
}

/* 
 * Single-page onboarding:
 * - OAuth users: Step 1 = collect display name + password, Step 2 = welcome
 * - Password-signup users (already have name):  Skip to welcome directly
 */
export default function OnboardingPage() {
    const { user, updateProfile, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // ── Step state: null = "not yet resolved" (shows spinner) ────────────
    const [step, setStep] = useState<"profile" | "welcome" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── Smart routing: runs ONLY after auth has finished loading ─────────
    useEffect(() => {
        // Still waiting for Supabase session — do nothing
        if (authLoading) return;

        // Not logged in at all → go to login
        if (!user) {
            router.replace("/login");
            return;
        }

        // Already completed onboarding → go straight to chat
        if (user.user_metadata?.onboarding_complete === true) {
            router.replace("/chat");
            return;
        }

        // Determine: is this a Google/GitHub OAuth user?
        const provider = user.app_metadata?.provider;
        const isOAuthUser = provider === "google" || provider === "github";

        if (isOAuthUser) {
            // Always force OAuth users to set a password (profile step)
            setStep("profile");
            // Pre-fill name from what Google/GitHub gave us so user can confirm/edit
            const googleName = user.user_metadata?.full_name || user.user_metadata?.name || "";
            setDisplayName(googleName);
        } else {
            // Manual signup users: password already set, just show welcome
            const firstName = user.user_metadata?.first_name || "";
            const lastName = user.user_metadata?.last_name || "";
            setDisplayName(`${firstName} ${lastName}`.trim());
            setStep("welcome");
        }
    }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

    // Derive display name for welcome screen
    const meta = user?.user_metadata || {};
    const firstName =
        displayName.split(" ")[0] ||
        meta.first_name ||
        (meta.full_name ? meta.full_name.split(" ")[0] : null) ||
        (meta.name ? meta.name.split(" ")[0] : null) ||
        "there";


    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!displayName.trim()) {
            setError("Please enter your name.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }

        setLoading(true);
        try {
            const { createClient } = await import("@/lib/supabase");
            const supabase = createClient();

            // Update password
            const { error: pwError } = await supabase.auth.updateUser({ password });
            if (pwError) throw pwError;

            // Save name and flag
            await updateProfile({
                full_name: displayName.trim(),
                onboarding_complete: true,
            });

            setStep("welcome");
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleWelcomeDone = async () => {
        // Mark onboarding complete for password-signup users too
        setLoading(true);
        try {
            await updateProfile({ onboarding_complete: true });
        } catch { }
        router.push("/chat");
    };


    // Show a full-page spinner while auth resolves or while we're determining the step
    if (authLoading || step === null) {
        return (
            <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
                <Background />
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="url(#sg)" strokeWidth="3" />
                        <path className="opacity-80" fill="url(#sg2)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        <defs>
                            <linearGradient id="sg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#7C6FFF"/><stop offset="1" stopColor="#00C9B1"/>
                            </linearGradient>
                            <linearGradient id="sg2" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#7C6FFF"/><stop offset="1" stopColor="#00C9B1"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    <span className="text-[13px] text-slate-400 font-medium tracking-wide">Setting up your workspace…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center px-4 relative">
            <Background />


            <div
                className="relative z-10 w-full max-w-[440px] rounded-[24px] overflow-hidden"
                style={{
                    background: "rgba(255,255,255,0.95)",
                    boxShadow: "0 20px 60px rgba(108,95,230,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(108,95,230,0.12)",
                    backdropFilter: "blur(20px)",
                }}
            >
                {/* Header band */}
                <div
                    className="h-1.5 w-full"
                    style={{ background: "linear-gradient(90deg, #7C6FFF 0%, #00C9B1 100%)" }}
                />

                <div className="px-10 py-10">
                    {step === "profile" ? (
                        /* ── PROFILE COLLECTION STEP ── */
                        <>
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-5">
                                    <img src="/logo.png" alt="Data-Talk" className="w-8 h-8 object-contain" />
                                    <span className="text-slate-800 font-bold text-[15px] tracking-tight">Data-Talk</span>
                                </div>
                                <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1.5 leading-tight">
                                    Let's set up your{" "}
                                    <span style={{ background: "linear-gradient(90deg, #7C6FFF, #00C9B1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                        profile
                                    </span>
                                </h1>
                                <p className="text-[14px] text-slate-500 leading-relaxed">
                                    You signed in with {user?.app_metadata?.provider === "google" ? "Google" : "GitHub"}. 
                                    {displayName ? " Confirm your name" : " Add a name"} and create a password to secure your account. 
                                    <br/><span className="text-[12px] opacity-80 mt-1 inline-block">This also allows you to log in with your email and password in the future!</span>
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 px-4 py-3 rounded-xl text-[13px] font-medium bg-red-50 border border-red-100 text-red-600 flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleProfileSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-2">Your name</label>
                                    <input
                                        type="text"
                                        autoComplete="name"
                                        placeholder="e.g. Alex Johnson"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-[12px] bg-white border border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5FE6] focus:ring-[3px] focus:ring-[#6C5FE6]/10 transition-all shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-2">Create a password</label>
                                    <div className="relative">
                                        <input
                                            type={showPw ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Min. 8 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 pr-12 rounded-[12px] bg-white border border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5FE6] focus:ring-[3px] focus:ring-[#6C5FE6]/10 transition-all shadow-sm"
                                        />
                                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors">
                                            {showPw
                                                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                        </button>
                                    </div>
                                    {/* Password strength bar */}
                                    {password.length > 0 && (
                                        <div className="mt-2 flex gap-1">
                                            {[2, 5, 8].map((threshold, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 h-1 rounded-full transition-all"
                                                    style={{
                                                        background: password.length >= threshold
                                                            ? i === 0 ? "#f87171" : i === 1 ? "#fbbf24" : "#34d399"
                                                            : "#e2e8f0"
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-2">Confirm password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Re-enter password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 pr-12 rounded-[12px] bg-white border border-slate-200 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6C5FE6] focus:ring-[3px] focus:ring-[#6C5FE6]/10 transition-all shadow-sm"
                                        />
                                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors">
                                            {showConfirm
                                                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                        </button>
                                    </div>
                                    {confirmPassword.length > 0 && password !== confirmPassword && (
                                        <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            Passwords don't match
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !displayName.trim() || password.length < 8 || password !== confirmPassword}
                                    className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] mt-2 shadow-lg shadow-[#6C5FE6]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg, #6C5FE6 0%, #4B3BFF 100%)" }}
                                >
                                    {loading && <Spinner />}
                                    {loading ? "Saving..." : "Continue"}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ── WELCOME STEP ── */
                        <div className="flex flex-col items-center text-center py-4">
                            {/* Animated icon */}
                            <div className="mb-6 animate-bounce-slow">
                                <CheckCircle />
                            </div>

                            <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-2 leading-tight">
                                Welcome,{" "}
                                <span style={{ background: "linear-gradient(90deg, #7C6FFF, #00C9B1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                    {firstName}!
                                </span>
                            </h1>
                            <p className="text-[15px] text-slate-500 leading-relaxed max-w-[300px] mb-8">
                                Your Data-Talk workspace is ready. Ask questions, explore your data, and turn insights into action.
                            </p>

                            {/* Feature highlights */}
                            <div className="w-full space-y-3 mb-8">
                                {[
                                    { emoji: "💬", title: "Ask in plain English", desc: "No SQL knowledge needed" },
                                    { emoji: "📊", title: "Auto-generate charts", desc: "Visualize results instantly" },
                                    { emoji: "🔍", title: "Schema-aware AI", desc: "Understands your database structure" },
                                ].map(f => (
                                    <div
                                        key={f.title}
                                        className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-left"
                                        style={{ background: "rgba(108,95,230,0.04)", border: "1px solid rgba(108,95,230,0.08)" }}
                                    >
                                        <span className="text-[20px]">{f.emoji}</span>
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-800">{f.title}</p>
                                            <p className="text-[11px] text-slate-500">{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleWelcomeDone}
                                disabled={loading}
                                className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-[#6C5FE6]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg, #6C5FE6 0%, #4B3BFF 100%)" }}
                            >
                                {loading && <Spinner />}
                                {loading ? "Opening workspace..." : "Go to my workspace →"}
                            </button>

                            <p className="text-[11px] text-slate-400 mt-4">
                                You can update your name and settings from your profile anytime.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating ring accents */}
            <div
                className="fixed bottom-20 left-10 w-32 h-32 rounded-full pointer-events-none"
                style={{ border: "1px solid rgba(124,111,255,0.12)", animation: "spin 20s linear infinite" }}
            />
            <div
                className="fixed top-20 right-10 w-20 h-20 rounded-full pointer-events-none"
                style={{ border: "1px solid rgba(0,201,177,0.12)", animation: "spin 15s linear infinite reverse" }}
            />

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
