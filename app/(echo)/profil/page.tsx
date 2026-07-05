"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import type { User } from "@/lib/types";
import InterestOnboardingModal from "@/components/echo/InterestOnboardingModal";
import TermsBanner from "./_components/TermsBanner";
import InterestOnboardingBanner from "./_components/InterestOnboardingBanner";
import ProfileHeaderCard from "./_components/ProfileHeaderCard";
import ProfileEditForm from "./_components/ProfileEditForm";
import StatsRow from "./_components/StatsRow";
import FoundingEchoBadge from "./_components/FoundingEchoBadge";
import SharingProfileCard from "./_components/SharingProfileCard";
import InterestsCard from "./_components/InterestsCard";
import ReferralCard from "./_components/ReferralCard";
import AccountDetailsCard from "./_components/AccountDetailsCard";
import PasswordSection from "./_components/PasswordSection";
import PushNotificationSettings from "./_components/PushNotificationSettings";
import SmsToggle from "./_components/SmsToggle";
import LanguageSection from "./_components/LanguageSection";
import AccountDeletion from "./_components/AccountDeletion";
import type { InterestItem, ProfileStats } from "./_components/types";

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ totalClicks: 0, activeCampaigns: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", city: "", mobile_money_provider: "" });
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(true);

  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestEditMode, setInterestEditMode] = useState(false);
  const [userInterests, setUserInterests] = useState<InterestItem[]>([]);
  const [userSignals, setUserSignals] = useState<InterestItem[]>([]);

  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    new_campaign: true,
    share_reminder: true,
    inactivity: true,
    campaign_ending: true,
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

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold font-syne mb-5">{t("echo.profile.title")}</h1>

      {user && !user.terms_accepted_at && (
        <TermsBanner acceptingTerms={acceptingTerms} onAccept={handleAcceptTerms} />
      )}

      {user && !user.interests_completed_at && (
        <InterestOnboardingBanner onStart={() => { setInterestEditMode(false); setShowInterestModal(true); }} />
      )}

      {/* Feedback */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>
      )}

      <ProfileHeaderCard
        user={user}
        editing={editing}
        onEdit={() => { setEditing(true); setError(""); setSuccess(""); }}
      />

      {editing && (
        <ProfileEditForm
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSaveProfile}
          onCancel={() => {
            setEditing(false);
            setForm({ name: user?.name || "", phone: user?.phone || "", city: user?.city || "", mobile_money_provider: user?.mobile_money_provider || "" });
          }}
        />
      )}

      <StatsRow stats={stats} />

      {user?.is_founding_echo && <FoundingEchoBadge />}

      {user && user.platforms && user.platforms.length > 0 && <SharingProfileCard user={user} />}

      {user?.interests_completed_at && (userInterests.length > 0 || userSignals.length > 0) && (
        <InterestsCard
          userInterests={userInterests}
          userSignals={userSignals}
          onEdit={() => { setInterestEditMode(true); setShowInterestModal(true); }}
        />
      )}

      <ReferralCard referralEnabled={referralEnabled} user={user} setSuccess={setSuccess} />

      <AccountDetailsCard user={user} />

      <PasswordSection setError={setError} setSuccess={setSuccess} />

      {"Notification" in (typeof window !== "undefined" ? window : {}) && (
        <PushNotificationSettings pushEnabled={pushEnabled} setPushEnabled={setPushEnabled} notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} setSuccess={setSuccess} />
      )}

      <SmsToggle smsEnabled={smsEnabled} setSmsEnabled={setSmsEnabled} />

      <LanguageSection />

      <AccountDeletion />

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
          }).catch((err) => console.error("[profil] interests refresh", err));
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
