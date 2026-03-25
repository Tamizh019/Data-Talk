"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function ProfilePage() {
    const { user, signOut, updateProfile } = useAuth();
    
    // Form and UI States
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: "",
        job_title: "",
        company: "",
        department: "",
        bio: ""
    });

    // Populate data when user object loads
    useEffect(() => {
        if (user?.user_metadata) {
            setFormData({
                full_name: user.user_metadata.full_name || user.user_metadata.name || "",
                job_title: user.user_metadata.job_title || "",
                company: user.user_metadata.company || "",
                department: user.user_metadata.department || "",
                bio: user.user_metadata.bio || ""
            });
        }
    }, [user]);

    const handleSave = async () => {
        setIsLoading(true);
        setIsSuccess(false);
        try {
            await updateProfile(formData);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);
            setIsEditing(false);
        } catch (err) {
            console.error("Profile update failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

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
            <main className="flex-1 overflow-y-auto pt-10 pb-20 px-6 relative z-10 w-full">
                <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
                    
                    {/* LEFT COLUMN: Identity & Databases */}
                    <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-6">
                        
                        {/* Profile Summary Card */}
                        <div
                            className="rounded-2xl border border-white/10 overflow-hidden"
                            style={{
                                background: "rgba(13,13,22,0.85)",
                                backdropFilter: "blur(24px)",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                            }}
                        >
                            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #7C6FFF, #00C9B1)" }} />
                            
                            <div className="p-8 flex flex-col items-center text-center">
                                <div
                                    className="w-28 h-28 rounded-full flex items-center justify-center text-[36px] font-bold text-white border-2 border-white/10 overflow-hidden shadow-2xl mb-5"
                                    style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                                >
                                    {formData.full_name
                                        ? formData.full_name.charAt(0).toUpperCase()
                                        : user?.email
                                            ? user.email.charAt(0).toUpperCase()
                                            : "DT"}
                                </div>
                                
                                <h1 className="text-xl font-bold text-white mb-1">
                                    {formData.full_name || "Premium User"}
                                </h1>
                                <p className="text-[13px] text-white/50 mb-4">{user?.email}</p>

                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 mb-8">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active Account
                                </div>

                                <button
                                    onClick={signOut}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>

                        {/* Database Connections Card */}
                        <div
                            className="rounded-2xl border border-white/10 p-6"
                            style={{ background: "rgba(13,13,22,0.85)", backdropFilter: "blur(24px)" }}
                        >
                            <h3 className="text-[12px] font-bold uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                                My Databases
                            </h3>
                            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                                <h4 className="text-[13px] font-semibold text-white/80 mb-1">No Saved Connections</h4>
                                <p className="text-[11px] text-white/40 leading-relaxed">
                                    Connect a database in the chat interface to persist it securely here.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Profile Details Form */}
                    <div
                        className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
                        style={{
                            background: "rgba(13,13,22,0.85)",
                            backdropFilter: "blur(24px)",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                        }}
                    >
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Profile Details</h2>
                            {isSuccess && (
                                <span className="text-emerald-400 text-sm font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                    Saved
                                </span>
                            )}
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white/70 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        <div className="p-8 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Full Name */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[12px] font-semibold uppercase tracking-wider text-white/50">Full Name</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.full_name}
                                        onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#7C6FFF] focus:ring-1 focus:ring-[#7C6FFF] transition-all disabled:opacity-50"
                                        placeholder="John Doe"
                                    />
                                </div>

                                {/* Job Title */}
                                <div className="space-y-2">
                                    <label className="text-[12px] font-semibold uppercase tracking-wider text-white/50">Job Title / Role</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.job_title}
                                        onChange={(e) => setFormData(p => ({ ...p, job_title: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#7C6FFF] focus:ring-1 focus:ring-[#7C6FFF] transition-all disabled:opacity-50"
                                        placeholder="e.g. Data Analyst"
                                    />
                                </div>

                                {/* Department */}
                                <div className="space-y-2">
                                    <label className="text-[12px] font-semibold uppercase tracking-wider text-white/50">Department</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.department}
                                        onChange={(e) => setFormData(p => ({ ...p, department: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#7C6FFF] focus:ring-1 focus:ring-[#7C6FFF] transition-all disabled:opacity-50"
                                        placeholder="e.g. Operations"
                                    />
                                </div>

                                {/* Company */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[12px] font-semibold uppercase tracking-wider text-white/50">Company / Organization</label>
                                    <input
                                        type="text"
                                        disabled={!isEditing}
                                        value={formData.company}
                                        onChange={(e) => setFormData(p => ({ ...p, company: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#7C6FFF] focus:ring-1 focus:ring-[#7C6FFF] transition-all disabled:opacity-50"
                                        placeholder="Acme Corp"
                                    />
                                </div>

                                {/* Bio */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[12px] font-semibold uppercase tracking-wider text-white/50">Professional Bio</label>
                                    <textarea
                                        disabled={!isEditing}
                                        value={formData.bio}
                                        onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#7C6FFF] focus:ring-1 focus:ring-[#7C6FFF] transition-all disabled:opacity-50 resize-none"
                                        placeholder="Tell us a bit about your role and what data you work with..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        {isEditing && (
                            <div className="px-8 py-5 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
                                <button
                                    onClick={() => {
                                        // Reset form data on cancel
                                        setFormData({
                                            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
                                            job_title: user?.user_metadata?.job_title || "",
                                            company: user?.user_metadata?.company || "",
                                            department: user?.user_metadata?.department || "",
                                            bio: user?.user_metadata?.bio || ""
                                        });
                                        setIsEditing(false);
                                    }}
                                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="px-8 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center min-w-[140px]"
                                    style={{ background: "linear-gradient(135deg, #7C6FFF, #00C9B1)" }}
                                >
                                    {isLoading ? (
                                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
