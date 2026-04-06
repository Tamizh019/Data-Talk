"use client";

/**
 * Profile page — light-mode professional redesign.
 * Sections: identity card, editable profile info, security (change password), danger zone (sign out).
 */

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string, email: string) {
    if (name?.trim()) {
        const parts = name.trim().split(" ");
        return parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    }
    return email ? email[0].toUpperCase() : "U";
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden ${className}`}
        >
            {children}
        </div>
    );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
                <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
                {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function Field({
    label, type = "text", value, onChange, placeholder, disabled, rows
}: {
    label: string; type?: string; value: string;
    onChange?: (v: string) => void; placeholder?: string;
    disabled?: boolean; rows?: number;
}) {
    const base =
        "w-full rounded-xl border text-[13.5px] text-slate-800 placeholder-slate-300 outline-none transition-all px-4 py-3 " +
        (disabled
            ? "bg-slate-50 border-slate-100 cursor-default text-slate-500"
            : "bg-white border-slate-200 focus:border-[#7C6FFF] focus:ring-[3px] focus:ring-[#7C6FFF]/10");

    return (
        <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</label>
            {rows ? (
                <textarea
                    rows={rows}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    className={base + " resize-none"}
                />
            ) : (
                <input
                    type={type}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={base}
                />
            )}
        </div>
    );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [msg, setMsg] = useState("");

    const strength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;
    const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
    const strengthColor = ["", "#f87171", "#fbbf24", "#34d399"][strength];

    const handleChange = async () => {
        if (newPw.length < 8) { setStatus("error"); setMsg("Password must be at least 8 characters."); return; }
        if (newPw !== confirmPw) { setStatus("error"); setMsg("Passwords don't match."); return; }
        setStatus("loading");
        setMsg("");
        try {
            const supabase = createClient();
            // Verify current password first by re-authenticating
            const { data: userData } = await supabase.auth.getUser();
            const email = userData.user?.email || "";
            if (email && currentPw) {
                const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
                if (signInErr) { setStatus("error"); setMsg("Current password is incorrect."); return; }
            }
            const { error } = await supabase.auth.updateUser({ password: newPw });
            if (error) throw error;
            setStatus("success");
            setMsg("Password updated successfully.");
            setCurrentPw(""); setNewPw(""); setConfirmPw("");
            setTimeout(() => { setStatus("idle"); setMsg(""); }, 4000);
        } catch (err: any) {
            setStatus("error");
            setMsg(err.message || "Failed to update password.");
        }
    };

    return (
        <SectionCard>
            <SectionHeader
                title="Change Password"
                subtitle="Update your account password. Must be at least 8 characters."
            />
            <div className="p-6 space-y-4">
                <Field
                    label="Current Password"
                    type="password"
                    value={currentPw}
                    onChange={setCurrentPw}
                    placeholder="••••••••"
                />

                <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400">New Password</label>
                    <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-slate-200 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none transition-all px-4 py-3 bg-white focus:border-[#7C6FFF] focus:ring-[3px] focus:ring-[#7C6FFF]/10"
                    />
                    {newPw.length > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex gap-1 flex-1">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= strength ? strengthColor : "#e2e8f0" }} />
                                ))}
                            </div>
                            <span className="text-[10px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                        </div>
                    )}
                </div>

                <Field
                    label="Confirm New Password"
                    type="password"
                    value={confirmPw}
                    onChange={setConfirmPw}
                    placeholder="Re-enter new password"
                />

                {msg && (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium ${status === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                        {status === "success"
                            ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" /></svg>
                        }
                        {msg}
                    </div>
                )}

                <div className="flex justify-end pt-1">
                    <button
                        onClick={handleChange}
                        disabled={status === "loading" || !newPw || !confirmPw}
                        className="px-7 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{ background: "linear-gradient(135deg, #7C6FFF, #6B5CE7)" }}
                    >
                        {status === "loading" && (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {status === "loading" ? "Updating..." : "Update Password"}
                    </button>
                </div>
            </div>
        </SectionCard>
    );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

export default function ProfilePage() {
    const { user, signOut, updateProfile } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        bio: "",
    });

    // Sync form when user loads
    useEffect(() => {
        if (user?.user_metadata) {
            const m = user.user_metadata;
            const name =
                m.full_name ||
                m.name ||
                (m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : "");
            setFormData({
                full_name: name,
                bio: m.bio || "",
            });
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile(formData);
            setSaveSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSaveSuccess(false), 3500);
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        const m = user?.user_metadata || {};
        const name = m.full_name || m.name || (m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : "");
        setFormData({ full_name: name, bio: m.bio || "" });
        setIsEditing(false);
    };

    const displayName = formData.full_name || user?.email || "User";
    const avatarText = initials(formData.full_name, user?.email || "");
    const provider = user?.app_metadata?.provider;
    const isOAuth = provider === "google" || provider === "github";
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : null;

    return (
        <div className="h-screen overflow-y-auto bg-[#F7F8FC]">
            {/* ── Subtle background ── */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 900px 500px at 60% -10%, rgba(124,111,255,0.07) 0%, transparent 70%), " +
                        "radial-gradient(ellipse 600px 400px at 10% 90%, rgba(0,201,177,0.05) 0%, transparent 70%)",
                }}
            />

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 h-14 flex items-center px-4 sm:px-6">
                <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
                    <Link
                        href="/chat"
                        className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Chat
                    </Link>

                    <span className="text-[13px] font-bold text-slate-300 tracking-wider">DATA-TALK</span>
                </div>
            </header>

            {/* ── Page body ── */}
            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 safe-bottom">
                <div className="flex flex-col md:flex-row gap-5 sm:gap-7">

                    {/* ════ LEFT COLUMN ════ */}
                    <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-4 sm:gap-5">

                        {/* Identity Card */}
                        <SectionCard>
                            {/* Gradient accent */}
                            <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #7C6FFF 0%, #00C9B1 100%)" }} />

                            <div className="p-7 flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center text-[30px] font-black text-white shadow-lg mb-5 relative"
                                    style={{ background: "linear-gradient(135deg, #7C6FFF 0%, #00C9B1 100%)" }}
                                >
                                    {avatarText}
                                    {/* Online dot */}
                                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
                                </div>

                                <h1 className="text-[17px] font-bold text-slate-800 leading-tight">{displayName}</h1>
                                <p className="text-[12px] text-slate-400 mt-1 break-all">{user?.email}</p>

                                {/* Provider pill */}
                                <div className="mt-3 flex items-center gap-1.5">
                                    {isOAuth ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                            {provider === "google" ? (
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                                </svg>
                                            )}
                                            {provider}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Email
                                        </span>
                                    )}
                                </div>

                                {memberSince && (
                                    <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
                                        Member since {memberSince}
                                    </p>
                                )}
                            </div>

                            {/* Sign out */}
                            <div className="px-5 pb-5">
                                <button
                                    onClick={signOut}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        </SectionCard>

                        {/* Quick stats */}
                        <SectionCard>
                            <div className="p-5 space-y-4">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account Status</h3>
                                {[
                                    { label: "Account", value: "Active", color: "#10b981" },
                                    { label: "Plan", value: "Free Tier", color: "#7C6FFF" },
                                    { label: "Auth Method", value: isOAuth ? (provider === "google" ? "Google" : "GitHub") : "Email", color: "#64748b" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-[12px] text-slate-500">{label}</span>
                                        <span className="text-[12px] font-semibold" style={{ color }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </div>

                    {/* ════ RIGHT COLUMN ════ */}
                    <div className="flex-1 flex flex-col gap-4 sm:gap-5">

                        {/* ── Profile details ── */}
                        <SectionCard>
                            <SectionHeader
                                title="Profile Information"
                                subtitle="Your public-facing profile details."
                                action={
                                    !isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Edit
                                        </button>
                                    ) : null
                                }
                            />

                            <div className="p-6 space-y-5">
                                {saveSuccess && (
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-medium">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        Profile saved successfully!
                                    </div>
                                )}

                                <Field
                                    label="Display Name"
                                    value={formData.full_name}
                                    onChange={(v) => setFormData((p) => ({ ...p, full_name: v }))}
                                    placeholder="e.g. Alex Johnson"
                                    disabled={!isEditing}
                                />

                                <Field
                                    label="Email Address"
                                    value={user?.email || ""}
                                    disabled
                                    placeholder="—"
                                />

                                <Field
                                    label="Short Bio (optional)"
                                    value={formData.bio}
                                    onChange={(v) => setFormData((p) => ({ ...p, bio: v }))}
                                    placeholder="e.g. Data analyst at Acme Corp. Love turning numbers into insights."
                                    disabled={!isEditing}
                                    rows={3}
                                />

                                {isEditing && (
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-7 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-60 flex items-center gap-2"
                                            style={{ background: "linear-gradient(135deg, #7C6FFF, #6B5CE7)" }}
                                        >
                                            {isSaving && (
                                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            )}
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        {/* ── Security / Change password ── */}
                        <PasswordSection />

                        {/* ── Danger zone ── */}
                        <SectionCard>
                            <SectionHeader
                                title="Danger Zone"
                                subtitle="Irreversible actions — proceed with care."
                            />
                            <div className="p-6">
                                <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50/50">
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-800">Sign out everywhere</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Ends your current session and redirects to login.</p>
                                    </div>
                                    <button
                                        onClick={signOut}
                                        className="ml-4 shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </SectionCard>

                    </div>
                </div>
            </main>
        </div>
    );
}
