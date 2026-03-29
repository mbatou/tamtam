"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
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

export default function AdminSettingsPage() {
  const { t } = useTranslation();
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

  // Team management
  const [team, setTeam] = useState<{ isOwner: boolean; ownerId: string; members: Array<{ id: string; email: string; status: string; user: { id: string; name: string; email: string } | null }> }>({ isOwner: false, ownerId: "", members: [] });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

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
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
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
      if (!res.ok) {
        setTeamError(data.error || t("admin.settings.inviteError"));
      } else {
        setInviteEmail("");
        loadTeam();
      }
    } catch {
      setTeamError(t("common.networkError"));
    }
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
      if (!res.ok) {
        setError(data.error || t("common.error"));
      } else {
        setProfile(data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);

    if (passwords.new_password.length < 6) {
      setError(t("common.passwordMin"));
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      setError(t("common.passwordMismatch"));
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: passwords.new_password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
      } else {
        setSuccess(true);
        setPasswords({ new_password: "", confirm: "" });
        setShowPassword(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setPwSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t("admin.settings.logoTooLarge"));
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `logos/${profile.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(t("admin.settings.logoUploadError"));
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("brand-assets")
      .getPublicUrl(path);

    await supabase.from("users").update({ logo_url: publicUrl }).eq("id", profile.id);
    setLogoUrl(publicUrl);
    setUploading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">{t("admin.settings.title")}</h1>

      {/* Logo upload */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">{t("admin.settings.companyLogo")}</h2>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border-2 border-white/10">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/30 text-2xl font-bold">{form.name?.charAt(0)?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <label className="cursor-pointer inline-block">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
              <span className="bg-primary/10 border border-primary/30 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition inline-block">
                {uploading ? t("common.uploading") : t("admin.settings.changeLogo")}
              </span>
            </label>
            <p className="text-xs text-white/30 mt-2">{t("admin.settings.logoFormats")}</p>
          </div>
        </div>
      </div>

      {/* Profile section */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-6">{t("admin.settings.accountInfo")}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.email")}</label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed"
            />
            <p className="text-xs text-white/20 mt-1">{t("admin.settings.emailNoChange")}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.settings.brandName")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Wave Sénégal"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.settings.industry")}</label>
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1a2e]">— {t("admin.settings.selectIndustry")} —</option>
              {INDUSTRY_KEYS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">{t(opt.key)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.phone")}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.city")}</label>
            <CitySelect
              value={form.city}
              onChange={(city) => setForm({ ...form, city })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">{t("admin.settings.preferredPayment")}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "wave", label: t("common.wave") },
                { id: "orange_money", label: t("common.orangeMoney") },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setForm({ ...form, mobile_money_provider: option.id })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    form.mobile_money_provider === option.id
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-sm">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {t("admin.settings.saved")}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="btn-primary mt-6 disabled:opacity-40"
        >
          {saving ? t("common.saving") : t("admin.settings.saveChanges")}
        </button>
      </div>

      {/* Password section */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("common.password")}</h2>
          {!showPassword && (
            <button
              onClick={() => { setShowPassword(true); setError(null); setSuccess(false); }}
              className="text-sm text-primary font-semibold hover:underline"
            >
              {t("admin.settings.changePassword")}
            </button>
          )}
        </div>
        {showPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.newPassword")}</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder={t("common.minChars")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.confirmPassword")}</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder={t("common.repeatPassword")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                onKeyDown={(e) => e.key === "Enter" && !pwSaving && passwords.new_password && passwords.confirm && handleChangePassword()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !passwords.new_password || !passwords.confirm}
                className="btn-primary disabled:opacity-40"
              >
                {pwSaving ? t("common.updating") : t("common.update")}
              </button>
              <button
                onClick={() => { setShowPassword(false); setPasswords({ new_password: "", confirm: "" }); }}
                className="px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/30">{t("common.passwordStrong")}</p>
        )}
      </div>

      {/* Notification preferences */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">{t("admin.settings.notifications")}</h2>
        <div className="space-y-3">
          {[
            { key: "notify_campaign_complete", label: t("admin.settings.notifCampaignComplete") },
            { key: "notify_weekly_summary", label: t("admin.settings.notifWeeklySummary") },
            { key: "notify_new_echos", label: t("admin.settings.notifNewEchos") },
          ].map((pref) => (
            <label key={pref.key} className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-white/70 group-hover:text-white/90 transition">{pref.label}</span>
              <div
                onClick={() => setNotifPrefs({ ...notifPrefs, [pref.key]: !notifPrefs[pref.key] })}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  notifPrefs[pref.key] ? "bg-primary" : "bg-white/10"
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  notifPrefs[pref.key] ? "translate-x-5" : "translate-x-1"
                }`} />
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-white/20 mt-3">{t("admin.settings.notifSavedOnSave")}</p>
      </div>

      {/* Team management */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">{t("admin.settings.myTeam")}</h2>

        {team.isOwner && (
          <div className="flex gap-3 mb-6">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setTeamError(null); }}
              placeholder={t("admin.settings.memberEmail")}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition"
              onKeyDown={(e) => e.key === "Enter" && !inviting && inviteEmail && handleInvite()}
            />
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="btn-primary px-6 py-2.5 disabled:opacity-40"
            >
              {inviting ? t("admin.settings.inviting") : t("admin.settings.inviteMember")}
            </button>
          </div>
        )}

        {teamError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {teamError}
          </div>
        )}

        {team.members.length > 0 ? (
          <div className="space-y-3">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-medium">
                    {member.user?.name || member.email}
                  </div>
                  <div className="text-white/30 text-xs">
                    {member.email}
                    {member.status === "invited" && (
                      <span className="ml-2 text-orange-400">{t("admin.settings.inviteSent")}</span>
                    )}
                    {member.status === "active" && (
                      <span className="ml-2 text-emerald-400">{t("common.active")}</span>
                    )}
                  </div>
                </div>
                {team.isOwner && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.email)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    {t("admin.settings.remove")}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/30 text-sm">
            {t("admin.settings.noMembers")}
          </div>
        )}

        {!team.isOwner && (
          <div className="mt-4 p-3 bg-white/5 rounded-xl text-white/40 text-sm">
            {t("admin.settings.ownerOnly")}
          </div>
        )}
      </div>

      {/* Language */}
      <div className="glass-card p-6 mb-6">
        <LanguageSwitcher />
      </div>

      {/* Account info */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">{t("admin.settings.info")}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">{t("admin.settings.memberSince")}</span>
            <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">{t("admin.settings.accountType")}</span>
            <span className="badge-active">{t("admin.settings.batteur")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
