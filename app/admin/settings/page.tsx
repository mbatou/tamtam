"use client";

import { useEffect, useState } from "react";
import { useTranslation, Locale } from "@/lib/i18n";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import CitySelect from "@/components/ui/CitySelect";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  mobile_money_provider: string;
  logo_url: string | null;
  industry: string | null;
  notification_prefs: Record<string, boolean> | null;
  created_at: string;
}

const INDUSTRY_KEYS = [
  { value: "restaurant", key: "admin.settings.industryRestaurant" },
  { value: "boutique", key: "admin.settings.industryBoutique" },
  { value: "salon", key: "admin.settings.industrySalon" },
  { value: "school", key: "admin.settings.industrySchool" },
  { value: "driving", key: "admin.settings.industryDriving" },
  { value: "agency", key: "admin.settings.industryAgency" },
  { value: "health", key: "admin.settings.industryHealth" },
  { value: "tech", key: "admin.settings.industryTech" },
  { value: "events", key: "admin.settings.industryEvents" },
  { value: "other", key: "admin.settings.industryOther" },
];

const C = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const INP: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };

export default function AdminSettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const [tab, setTab] = useState<"profile" | "security" | "team">("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", city: "", mobile_money_provider: "", industry: "" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    notify_campaign_complete: true,
    notify_weekly_summary: true,
    notify_new_echos: false,
  });

  const [team, setTeam] = useState<{ isOwner: boolean; ownerId: string; members: Array<{ id: string; email: string; status: string; user: { id: string; name: string; email: string } | null }> }>({ isOwner: false, ownerId: "", members: [] });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { loadProfile(); loadTeam(); }, []);

  async function loadProfile() {
    const res = await fetch("/api/admin/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        city: data.city || "",
        mobile_money_provider: data.mobile_money_provider || "",
        industry: data.industry || "",
      });
      setLogoUrl(data.logo_url || null);
      if (data.notification_prefs) {
        setNotifPrefs({
          notify_campaign_complete: data.notification_prefs.notify_campaign_complete ?? true,
          notify_weekly_summary: data.notification_prefs.notify_weekly_summary ?? true,
          notify_new_echos: data.notification_prefs.notify_new_echos ?? false,
        });
      }
    }
    setLoading(false);
  }

  async function loadTeam() {
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) { const data = await res.json(); setTeam(data); }
    } catch { /* team feature may not be available yet */ }
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    setTeamError(null);
    try {
      const res = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setTeamError(data.error || t("admin.settings.inviteError")); }
      else { setInviteEmail(""); loadTeam(); }
    } catch { setTeamError(t("common.networkError")); }
    setInviting(false);
  }

  async function handleRemoveMember(memberId: string, memberEmail: string) {
    if (!confirm(t("admin.settings.removeConfirm", { email: memberEmail }))) return;
    try {
      await fetch("/api/admin/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      loadTeam();
    } catch { /* ignore */ }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, notification_prefs: notifPrefs }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("common.error")); }
      else { setProfile(data); setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    } catch { setError(t("common.networkRetry")); }
    setSaving(false);
  }

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);
    if (passwords.new_password.length < 6) { setError(t("common.passwordMin")); return; }
    if (passwords.new_password !== passwords.confirm) { setError(t("common.passwordMismatch")); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: passwords.new_password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("common.error")); }
      else { setSuccess(true); setPasswords({ new_password: "", confirm: "" }); setShowPassword(false); setTimeout(() => setSuccess(false), 3000); }
    } catch { setError(t("common.networkRetry")); }
    setPwSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { setError(t("admin.settings.logoTooLarge")); return; }
    setUploading(true);
    setError(null);
    const supabase = createBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `logos/${profile.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
    if (uploadError) { setError(t("admin.settings.logoUploadError")); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(path);
    await supabase.from("users").update({ logo_url: publicUrl }).eq("id", profile.id);
    setLogoUrl(publicUrl);
    setUploading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const TABS = [
    { id: "profile" as const, label: t("admin.settings.accountInfo"), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: "security" as const, label: t("admin.settings.securityTab"), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
    { id: "team" as const, label: t("admin.settings.myTeam"), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  ];

  if (loading) {
    return (
      <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
        <div className="mb-6">
          <div className="h-6 w-36 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="space-y-4 max-w-2xl">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl p-6 animate-pulse" style={C}>
              <div className="h-4 w-32 rounded mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-10 w-full rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold font-syne text-white">{t("admin.settings.title")}</h1>
      </div>

      {/* Global alerts */}
      {success && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold font-dm flex items-center justify-between" style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)", color: "#1D9E75" }}>
          <span>{t("admin.settings.saved")}</span>
          <button onClick={() => setSuccess(false)} className="ml-4 hover:opacity-70 transition" style={{ color: "#1D9E75" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-dm flex items-center justify-between" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 hover:opacity-70 transition" style={{ color: "#EF4444" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Tab pills */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)" }}>
        {TABS.map((t_) => (
          <button
            key={t_.id}
            onClick={() => setTab(t_.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-dm font-semibold transition-all"
            style={{
              background: tab === t_.id ? "#D35400" : "transparent",
              color: tab === t_.id ? "white" : "rgba(255,255,255,0.4)",
            }}
          >
            {t_.icon}
            {t_.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* ====== PROFILE TAB ====== */}
        {tab === "profile" && (
          <div className="space-y-4">
            {/* Logo */}
            <div className="rounded-2xl p-5" style={C}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.companyLogo")}</p>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold font-syne" style={{ color: "rgba(255,255,255,0.2)" }}>{form.name?.charAt(0)?.toUpperCase() || "?"}</span>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer inline-block">
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-dm font-semibold transition-all hover:brightness-110 cursor-pointer"
                      style={{ background: "rgba(211,84,0,0.1)", border: "0.5px solid rgba(211,84,0,0.2)", color: "#D35400" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {uploading ? t("common.uploading") : t("admin.settings.changeLogo")}
                    </span>
                  </label>
                  <p className="text-[10px] font-dm mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.settings.logoFormats")}</p>
                </div>
              </div>
            </div>

            {/* Account info */}
            <div className="rounded-2xl p-5" style={C}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.accountInfo")}</p>
              <div className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.email")}</label>
                  <input type="email" value={profile?.email || ""} disabled className="w-full rounded-xl px-4 py-3 text-sm text-white/40 font-dm cursor-not-allowed" style={INP} />
                  <p className="text-[9px] font-dm mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>{t("admin.settings.emailNoChange")}</p>
                </div>

                {/* Brand name */}
                <div>
                  <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.brandName")}</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Wave Sénégal" className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none" style={INP} />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.industry")}</label>
                  <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none appearance-none cursor-pointer" style={INP}>
                    <option value="" style={{ background: "#111128" }}>— {t("admin.settings.selectIndustry")} —</option>
                    {INDUSTRY_KEYS.map((opt) => (
                      <option key={opt.value} value={opt.value} style={{ background: "#111128" }}>{t(opt.key)}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.phone")}</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none" style={INP} />
                </div>

                {/* City */}
                <div>
                  <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.city")}</label>
                  <CitySelect value={form.city} onChange={(city) => setForm({ ...form, city })} />
                </div>

                {/* Payment method */}
                <div>
                  <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.preferredPayment")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "wave", label: t("common.wave"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c2-3 4-5 6-5s4 4 6 4 4-4 6-4 2 2 2 2"/><path d="M2 20c2-3 4-5 6-5s4 4 6 4 4-4 6-4 2 2 2 2"/></svg> },
                      { id: "orange_money", label: t("common.orangeMoney"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setForm({ ...form, mobile_money_provider: option.id })}
                        className="flex items-center gap-3 p-4 rounded-xl transition-all text-left"
                        style={{
                          background: form.mobile_money_provider === option.id ? "rgba(211,84,0,0.08)" : "rgba(255,255,255,0.02)",
                          border: form.mobile_money_provider === option.id ? "1px solid rgba(211,84,0,0.3)" : "0.5px solid rgba(255,255,255,0.06)",
                          color: form.mobile_money_provider === option.id ? "#D35400" : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {option.icon}
                        <span className="text-sm font-dm font-semibold">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="mt-6 w-full py-3 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
                style={{ background: "#D35400" }}
              >
                {saving ? t("common.saving") : t("admin.settings.saveChanges")}
              </button>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl p-5" style={C}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.notifications")}</p>
              <div className="space-y-3">
                {[
                  { key: "notify_campaign_complete", label: t("admin.settings.notifCampaignComplete") },
                  { key: "notify_weekly_summary", label: t("admin.settings.notifWeeklySummary") },
                  { key: "notify_new_echos", label: t("admin.settings.notifNewEchos") },
                ].map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between group cursor-pointer" onClick={() => setNotifPrefs({ ...notifPrefs, [pref.key]: !notifPrefs[pref.key] })}>
                    <span className="text-xs font-dm group-hover:text-white transition" style={{ color: "rgba(255,255,255,0.6)" }}>{pref.label}</span>
                    <div
                      className="w-10 h-6 rounded-full relative transition-colors"
                      style={{ background: notifPrefs[pref.key] ? "#D35400" : "rgba(255,255,255,0.08)" }}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notifPrefs[pref.key] ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-dm mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>{t("admin.settings.notifSavedOnSave")}</p>
            </div>

            {/* Language */}
            <div className="rounded-2xl p-5" style={C}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.language")}</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "fr" as Locale, label: t("common.french"), flag: "FR" },
                  { key: "en" as Locale, label: t("common.english"), flag: "EN" },
                ]).map((lang) => (
                  <button
                    key={lang.key}
                    onClick={() => { trackEvent.languageSwitch(lang.key); setLocale(lang.key); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-dm font-semibold transition-all"
                    style={{
                      background: locale === lang.key ? "#D35400" : "rgba(255,255,255,0.03)",
                      border: locale === lang.key ? "1px solid #D35400" : "0.5px solid rgba(255,255,255,0.06)",
                      color: locale === lang.key ? "white" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <span className="text-[10px] font-bold opacity-60">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account info footer */}
            <div className="rounded-2xl p-5" style={C}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.info")}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-dm">
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.settings.memberSince")}</span>
                  <span className="text-white">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex justify-between text-xs font-dm">
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.settings.accountType")}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-dm font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(211,84,0,0.1)", color: "#D35400" }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: "#D35400" }} />
                    {t("admin.settings.batteur")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== SECURITY TAB ====== */}
        {tab === "security" && (
          <div className="space-y-4">
            {/* Password */}
            <div className="rounded-2xl p-5" style={C}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-dm font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.password")}</p>
                {!showPassword && (
                  <button
                    onClick={() => { setShowPassword(true); setError(null); setSuccess(false); }}
                    className="text-[11px] font-dm font-semibold transition hover:brightness-110"
                    style={{ color: "#D35400" }}
                  >
                    {t("admin.settings.changePassword")}
                  </button>
                )}
              </div>
              {showPassword ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.newPassword")}</label>
                    <input type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} placeholder={t("common.minChars")} className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none" style={INP} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.confirmPassword")}</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      placeholder={t("common.repeatPassword")}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none"
                      style={INP}
                      onKeyDown={(e) => e.key === "Enter" && !pwSaving && passwords.new_password && passwords.confirm && handleChangePassword()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving || !passwords.new_password || !passwords.confirm}
                      className="flex-1 py-3 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
                      style={{ background: "#D35400" }}
                    >
                      {pwSaving ? t("common.updating") : t("common.update")}
                    </button>
                    <button
                      onClick={() => { setShowPassword(false); setPasswords({ new_password: "", confirm: "" }); }}
                      className="px-5 py-3 rounded-xl text-xs font-dm font-semibold transition-all hover:brightness-110"
                      style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.3)" }}>{t("common.passwordStrong")}</p>
              )}
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(239,68,68,0.12)" }}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "#EF4444" }}>{t("admin.settings.dangerZone")}</p>
              <p className="text-xs font-dm mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.deleteDescription")}</p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-dm font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                {t("admin.settings.deleteAccount")}
              </button>
            </div>
          </div>
        )}

        {/* ====== TEAM TAB ====== */}
        {tab === "team" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={C}>
              <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.myTeam")}</p>

              {team.isOwner && (
                <div className="flex gap-2 mb-5">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setTeamError(null); }}
                    placeholder={t("admin.settings.memberEmail")}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white font-dm focus:outline-none min-w-0"
                    style={INP}
                    onKeyDown={(e) => e.key === "Enter" && !inviting && inviteEmail && handleInvite()}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail}
                    className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-30"
                    style={{ background: "#D35400" }}
                  >
                    {inviting ? t("admin.settings.inviting") : t("admin.settings.inviteMember")}
                  </button>
                </div>
              )}

              {teamError && (
                <div className="mb-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
                  {teamError}
                </div>
              )}

              {team.members.length > 0 ? (
                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.04)" }}>
                      <div>
                        <div className="text-sm font-dm font-semibold text-white">{member.user?.name || member.email}</div>
                        <div className="text-[10px] font-dm flex items-center gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {member.email}
                          {member.status === "invited" && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(211,84,0,0.1)", color: "#D35400" }}>
                              <span className="w-1 h-1 rounded-full" style={{ background: "#D35400" }} />
                              {t("admin.settings.inviteSent")}
                            </span>
                          )}
                          {member.status === "active" && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(29,158,117,0.1)", color: "#1D9E75" }}>
                              <span className="w-1 h-1 rounded-full" style={{ background: "#1D9E75" }} />
                              {t("common.active")}
                            </span>
                          )}
                        </div>
                      </div>
                      {team.isOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.email)}
                          className="text-[11px] font-dm font-semibold transition hover:brightness-110"
                          style={{ color: "#EF4444" }}
                        >
                          {t("admin.settings.remove")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                  <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.noMembers")}</p>
                </div>
              )}

              {!team.isOwner && (
                <div className="mt-4 px-4 py-3 rounded-xl text-xs font-dm" style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)" }}>
                  {t("admin.settings.ownerOnly")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div className="relative w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "#111128", border: "0.5px solid rgba(239,68,68,0.15)" }}>
            <button
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); setDeleteError(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <h3 className="text-base font-bold font-syne mb-2" style={{ color: "#EF4444" }}>{t("admin.settings.deleteConfirm")}</h3>
            <p className="text-xs font-dm mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.settings.deleteIrreversible")}</p>

            {deleteError === "balance_remaining" && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(211,84,0,0.08)", border: "0.5px solid rgba(211,84,0,0.15)", color: "#D35400" }}>
                {t("admin.settings.balanceWarning")}
              </div>
            )}
            {deleteError && deleteError !== "balance_remaining" && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
                {deleteError}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-[10px] font-dm mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.settings.typeToConfirm")}</label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={e => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none"
                style={INP}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); setDeleteError(null); }}
                className="flex-1 py-3 rounded-xl text-xs font-dm font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError(null);
                  try {
                    const res = await fetch("/api/account/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ confirmation: deleteConfirmation }),
                    });
                    const data = await res.json();
                    if (data.success) { window.location.href = "/"; }
                    else { setDeleteError(data.error === "balance_remaining" ? "balance_remaining" : data.message || data.error); }
                  } catch { setDeleteError(t("common.networkRetry")); }
                  setDeleting(false);
                }}
                disabled={deleting || deleteConfirmation !== "SUPPRIMER"}
                className="flex-1 py-3 rounded-xl text-xs font-dm font-semibold text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ background: deleteConfirmation === "SUPPRIMER" && !deleting ? "#EF4444" : "rgba(239,68,68,0.15)" }}
              >
                {deleting ? t("admin.settings.deleting") : t("admin.settings.deleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
