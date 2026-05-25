"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import { useTranslation } from "@/lib/i18n";
import type { User, TrackedLinkWithCampaign, Campaign } from "@/lib/types";
import { requestNotificationPermission, canAskNotification } from "@/lib/notifications";
import { getActiveTheme } from "@/lib/theme";
import CampaignMiniCard from "@/components/echo/CampaignMiniCard";
import WelcomeBanner from "@/components/echo/onboarding/WelcomeBanner";

export default function EchoDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeLinks, setActiveLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<TrackedLinkWithCampaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [clickStats, setClickStats] = useState<{ total: number; valid: number; invalid: number; validity_rate: number } | null>(null);
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

    if (userRes.ok) {
      setUser(userData);
      if (userData.status === "suspended") {
        fetch("/api/echo/click-stats").then(r => r.ok ? r.json() : null).then(d => {
          if (d) setClickStats(d);
        }).catch(() => {});
      }
    }

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
      if (activeLinks.length === 0 && canAskNotification()) {
        setShowNotifPrompt(true);
      }
    } else {
      const data = await res.json();
      showToast(data.error || t("common.error"), "error");
    }
    setAccepting(null);
  }



  if (loading) {
    return (
      <div className="px-4 py-5 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
        <div className="skeleton h-10 rounded-xl" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }

  const theme = getActiveTheme();
  const totalClicks = activeLinks.reduce((sum, l) => sum + l.click_count, 0);
  const totalEarnings = activeLinks.reduce(
    (sum, l) => sum + Math.floor(l.click_count * (l.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100), 0
  );
  const balance = user?.available_balance ?? user?.balance ?? 0;
  const pendingBalance = user?.pending_balance ?? 0;
  const totalEarned = user?.total_earned || 0;
  const activeCount = activeLinks.filter(l => l.campaigns?.status === "active").length;

  return (
    <div className="px-4 py-5">
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

      {/* Top bar: greeting + avatar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold font-syne">
              {t("echo.dashboard.greeting", { name: user?.name?.split(" ")[0] || "" })}
            </h1>
            {user?.is_founding_echo && (
              <span className="text-sm" title="Écho Fondateur">&#129351;</span>
            )}
          </div>
          <p className="text-xs text-white/35 mt-0.5">{t("echo.dashboard.yourPulse")}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/30 flex items-center justify-center text-sm font-bold text-[#1D9E75]">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
      </div>

      {/* Suspension banner */}
      {user?.status === "suspended" && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden">
          <div className="bg-red-500/10 px-5 py-3 flex items-center gap-2.5 border-b border-red-500/20">
            <span className="text-lg">&#9940;</span>
            <h3 className="font-bold text-red-400">{t("echo.dashboard.suspendedTitle")}</h3>
          </div>
          <div className="p-5">
            <p className="text-sm text-white/60 mb-4">{t("echo.dashboard.suspendedDesc")}</p>
            {clickStats && (
              <div className="rounded-xl bg-white/5 p-4 mb-4">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">{t("echo.dashboard.clickQuality")}</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <span className="text-lg font-black block">{clickStats.total}</span>
                    <span className="text-[9px] text-white/40">{t("echo.dashboard.totalClicks")}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-black text-emerald-400 block">{clickStats.valid}</span>
                    <span className="text-[9px] text-white/40">{t("echo.dashboard.validClicks2")}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-black text-red-400 block">{clickStats.invalid}</span>
                    <span className="text-[9px] text-white/40">{t("echo.dashboard.invalidClicks")}</span>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      clickStats.validity_rate >= 70 ? "bg-emerald-500" :
                      clickStats.validity_rate >= 40 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${clickStats.validity_rate}%` }}
                  />
                </div>
                <p className="text-xs text-white/30 mt-1.5 text-right">
                  {t("echo.dashboard.validityRate")} <span className={`font-bold ${
                    clickStats.validity_rate >= 70 ? "text-emerald-400" :
                    clickStats.validity_rate >= 40 ? "text-yellow-400" : "text-red-400"
                  }`}>{clickStats.validity_rate}%</span>
                </p>
              </div>
            )}
            <p className="text-xs text-white/40 mb-4">{t("echo.dashboard.suspendedAppeal")}</p>
            <button
              onClick={() => window.open(`https://wa.me/221781362728?text=${encodeURIComponent(t("echo.dashboard.suspendedWhatsApp"))}`, "_blank")}
              className="w-full py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#25D366]/20 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {t("echo.dashboard.contactSupport")}
            </button>
          </div>
        </div>
      )}

      {/* Independence Day banner */}
      {theme === "independence_day" && (
        <div className="bg-gradient-to-r from-green-600/30 via-yellow-500/20 to-red-600/30 border border-green-500/30 rounded-xl p-4 mb-5 text-center">
          <h3 className="text-white font-bold text-lg">{t("echo.dashboard.independenceTitle")}</h3>
          <p className="text-gray-300 text-sm">{t("echo.dashboard.independenceDesc")}</p>
        </div>
      )}

      {/* Welcome banner for users who just completed onboarding */}
      {user && user.interests_completed_at && user.platforms && user.platforms.length > 0 && activeLinks.length === 0 && (
        <WelcomeBanner />
      )}

      {/* Earnings hero card — teal identity */}
      <div className="echo-earnings-bg rounded-2xl p-5 mb-5 border border-[#1D9E75]/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1">{t("echo.dashboard.availableBalance")}</p>
            <p className="text-3xl font-black tracking-tight text-[#D35400]">{formatFCFA(balance)}</p>
            {pendingBalance > 0 && (
              <p className="text-[10px] text-[#1D9E75]/70 mt-0.5 font-semibold">
                {t("echo.dashboard.pendingBalance", { amount: formatFCFA(pendingBalance) })}
              </p>
            )}
            <p className="text-[10px] text-white/30 mt-0.5">
              {t("echo.dashboard.totalEarned")} <span className="text-[#D35400]/80">{formatFCFA(totalEarned)}</span>
            </p>
          </div>
          {balance > 0 && (
            <button
              onClick={() => window.location.href = "/earnings"}
              className="bg-[#1D9E75] hover:bg-[#178a65] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shrink-0"
            >
              {t("echo.dashboard.withdraw")}
            </button>
          )}
        </div>
        {balance === 0 && totalEarned === 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <span>🎯</span>
              {t("echo.dashboard.balanceZeroNew")}
            </p>
          </div>
        )}
        {balance === 0 && totalEarned > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <span>💡</span>
              {t("echo.dashboard.balanceZeroEarned")}
            </p>
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="live-dot !w-[6px] !h-[6px]" />
          </div>
          <span className="text-lg font-black block">{totalClicks}</span>
          <span className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.validClicks")}</span>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <span className="text-lg font-black block text-[#D35400]">{formatFCFA(totalEarnings)}</span>
          <span className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.fcfaEarned")}</span>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <span className="text-lg font-black block">{activeCount}</span>
          <span className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.rythmesJoined")}</span>
        </div>
      </div>

      {/* Active campaigns strip */}
      {activeLinks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold font-syne">{t("echo.dashboard.myRythmes")}</h2>
            <button
              onClick={() => window.location.href = "/rythmes"}
              className="text-[11px] text-[#1D9E75] font-semibold"
            >
              {t("echo.dashboard.seeAll")} →
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {activeLinks.slice(0, 5).map((link) => (
              <CampaignMiniCard
                key={link.id}
                link={link}
                onClick={() => setSelectedLink(link)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Discover campaigns section */}
      {availableCampaigns.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold font-syne">{t("echo.dashboard.discover")}</h2>
            <span className="text-[10px] text-white/30 font-semibold">
              {availableCampaigns.length} {t("echo.rythmes.available")}{availableCampaigns.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {availableCampaigns.slice(0, 2).map((campaign) => (
              <div key={campaign.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                {campaign.creative_urls && campaign.creative_urls.length > 0 && (
                  <div
                    className="flex gap-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    {campaign.creative_urls.map((url, j) => (
                      url.match(/\.(mp4|webm)/) ? (
                        <video key={j} src={url} className="w-full h-36 object-cover snap-center flex-shrink-0" controls />
                      ) : (
                        <img key={j} src={url} alt={`${campaign.title} ${j + 1}`} className="w-full h-36 object-cover snap-center flex-shrink-0" />
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
                    <span className="text-sm font-bold text-[#D35400]">{campaign.cpc} FCFA / {t("common.clicks")}</span>
                    <span className="text-xs text-white/40">
                      {formatFCFA(campaign.budget - campaign.spent)} {t("common.remaining")}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-[#1D9E75] rounded-full"
                      style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                    />
                  </div>
                  <button
                    onClick={() => acceptCampaign(campaign.id)}
                    disabled={accepting === campaign.id}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#1D9E75] hover:bg-[#178a65] text-white transition disabled:opacity-50"
                  >
                    {accepting === campaign.id ? t("echo.dashboard.accepting") : t("echo.dashboard.acceptRythme")}
                  </button>
                </div>
              </div>
            ))}
            {availableCampaigns.length > 2 && (
              <button
                onClick={() => window.location.href = "/rythmes"}
                className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-semibold text-[#1D9E75] transition hover:bg-white/[0.05]"
              >
                {t("echo.dashboard.seeAll")} {t("echo.dashboard.moreAvailable", { count: availableCampaigns.length - 2 })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state — no campaigns anywhere */}
      {activeLinks.length === 0 && availableCampaigns.length === 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8 text-center mb-5">
          <div className="text-3xl mb-2">🔔</div>
          <p className="text-sm font-semibold mb-1">{t("echo.dashboard.noAvailable")}</p>
          <p className="text-xs text-white/30 mb-4">{t("echo.dashboard.notifHint")}</p>
          <button
            onClick={() => window.location.href = "/profil"}
            className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold w-full"
          >
            🤝 {t("echo.dashboard.inviteFriend")}
          </button>
        </div>
      )}

      {/* Push notification prompt */}
      {showNotifPrompt && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#111128] border-t border-[#1D9E75]/20 p-4 z-50 safe-area-bottom">
          <div className="max-w-[560px] mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔔</span>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">{t("echo.dashboard.neverMissRythme")}</h4>
                <p className="text-gray-400 text-xs mt-1">{t("echo.dashboard.enableNotifDesc")}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  await requestNotificationPermission();
                  setShowNotifPrompt(false);
                }}
                className="flex-1 bg-[#1D9E75] text-white py-2.5 rounded-lg text-sm font-medium"
              >
                {t("echo.dashboard.enableNotif")} 🔔
              </button>
              <button
                onClick={() => setShowNotifPrompt(false)}
                className="px-4 text-gray-500 text-sm"
              >
                {t("echo.dashboard.later")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
