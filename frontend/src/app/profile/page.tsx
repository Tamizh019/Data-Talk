"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function ProfilePage() {
    const { user, signOut } = useAuth();

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#07070D" }}>
            {/* ── Background: Dot Grid & Bloom ── */}
            <div className="fixed inset-0 dot-grid opacity-20 pointer-events-none z-0" />
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bloom-bg opacity-30 pointer-events-none z-0"
            />

            {/* Header */}
            <header className="h-14 glass-panel border-b border-white/5 flex items-center px-6 z-50 shrink-0 relative">
                <Link
                    href="/chat"
                    className="flex items-center gap-2 text-[12px] font-semibold text-white/70 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Chat
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex justify-center items-start pt-20 px-6 relative z-10">
                <div
                    className="w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden"
                    style={{
                        background: "rgba(13,13,22,0.85)",
                        backdropFilter: "blur(24px)",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                    }}
                >
                    {/* Top Accent Line */}
                    <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #7C6FFF, #00C9B1)" }} />

                    <div className="p-8">
                        <h1 className="text-2xl font-bold text-white mb-8">My Profile</h1>

                        <div className="flex items-center gap-6 mb-10">
                            {/* Avatar */}
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center text-[28px] font-bold text-white border-2 border-white/15 overflow-hidden shadow-2xl shrink-0"
                                style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                            >
                                {user?.user_metadata?.full_name
                                    ? user.user_metadata.full_name.charAt(0).toUpperCase()
                                    : user?.email
                                        ? user.email.charAt(0).toUpperCase()
                                        : "DT"}
                            </div>

                            {/* Info */}
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    {user?.user_metadata?.full_name || user?.user_metadata?.name || "Premium User"}
                                </h2>
                                <p className="text-[14px] text-white/50 mt-1">{user?.email}</p>

                                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active Account
                                </div>
                            </div>
                        </div>

                        {/* Database Connections Section */}
                        <div className="mb-8">
                            <h3 className="text-[13px] font-bold uppercase tracking-widest text-white/40 mb-4 pb-2 border-b border-white/5">
                                My Databases
                            </h3>
                            <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                                <svg className="w-10 h-10 mx-auto text-white/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0v3.75C20.25 20.653 16.556 22.5 12 22.5s-8.25-1.847-8.25-4.125v-3.75" />
                                </svg>
                                <h4 className="text-[14px] font-semibold text-white/80 mb-1">No Saved Connections</h4>
                                <p className="text-[12px] text-white/40">Connect a database in the chat interface to save it to your profile.</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 border-t border-white/5 flex justify-end">
                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Sign Out Everywhere
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
