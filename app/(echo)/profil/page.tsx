"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { User } from "@/lib/types";

const TIER_INFO: Record<string, { icon: string; label: string }> = {
  echo: { icon: "🔵", label: "tierName_echo" },
  argent: { icon: "🥈", label: "tierName_argent" },
  or: { icon: "🥇", label: "tierName_or" },
  diamant: { icon: "💎", label: "tierName_diamant" },
};

interface Milestone {
  id: string;
  key: string;
  title: string;
  icon: string;
  reward_fcfa: number;
  condition_type: string;
  condition_value: number;
}

interface Achievement {
  milestone_id: string;
  reward_fcfa: number;
  achieved_at: string;
}

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalClicks: 0, activeCampaigns: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", city: "", mobile_money_provider: "" });
  const [gamification, setGamification] = useState<{
    tier: string;
    tierBonusPercent: number;
    totalClicks: number;
    achievementsCount: number;
    totalAchievements: number;
    streak: number;
    milestones: Milestone[];
    achievements: Achievement[];
    totalCampaignsJoined: number;
    referralCount: number;
  } | null>(null);
  const [ranks, setRanks] = useState<{ week: number; month: number; all: number } | null>(null);

  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(true);

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, linksRes, gamRes, rankRes, settingsRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/links"),
      fetch("/api/echo/gamification"),
      fetch("/api/echo/rank"),
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

    if (gamRes.ok) {
      const gam = await gamRes.json();
      setGamification({
        tier: gam.user?.tier || "echo",
        tierBonusPercent: gam.user?.tier_bonus_percent || 0,
        totalClicks: gam.user?.total_valid_clicks || 0,
        achievementsCount: gam.achievements?.length || 0,
        totalAchievements: gam.milestones?.length || 0,
        streak: gam.streak?.current_streak || 0,
        milestones: gam.milestones || [],
        achievements: gam.achievements || [],
        totalCampaignsJoined: gam.user?.total_campaigns_joined || 0,
        referralCount: gam.user?.referral_count || 0,
      });
    }

    if (rankRes.ok) {
      const rankData = await rankRes.json();
      setRanks(rankData);
    }

    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      setReferralEnabled(settingsData.referral_program_enabled !== false);
    }

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
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
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

  // Badge grid data
  const achievedIds = new Set(gamification?.achievements?.map((a) => a.milestone_id) || []);

  // Helper to get progress for a milestone
  function getMilestoneProgress(m: Milestone): number {
    if (!gamification) return 0;
    if (m.condition_type === "clicks") return gamification.totalClicks;
    if (m.condition_type === "campaigns") return gamification.totalCampaignsJoined;
    if (m.condition_type === "referrals") return gamification.referralCount;
    if (m.condition_type === "streak") return gamification.streak;
    return 0;
  }

  // Member since
  const memberSinceDate = user?.created_at ? new Date(user.created_at) : null;
  const daysSinceJoined = memberSinceDate
    ? Math.floor((Date.now() - memberSinceDate.getTime()) / 86400000)
    : 0;

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5">{t("echo.profile.title")}</h1>

      {/* Terms acceptance alert for existing users */}
      {user && !user.terms_accepted_at && (
        <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0">&#9888;&#65039;</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-400 mb-1">
                {t("echo.profile.termsRequired")}
              </p>
              <p className="text-xs text-white/40 mb-3">
                {t("echo.profile.termsRequiredDesc")}{" "}
                <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                  {t("echo.profile.readTerms")}
                </Link>
              </p>
              <button
                onClick={handleAcceptTerms}
                disabled={acceptingTerms}
                className="px-4 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {acceptingTerms ? "..." : t("echo.profile.acceptTerms")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {/* Profile card */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-black shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-bold truncate">{user?.name}</h2>
                {gamification && (
                  <span className="text-base">{TIER_INFO[gamification.tier]?.icon || "🔵"}</span>
                )}
              </div>
              <p className="text-xs text-white/40">{user?.phone}</p>
              {user?.city && <p className="text-xs text-white/30">{user.city}</p>}
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setError(""); setSuccess(""); }}
              className="text-xs text-primary font-semibold hover:underline shrink-0"
            >
              {t("echo.profile.edit")}
            </button>
          )}
        </div>
        {/* Member since + tenure badge */}
        {memberSinceDate && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] text-white/30">
              {t("echo.profile.memberSince")} {memberSinceDate.toLocaleDateString("fr-FR")} — {daysSinceJoined} {t("echo.profile.days")}
            </p>
            {daysSinceJoined <= 30 && (
              <span className="text-[10px] text-primary font-bold">🌟 {t("echo.profile.earlyMember")}</span>
            )}
          </div>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="glass-card p-5 mb-5 space-y-4">
          <h3 className="text-sm font-bold">{t("echo.profile.editProfile")}</h3>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("echo.profile.nameRequired")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.phone")}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.city")}</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Dakar"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
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
                      ? "border-primary bg-primary/10"
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
              className="flex-1 py-3 rounded-btn font-bold text-white bg-gradient-primary disabled:opacity-50 transition"
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
              className="px-6 py-3 rounded-btn border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black">{stats.totalClicks}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.validClicks")}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black">{stats.activeCampaigns}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.rythmesJoined")}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black text-accent">{formatFCFA(stats.totalEarned)}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("common.earned")}</p>
        </div>
      </div>

      {/* Tier & Rank badges */}
      {gamification && (
        <div className="glass-card p-4 mb-5">
          {/* Tier badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{TIER_INFO[gamification.tier]?.icon || "🔵"}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold">
                {t(`gamification.${TIER_INFO[gamification.tier]?.label || "tierName_echo"}`)}
              </h3>
              <p className="text-xs text-white/40">
                {t("gamification.tierBonus", { percent: gamification.tierBonusPercent })}
              </p>
            </div>
            {gamification.streak > 0 && (
              <div className="text-center px-3 py-1.5 rounded-xl bg-[#D35400]/10 border border-[#D35400]/20">
                <p className="text-sm font-black text-[#D35400]">🔥 {gamification.streak}</p>
                <p className="text-[9px] text-white/40">{t("gamification.streak")}</p>
              </div>
            )}
          </div>

          {/* Rank cards */}
          {ranks && (ranks.week > 0 || ranks.month > 0 || ranks.all > 0) && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/5 rounded-xl p-2.5 text-center">
                <p className="text-sm font-black">{ranks.week > 0 ? `#${ranks.week}` : "—"}</p>
                <p className="text-[9px] text-white/40">{t("gamification.thisWeek")}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 text-center">
                <p className="text-sm font-black">{ranks.month > 0 ? `#${ranks.month}` : "—"}</p>
                <p className="text-[9px] text-white/40">{t("gamification.thisMonth")}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 text-center">
                <p className="text-sm font-black">{ranks.all > 0 ? `#${ranks.all}` : "—"}</p>
                <p className="text-[9px] text-white/40">{t("gamification.allTime")}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Badge Grid */}
      {gamification && gamification.milestones.length > 0 && (
        <div className="glass-card p-4 mb-5">
          <h3 className="text-sm font-bold mb-3">
            {t("echo.profile.myBadges")} ({gamification.achievementsCount}/{gamification.totalAchievements})
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {gamification.milestones.map((m) => {
              const isUnlocked = achievedIds.has(m.id);
              const progress = getMilestoneProgress(m);
              const pct = Math.min(Math.round((progress / m.condition_value) * 100), 100);

              return (
                <div
                  key={m.id}
                  className={`rounded-xl p-3 text-center transition ${
                    isUnlocked
                      ? "bg-accent/10 border border-accent/20"
                      : "bg-white/3 border border-white/5 opacity-50"
                  }`}
                >
                  <span className={`text-2xl block mb-1 ${isUnlocked ? "" : "grayscale"}`}>{m.icon}</span>
                  <p className="text-[10px] font-bold leading-tight">{m.title}</p>
                  {isUnlocked ? (
                    <p className="text-[9px] text-accent mt-1">✓ +{formatFCFA(m.reward_fcfa)}</p>
                  ) : (
                    <div className="mt-1">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white/30 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[9px] text-white/30 mt-0.5">
                        {m.condition_value - progress} {t("echo.profile.remaining")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Referral section */}
      <div className={`glass-card p-4 mb-5 ${!referralEnabled ? "opacity-50" : ""}`}>
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
        {gamification && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[10px] text-white/30">
            <span>{t("echo.profile.friendsInvited")}: {gamification.referralCount}</span>
            <span>{t("echo.profile.bonusEarned")}: {formatFCFA(gamification.referralCount * 150)}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="glass-card divide-y divide-white/5 mb-5">
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.balance")}</span>
          <span className="text-xs font-bold text-primary">{formatFCFA(user?.balance || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.totalEarned")}</span>
          <span className="text-xs font-bold text-accent">{formatFCFA(user?.total_earned || 0)}</span>
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
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">{t("common.password")}</h3>
          {!showPassword && (
            <button
              onClick={() => { setShowPassword(true); setError(""); setSuccess(""); }}
              className="text-xs text-primary font-semibold hover:underline"
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.confirmPassword")}</label>
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
                className="flex-1 py-3 rounded-btn font-bold text-white bg-gradient-primary disabled:opacity-50 transition"
              >
                {pwSaving ? t("common.updating") : t("common.update")}
              </button>
              <button
                onClick={() => { setShowPassword(false); setPasswords({ new_password: "", confirm: "" }); }}
                className="px-6 py-3 rounded-btn border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/30">{t("common.passwordStrong")}</p>
        )}
      </div>

      <div className="mb-5">
        <LanguageSwitcher />
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-btn border border-red-500/20 text-red-400 text-sm font-semibold active:bg-red-500/10 transition"
      >
        {t("echo.profile.logout")}
      </button>
    </div>
  );
}
