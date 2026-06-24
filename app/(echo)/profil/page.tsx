"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CitySelect from "@/components/ui/CitySelect";
import type { User } from "@/lib/types";
import InterestOnboardingModal from "@/components/echo/InterestOnboardingModal";
import { PLATFORM_LABELS, AUDIENCE_LABELS } from "@/lib/onboarding";

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalClicks: 0, activeCampaigns: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", city: "", mobile_money_provider: "" });
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestEditMode, setInterestEditMode] = useState(false);
  const [userInterests, setUserInterests] = useState<{ id: string; emoji: string; name_fr: string }[]>([]);
  const [userSignals, setUserSignals] = useState<{ id: string; emoji: string; name_fr: string }[]>([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    new_campaign: true,
    share_reminder: true,
    inactivity: true,
    campaign_ending: true,
    streak_danger: true,
  });

  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, linksRes, settingsRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/links"),
      fetch("/api/echo/settings"),
    ]);

    if (userRes.ok) {
      const userData = await userRes.json();
      setUser(userData);
      setForm({
        name: userData.name || "",
        phone: userData.phone || "",
        city: userData.city || "",
        mobile_money_provider: userData.mobile_money_provider || "",
      });
      setSmsEnabled(!userData.sms_optout);
    }

    if (linksRes.ok) {
      const linksData = await linksRes.json();
      const links = Array.isArray(linksData) ? linksData : [];
      const totalClicks = links.reduce((sum: number, l: { click_count: number }) => sum + l.click_count, 0);
      const totalCampaigns = links.length;
      const totalEarned = links.reduce((sum: number, l: { click_count: number; campaigns?: { cpc: number } }) => {
        return sum + Math.floor(l.click_count * (l.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100);
      }, 0);
      setStats({ totalClicks, activeCampaigns: totalCampaigns, totalEarned });
    }

    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      setReferralEnabled(settingsData.referral_program_enabled !== false);
    }

    if ("Notification" in window && "serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub);
      } catch {}
    }

    try {
      const prefsRes = await fetch("/api/echo/notification-prefs");
      if (prefsRes.ok) {
        const prefs = await prefsRes.json();
        setNotifPrefs(prefs);
      }
    } catch {}

    try {
      const interestRes = await fetch("/api/echo/interests");
      if (interestRes.ok) {
        const interestData = await interestRes.json();
        const allCats = interestData.categories || [];
        const allSigs = interestData.signals || [];
        const selInterests = interestData.selectedInterests || [];
        const selSignals = interestData.selectedSignals || [];
        setUserInterests(allCats.filter((c: { id: string }) => selInterests.includes(c.id)));
        setUserSignals(allSigs.filter((s: { id: string }) => selSignals.includes(s.id)));
      }
    } catch {}

    setLoading(false);
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/echo/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
      } else {
        setUser((prev) => prev ? { ...prev, ...data } : prev);
        setSuccess(t("echo.profile.profileUpdated"));
        setEditing(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    setError("");
    setSuccess("");

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
        setSuccess(t("common.passwordUpdated"));
        setPasswords({ new_password: "", confirm: "" });
        setShowPassword(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setPwSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleAcceptTerms() {
    setAcceptingTerms(true);
    try {
      const res = await fetch("/api/echo/accept-terms", { method: "POST" });
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, terms_accepted_at: new Date().toISOString() } : prev);
        setSuccess(t("echo.profile.termsAccepted"));
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(t("common.error"));
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setAcceptingTerms(false);
  }

  function copyReferralLink() {
    const code = user?.referral_code || (user?.name?.split(" ")[0]?.toUpperCase() + "-TT");
    navigator.clipboard.writeText(`https://tamma.me/register?ref=${code}`);
    setSuccess(t("echo.profile.referralCopied"));
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) {
    return (
      <div className="px-4 py-5 space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  const memberSinceDate = user?.created_at ? new Date(user.created_at) : null;
  const daysSinceJoined = memberSinceDate
    ? Math.floor((Date.now() - memberSinceDate.getTime()) / 86400000)
    : 0;

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold font-syne mb-5">{t("echo.profile.title")}</h1>

      {/* Terms acceptance alert */}
      {user && !user.terms_accepted_at && (
        <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#9888;&#65039;</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-400 mb-1">{t("echo.profile.termsRequired")}</p>
              <p className="text-xs text-white/40 mb-3">
                {t("echo.profile.termsRequiredDesc")}{" "}
                <Link href="/terms" target="_blank" className="text-[#1D9E75] font-semibold hover:underline">
                  {t("echo.profile.readTerms")}
                </Link>
              </p>
              <button
                onClick={handleAcceptTerms}
                disabled={acceptingTerms}
                className="px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {acceptingTerms ? "..." : t("echo.profile.acceptTerms")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interest onboarding banner */}
      {user && !user.interests_completed_at && (
        <div className="mb-4 p-4 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#128221;</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1D9E75] mb-1">
                {t("echo.profile.completeInterests")}
              </p>
              <p className="text-xs text-white/40 mb-3">
                {new Date() <= new Date("2026-04-30T23:59:59Z")
                  ? t("echo.profile.interestRewardText")
                  : t("echo.profile.interestDefaultText")}
              </p>
              <button
                onClick={() => { setInterestEditMode(false); setShowInterestModal(true); }}
                className="px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:opacity-90 transition"
              >
                {t("echo.profile.startButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>
      )}

      {/* Profile card — teal avatar */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/30 flex items-center justify-center text-xl font-black text-[#1D9E75] shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold truncate">{user?.name}</h2>
                {user?.is_founding_echo && (
                  <span className="text-sm" title="Écho Fondateur">&#129351;</span>
                )}
              </div>
              <p className="text-xs text-white/40">{user?.phone}</p>
              {user?.city && <p className="text-xs text-white/30">{user.city}</p>}
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setError(""); setSuccess(""); }}
              className="text-xs text-[#1D9E75] font-semibold hover:underline shrink-0"
            >
              {t("echo.profile.edit")}
            </button>
          )}
        </div>
        {memberSinceDate && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] text-white/30">
              {t("echo.profile.memberSince")} {memberSinceDate.toLocaleDateString("fr-FR")} — {daysSinceJoined} {t("echo.profile.days")}
            </p>
            {daysSinceJoined <= 30 && (
              <span className="text-[10px] text-[#1D9E75] font-bold">🌟 {t("echo.profile.earlyMember")}</span>
            )}
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5 space-y-4">
          <h3 className="text-sm font-bold">{t("echo.profile.editProfile")}</h3>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("echo.profile.nameRequired")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.phone")}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.city")}</label>
            <CitySelect
              value={form.city}
              onChange={(city) => setForm({ ...form, city })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("echo.profile.paymentMethod")}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "wave", label: t("common.wave") },
                { id: "orange_money", label: t("common.orangeMoney") },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setForm({ ...form, mobile_money_provider: option.id })}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    form.mobile_money_provider === option.id
                      ? "border-[#1D9E75] bg-[#1D9E75]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-sm">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving || !form.name}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] transition disabled:opacity-50"
            >
              {saving ? t("echo.profile.saveLoading") : t("echo.profile.saveButton")}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  name: user?.name || "",
                  phone: user?.phone || "",
                  city: user?.city || "",
                  mobile_money_provider: user?.mobile_money_provider || "",
                });
              }}
              className="px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-lg font-black">{stats.totalClicks}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.validClicks")}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-lg font-black">{stats.activeCampaigns}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.rythmesJoined")}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-lg font-black text-[#D35400]">{formatFCFA(stats.totalEarned)}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("common.earned")}</p>
        </div>
      </div>

      {/* Écho Fondateur badge */}
      {user?.is_founding_echo && (
        <div className="rounded-xl bg-white/[0.03] border border-[#FDEF42]/20 p-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">&#129351;</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#FDEF42]">{t("echo.profile.foundingEchoTitle")}</h3>
              <p className="text-[10px] text-white/40">{t("echo.profile.foundingEchoDesc")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mon profil de partage — platforms + audience */}
      {user && user.platforms && user.platforms.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">{t("echo.profile.sharingProfile")}</h3>
            <a
              href="/onboarding"
              className="text-xs text-[#1D9E75] font-semibold hover:underline"
            >
              {t("echo.profile.modify")}
            </a>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">{t("echo.profile.platforms")}</p>
              <div className="flex flex-wrap gap-1.5">
                {user.platforms.map((p) => (
                  <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-xs font-semibold">
                    {PLATFORM_LABELS[p] || p}
                  </span>
                ))}
              </div>
            </div>
            {user.audience_size_range && (
              <div>
                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">{t("echo.profile.audience")}</p>
                <p className="text-xs font-semibold">{AUDIENCE_LABELS[user.audience_size_range] || user.audience_size_range} {t("echo.profile.contacts")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mes centres d'intérêt */}
      {user?.interests_completed_at && (userInterests.length > 0 || userSignals.length > 0) && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">{t("echo.profile.myInterests")}</h3>
            <button
              onClick={() => { setInterestEditMode(true); setShowInterestModal(true); }}
              className="text-xs text-[#1D9E75] font-semibold hover:underline"
            >
              {t("echo.profile.modify")}
            </button>
          </div>
          {userInterests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {userInterests.map((cat) => (
                <span key={cat.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-xs">
                  <span>{cat.emoji}</span>
                  <span className="font-semibold">{cat.name_fr}</span>
                </span>
              ))}
            </div>
          )}
          {userSignals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {userSignals.map((sig) => (
                <span key={sig.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                  <span>{sig.emoji}</span>
                  <span className="font-semibold">{sig.name_fr}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Referral section */}
      <div className={`rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5 ${!referralEnabled ? "opacity-50" : ""}`}>
        <h3 className="text-sm font-bold mb-2">🤝 {t("echo.profile.inviteFriends")}</h3>
        {!referralEnabled && (
          <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-400 text-sm">⏸</span>
            <p className="text-xs text-yellow-300/80">{t("echo.profile.referralPaused")}</p>
          </div>
        )}
        {referralEnabled && <p className="text-xs text-white/40 mb-3">{t("echo.profile.inviteDesc")}</p>}
        <div className="flex gap-2">
          <button
            disabled={!referralEnabled}
            onClick={() => {
              const code = user?.referral_code || (user?.name?.split(" ")[0]?.toUpperCase() + "-TT");
              const text = t("echo.profile.inviteWhatsappText", { code });
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${referralEnabled ? "bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366]" : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"}`}
          >
            {t("echo.profile.shareWhatsApp")}
          </button>
          <button
            disabled={!referralEnabled}
            onClick={copyReferralLink}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold ${referralEnabled ? "bg-white/5 border border-white/10" : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"}`}
          >
            {t("echo.profile.copyLink")}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/5 mb-5">
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.balance")}</span>
          <span className="text-xs font-bold text-[#D35400]">{formatFCFA(user?.balance || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.totalEarned")}</span>
          <span className="text-xs font-bold text-[#D35400]">{formatFCFA(user?.total_earned || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.paymentMethod")}</span>
          <span className="text-xs font-semibold">
            {user?.mobile_money_provider === "wave" ? t("common.wave") : t("common.orangeMoney")}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("common.city")}</span>
          <span className="text-xs font-semibold">{user?.city || "—"}</span>
        </div>
      </div>

      {/* Password change */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">{t("common.password")}</h3>
          {!showPassword && (
            <button
              onClick={() => { setShowPassword(true); setError(""); setSuccess(""); }}
              className="text-xs text-[#1D9E75] font-semibold hover:underline"
            >
              {t("echo.profile.changePassword")}
            </button>
          )}
        </div>
        {showPassword ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.newPassword")}</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder={t("common.minChars")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.confirmPassword")}</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder={t("common.repeatPassword")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
                onKeyDown={(e) => e.key === "Enter" && !pwSaving && passwords.new_password && passwords.confirm && handleChangePassword()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !passwords.new_password || !passwords.confirm}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] transition disabled:opacity-50"
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
          <p className="text-xs text-white/30">{t("common.passwordStrong")}</p>
        )}
      </div>

      {/* Push notifications toggle */}
      {"Notification" in (typeof window !== "undefined" ? window : {}) && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">{t("echo.push.notificationsLabel")}</h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                {pushEnabled ? t("echo.push.statusEnabled") : t("echo.push.statusDisabled")}
              </p>
            </div>
            <button
              onClick={async () => {
                if (pushEnabled) {
                  try {
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) {
                      await sub.unsubscribe();
                      await fetch("/api/push-subscription", { method: "DELETE" });
                    }
                    setPushEnabled(false);
                    setSuccess(t("echo.push.disabled"));
                    setTimeout(() => setSuccess(""), 3000);
                  } catch {}
                } else {
                  try {
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") return;
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: (() => {
                        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
                        const padding = "=".repeat((4 - (key.length % 4)) % 4);
                        const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
                        const raw = window.atob(base64);
                        const buf = new ArrayBuffer(raw.length);
                        const arr = new Uint8Array(buf);
                        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                        return arr;
                      })(),
                    });
                    await fetch("/api/push-subscription", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ subscription: sub }),
                    });
                    setPushEnabled(true);
                    setSuccess(t("echo.push.enabled"));
                    setTimeout(() => setSuccess(""), 3000);
                  } catch {}
                }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                pushEnabled ? "bg-[#1D9E75]" : "bg-white/10"
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                pushEnabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* Granular notification preferences */}
          {pushEnabled && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
              <p className="text-[10px] text-white/30 mb-2">{t("echo.push.prefsTitle")}</p>
              {(["new_campaign", "share_reminder", "inactivity", "campaign_ending", "streak_danger"] as const).map((key) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-xs text-white/60">{t(`echo.push.pref_${key}`)}</span>
                  <button
                    onClick={async () => {
                      const newVal = !notifPrefs[key];
                      setNotifPrefs((prev) => ({ ...prev, [key]: newVal }));
                      try {
                        await fetch("/api/echo/notification-prefs", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ [key]: newVal }),
                        });
                      } catch {
                        setNotifPrefs((prev) => ({ ...prev, [key]: !newVal }));
                      }
                    }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      notifPrefs[key] ? "bg-[#1D9E75]" : "bg-white/10"
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      notifPrefs[key] ? "translate-x-[18px]" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SMS notifications toggle */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">{t("echo.sms.label")}</h3>
            <p className="text-[10px] text-white/30 mt-0.5">
              {smsEnabled ? t("echo.sms.enabled") : t("echo.sms.disabled")}
            </p>
          </div>
          <button
            onClick={async () => {
              const newVal = !smsEnabled;
              setSmsEnabled(newVal);
              try {
                await fetch("/api/echo/notification-prefs", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sms_optout: !newVal,
                    sms_optout_at: !newVal ? new Date().toISOString() : null,
                  }),
                });
              } catch {
                setSmsEnabled(!newVal);
              }
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              smsEnabled ? "bg-[#1D9E75]" : "bg-white/10"
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              smsEnabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`} />
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-2">{t("echo.sms.description")}</p>
      </div>

      <div className="mb-5">
        <LanguageSwitcher />
      </div>

      {/* Danger zone */}
      <div className="mt-8 border-t border-red-500/20 pt-6 mb-5">
        <h3 className="text-red-400 font-bold text-sm mb-2">{t("echo.profile.dangerZone")}</h3>
        <p className="text-white/30 text-xs mb-3">{t("echo.profile.deleteDescription")}</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-xs hover:bg-red-500/20 transition"
        >
          {t("echo.profile.deleteAccount")}
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111128] border border-red-500/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-red-400 font-bold text-lg mb-2">{t("echo.profile.deleteConfirm")}</h3>
            <p className="text-white/40 text-sm mb-4">{t("echo.profile.deleteIrreversible")}</p>

            {deleteError === "balance_remaining" && (
              <div className="bg-[#D35400]/10 border border-[#D35400]/30 rounded-lg p-3 mb-4">
                <div className="text-[#D35400] text-sm">{t("echo.profile.balanceWarning")}</div>
              </div>
            )}

            {deleteError && deleteError !== "balance_remaining" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <div className="text-red-400 text-sm">{deleteError}</div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-white/30 text-xs mb-1 block">{t("echo.profile.typeToConfirm")}</label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={e => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); setDeleteError(null); }}
                className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
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
                    if (data.success) {
                      window.location.href = "/";
                    } else {
                      setDeleteError(data.error === "balance_remaining" ? "balance_remaining" : data.message || data.error);
                    }
                  } catch {
                    setDeleteError(t("common.networkRetry"));
                  }
                  setDeleting(false);
                }}
                disabled={deleting || deleteConfirmation !== "SUPPRIMER"}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  deleteConfirmation === "SUPPRIMER" && !deleting
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
              >
                {deleting ? t("echo.profile.deleting") : t("echo.profile.deleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-semibold active:bg-red-500/10 transition"
      >
        {t("echo.profile.logout")}
      </button>

      <InterestOnboardingModal
        isOpen={showInterestModal}
        onClose={() => setShowInterestModal(false)}
        onComplete={(reward) => {
          setShowInterestModal(false);
          if (reward.founding) {
            setUser((prev) => prev ? { ...prev, is_founding_echo: true, interests_completed_at: new Date().toISOString() } : prev);
          } else {
            setUser((prev) => prev ? { ...prev, interests_completed_at: new Date().toISOString() } : prev);
          }
          fetch("/api/echo/interests").then(r => r.json()).then(data => {
            const allCats = data.categories || [];
            const allSigs = data.signals || [];
            setUserInterests(allCats.filter((c: { id: string }) => (data.selectedInterests || []).includes(c.id)));
            setUserSignals(allSigs.filter((s: { id: string }) => (data.selectedSignals || []).includes(s.id)));
          }).catch(() => {});
          if (!interestEditMode) {
            setSuccess(reward.credited ? t("echo.profile.interestRewardSuccess") : t("echo.profile.interestSaved"));
            setTimeout(() => setSuccess(""), 5000);
          } else {
            setSuccess(t("echo.profile.interestUpdated"));
            setTimeout(() => setSuccess(""), 3000);
          }
        }}
        isExistingEcho={true}
        showReward={!user?.interests_completed_at && new Date() <= new Date("2026-04-30T23:59:59Z")}
        editMode={interestEditMode}
      />
    </div>
  );
}
