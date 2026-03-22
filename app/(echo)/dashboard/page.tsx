"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import TabBar from "@/components/ui/TabBar";
import { useToast } from "@/components/ui/Toast";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import { useTranslation } from "@/lib/i18n";
import type { User, TrackedLinkWithCampaign, Campaign } from "@/lib/types";
import StreakDisplay from "@/components/gamification/StreakDisplay";
import TierProgress from "@/components/gamification/TierProgress";
import { requestNotificationPermission, canAskNotification } from "@/lib/notifications";
import { shareCampaignToWhatsApp } from "@/lib/share-utils";

export default function EchoDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeLinks, setActiveLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<TrackedLinkWithCampaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [gamification, setGamification] = useState<{
    streak: { current_streak: number; longest_streak: number; last_campaign_date: string | null };
    user: { tier: string; tier_bonus_percent: number; total_valid_clicks: number; total_campaigns_joined: number; referral_count: number } | null;
  } | null>(null);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    const [userRes, linksRes, campaignsRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/links"),
      fetch("/api/echo/campaigns"),
    ]);

    const userData = await userRes.json();
    const linksData = await linksRes.json();
    const campaignsData = await campaignsRes.json();

    if (userRes.ok) setUser(userData);

    // Load gamification data
    fetch("/api/echo/gamification")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setGamification(data))
      .catch(() => {});

    const links = Array.isArray(linksData) ? linksData as TrackedLinkWithCampaign[] : [];
    setActiveLinks(links);

    const acceptedIds = new Set(links.map((l) => l.campaign_id));
    const campaigns = Array.isArray(campaignsData) ? campaignsData : [];
    setAvailableCampaigns(campaigns.filter((c: Campaign) => !acceptedIds.has(c.id)));

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("clicks")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clicks" },
        () => { loadData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData, supabase]);

  async function acceptCampaign(campaignId: string) {
    setAccepting(campaignId);

    const res = await fetch("/api/echo/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId }),
    });

    if (res.ok) {
      showToast(t("echo.dashboard.accepted"), "success");
      await loadData();
      // Show notification prompt after first campaign acceptance
      if (activeLinks.length === 0 && canAskNotification()) {
        setShowNotifPrompt(true);
      }
    } else {
      const data = await res.json();
      showToast(data.error || t("common.error"), "error");
    }
    setAccepting(null);
  }

  function copyLink(shortCode: string) {
    navigator.clipboard.writeText(getTrackingUrl(shortCode));
    showToast(t("echo.dashboard.copied"), "success");
  }

  async function handleSmartShare(shortCode: string, campaignId: string, creativeUrls?: string[]) {
    const url = getTrackingUrl(shortCode);
    const firstImage = creativeUrls?.find(u => !u.match(/\.(mp4|webm)/));

    if (firstImage) {
      setSharing(campaignId);
      const result = await shareCampaignToWhatsApp(firstImage, url, campaignId);
      if (result === "shared" || result === "fallback") {
        showToast("📷 Image téléchargée ! Ajoute-la à ton statut WhatsApp.", "success");
      }
      // Track share method
      try {
        await fetch("/api/echo/track-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, shareMethod: result === "shared" ? "image_and_link" : result === "fallback" ? "fallback_download" : "link_only" }),
        });
      } catch {}
      setSharing(null);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
      try {
        await fetch("/api/echo/track-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, shareMethod: "link_only" }),
        });
      } catch {}
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-32 rounded-xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
        <div className="skeleton h-10 rounded-xl" />
        <div className="skeleton h-36 rounded-xl" />
      </div>
    );
  }

  const totalClicks = activeLinks.reduce((sum, l) => sum + l.click_count, 0);
  const totalEarnings = activeLinks.reduce(
    (sum, l) => sum + Math.floor(l.click_count * (l.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100), 0
  );
  const hasActiveCampaigns = availableCampaigns.length > 0 || activeLinks.some((l) => l.campaigns?.status === "active");
  const balance = user?.balance || 0;
  const totalEarned = user?.total_earned || 0;

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {ToastComponent}

      {/* Campaign detail modal */}
      {selectedLink?.campaigns && (
        <CampaignDetailModal
          campaign={selectedLink.campaigns}
          link={selectedLink}
          open={!!selectedLink}
          onClose={() => setSelectedLink(null)}
        />
      )}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {/* Greeting + avatar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">
            {t("echo.dashboard.greeting", { name: user?.name?.split(" ")[0] || "" })}
          </h1>
          <p className="text-xs text-white/40 mt-0.5">{t("echo.dashboard.yourPulse")}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
      </div>

      {/* Earnings card — with contextual CTAs */}
      <div className="earnings-card-bg rounded-2xl p-5 mb-5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">{t("echo.dashboard.availableBalance")}</p>
            <p className="text-3xl font-black tracking-tight">{formatFCFA(balance)}</p>
            <p className="text-[10px] text-white/30 mt-1">
              {t("echo.dashboard.totalEarned")} {formatFCFA(totalEarned)}
            </p>
          </div>
          {balance > 0 && (
            <button
              onClick={() => window.location.href = "/earnings"}
              className="btn-primary text-xs !py-2.5 !px-4 shrink-0"
            >
              {t("echo.dashboard.withdraw")}
            </button>
          )}
        </div>

        {/* Contextual message */}
        {balance === 0 && totalEarned > 0 && (
          <p className="text-xs text-white/40 mt-3 flex items-center gap-1.5">
            <span>💡</span>
            {t("echo.dashboard.balanceZeroEarned")}
          </p>
        )}
        {balance === 0 && totalEarned === 0 && (
          <div className="mt-3">
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <span>🎯</span>
              {t("echo.dashboard.balanceZeroNew")}
            </p>
            <button
              onClick={() => setTab("discover")}
              className="text-xs text-primary font-bold mt-2"
            >
              {t("echo.dashboard.seeRythmes")} →
            </button>
          </div>
        )}
      </div>

      {/* Streak display */}
      {gamification && (
        <div className="mb-5">
          <StreakDisplay streak={gamification.streak} hasActiveCampaigns={hasActiveCampaigns} />
        </div>
      )}

      {/* Tier progress */}
      {gamification?.user && (
        <div className="mb-5">
          <TierProgress
            tier={gamification.user.tier}
            tierBonusPercent={gamification.user.tier_bonus_percent}
            totalClicks={gamification.user.total_valid_clicks}
          />
        </div>
      )}

      {/* Stats row — renamed labels */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="live-dot !w-[6px] !h-[6px]" />
          </div>
          <span className="text-lg font-black block">{totalClicks}</span>
          <span className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.validClicks")}</span>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-lg font-black block text-accent">{formatFCFA(totalEarnings)}</span>
          <span className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.fcfaEarned")}</span>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-lg font-black block">{activeLinks.length}</span>
          <span className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.rythmesJoined")}</span>
        </div>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: "active", label: t("echo.dashboard.myRythmes"), count: activeLinks.length },
          { key: "discover", label: t("echo.dashboard.discover"), count: availableCampaigns.length },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {/* Active campaigns */}
      {tab === "active" ? (
        <div className="space-y-3">
          {activeLinks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-semibold mb-1">{t("echo.dashboard.noActiveRythme")}</p>
              <p className="text-xs text-white/30 mb-4">
                {t("echo.dashboard.discoverCampaigns")}
              </p>
              <button
                onClick={() => setTab("discover")}
                className="btn-primary text-xs !py-2 !px-6"
              >
                {t("echo.dashboard.discover")}
              </button>
            </div>
          ) : (
            activeLinks.map((link) => {
              const isShareable = link.campaigns?.status === "active";
              return (
                <div key={link.id} className="glass-card overflow-hidden">
                  {/* Creative media — clickable to open details */}
                  {link.campaigns?.creative_urls && link.campaigns.creative_urls.length > 0 && (
                    <div
                      className="flex gap-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-pointer"
                      onClick={() => setSelectedLink(link)}
                    >
                      {link.campaigns.creative_urls.slice(0, 3).map((url, j) => (
                        url.match(/\.(mp4|webm)/) ? (
                          <video key={j} src={url} className="w-full h-36 object-cover snap-center flex-shrink-0" />
                        ) : (
                          <img key={j} src={url} alt="" className="w-full h-36 object-cover snap-center flex-shrink-0" />
                        )
                      ))}
                    </div>
                  )}
                  <div className="p-4">
                    <div
                      className="flex items-start justify-between mb-2 cursor-pointer"
                      onClick={() => setSelectedLink(link)}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <h3 className="font-bold text-sm truncate">{link.campaigns?.title}</h3>
                        <p className="text-xs text-white/30 mt-0.5 line-clamp-2">{link.campaigns?.description}</p>
                      </div>
                      <span className={`badge-${link.campaigns?.status || "active"} shrink-0 text-[10px]`}>
                        {link.campaigns?.status === "active" ? t("common.active") : link.campaigns?.status === "completed" ? t("common.finished") : link.campaigns?.status}
                      </span>
                    </div>

                    {/* Stats inline */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <span className="font-semibold">{link.click_count}</span>
                      </div>
                      <div className="text-xs font-bold text-accent">
                        {formatFCFA(Math.floor(link.click_count * (link.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100))}
                      </div>
                      <div className="text-[10px] text-white/30">
                        {link.campaigns?.cpc} FCFA/{t("common.clicks")}
                      </div>
                    </div>

                    {/* Action buttons — disabled if campaign not active */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => isShareable ? handleSmartShare(link.short_code, link.campaign_id, link.campaigns?.creative_urls) : setSelectedLink(link)}
                        disabled={sharing === link.campaign_id}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                          isShareable
                            ? "bg-primary hover:bg-primary/90 text-white"
                            : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {sharing === link.campaign_id ? (
                          <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Préparation...</>
                        ) : (
                          <>📲 Partager sur mon statut</>
                        )}
                      </button>
                      <button
                        onClick={() => isShareable ? copyLink(link.short_code) : setSelectedLink(link)}
                        className={`w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isShareable ? "active:bg-white/10 text-white/60" : "opacity-30 cursor-not-allowed"}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        🔗 Copier le lien
                      </button>
                    </div>
                    {isShareable && (
                      <p className="text-white/30 text-[10px] text-center mt-2">
                        📱 L&apos;image sera téléchargée, ajoute-la à ton statut WhatsApp
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {availableCampaigns.length === 0 ? (
            <div className="glass-card p-6 text-center space-y-4">
              <div className="text-3xl mb-1">🔔</div>
              <p className="text-sm font-semibold">{t("echo.dashboard.noAvailable")}</p>
              <p className="text-xs text-white/30">{t("echo.dashboard.notifHint")}</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => window.location.href = "/profil"}
                  className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold"
                >
                  🤝 {t("echo.dashboard.inviteFriend")}
                </button>
                <button
                  onClick={() => window.location.href = "/leaderboard"}
                  className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold"
                >
                  🏆 {t("gamification.leaderboard")}
                </button>
              </div>
            </div>
          ) : (
            availableCampaigns.map((campaign) => (
              <div key={campaign.id} className="glass-card overflow-hidden">
                {/* Creative media — clickable */}
                {campaign.creative_urls && campaign.creative_urls.length > 0 && (
                  <div
                    className="flex gap-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    {campaign.creative_urls.map((url, j) => (
                      url.match(/\.(mp4|webm)/) ? (
                        <video key={j} src={url} className="w-full h-40 object-cover snap-center flex-shrink-0" controls />
                      ) : (
                        <img key={j} src={url} alt={`${campaign.title} ${j + 1}`} className="w-full h-40 object-cover snap-center flex-shrink-0" />
                      )
                    ))}
                  </div>
                )}
                <div className="p-4">
                  <h3
                    className="font-bold text-sm mb-1 cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    {campaign.title}
                  </h3>
                  <p className="text-xs text-white/30 mb-3 line-clamp-2">{campaign.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-primary">{campaign.cpc} FCFA / {t("common.clicks")}</span>
                    <span className="text-xs text-white/40">
                      {formatFCFA(campaign.budget - campaign.spent)} {t("common.remaining")}
                    </span>
                  </div>

                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-primary rounded-full"
                      style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                    />
                  </div>

                  <button
                    onClick={() => acceptCampaign(campaign.id)}
                    disabled={accepting === campaign.id}
                    className="btn-primary w-full text-sm !py-3 text-center disabled:opacity-50"
                  >
                    {accepting === campaign.id ? t("echo.dashboard.accepting") : t("echo.dashboard.acceptRythme")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Push notification prompt — after first campaign accepted */}
      {showNotifPrompt && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-gray-800 p-4 z-50 safe-area-bottom">
          <div className="max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔔</span>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">
                  Ne manque jamais un nouveau rythme!
                </h4>
                <p className="text-gray-400 text-xs mt-1">
                  Active les notifications pour être le premier à partager et gagner plus.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  await requestNotificationPermission();
                  setShowNotifPrompt(false);
                }}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                Activer 🔔
              </button>
              <button
                onClick={() => setShowNotifPrompt(false)}
                className="px-4 text-gray-500 text-sm"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
