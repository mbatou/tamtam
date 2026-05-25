"use client";

import { useEffect, useState } from "react";
import { formatFCFA, getTrackingUrl, timeAgo } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import { useTranslation } from "@/lib/i18n";
import type { Campaign, TrackedLinkWithCampaign } from "@/lib/types";
import { requestNotificationPermission, canAskNotification } from "@/lib/notifications";
import { shareCampaignToWhatsApp } from "@/lib/share-utils";
import { trackEvent } from "@/lib/analytics";
import StatusBadge from "@/components/echo/StatusBadge";

export default function RythmesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedLink, setSelectedLink] = useState<TrackedLinkWithCampaign | undefined>(undefined);
  const [sharing, setSharing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "mine" | "done">("available");
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [campaignsRes, linksRes] = await Promise.all([
      fetch("/api/echo/campaigns"),
      fetch("/api/echo/links"),
    ]);

    const campaignsData = await campaignsRes.json();
    const linksData = await linksRes.json();

    setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    setMyLinks(Array.isArray(linksData) ? linksData as TrackedLinkWithCampaign[] : []);
    setLoading(false);
  }

  async function acceptCampaign(campaignId: string) {
    setAccepting(campaignId);
    const res = await fetch("/api/echo/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId }),
    });

    if (res.ok) {
      trackEvent.echoAcceptCampaign(campaignId);
      showToast(t("echo.dashboard.accepted"), "success");
      await loadData();
    } else {
      const err = await res.json();
      showToast(err.error || t("common.error"), "error");
    }
    setAccepting(null);
  }

  function copyLink(shortCode: string) {
    navigator.clipboard.writeText(getTrackingUrl(shortCode));
    trackEvent.echoShareLink("copy");
    showToast(t("echo.dashboard.copied"), "success");
  }

  async function handleSmartShare(shortCode: string, campaignId: string, creativeUrls?: string[], campaignObjective?: string) {
    const url = getTrackingUrl(shortCode);
    const objective = campaignObjective || "traffic";
    const firstImage = creativeUrls?.find(u => !u.match(/\.(mp4|webm)/));

    if (objective === "awareness" && !firstImage) {
      showToast(t("echo.rythmes.imageMissing"), "error");
      return;
    }

    if (firstImage) {
      setSharing(campaignId);
      const result = await shareCampaignToWhatsApp(firstImage, url, campaignId);
      if (result === "shared") {
        trackEvent.echoShareLink("native");
        showToast(`✅ ${t("common.shareSent")}`, "success");
      } else if (result === "fallback") {
        trackEvent.echoShareLink("whatsapp");
        showToast(`✅ ${t("common.shareSent")}`, "success");
      }
      try {
        await fetch("/api/echo/track-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, shareMethod: result === "shared" ? "native_share" : result === "fallback" ? "whatsapp_link" : "cancelled" }),
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

  function openDetail(campaign: Campaign) {
    const myLink = myLinks.find((l) => l.campaign_id === campaign.id);
    setSelectedCampaign(campaign);
    setSelectedLink(myLink);
  }

  if (loading) {
    return (
      <div className="px-4 py-5 space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-10 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
      </div>
    );
  }

  const acceptedIds = new Set(myLinks.map((l) => l.campaign_id));
  const availableCampaigns = campaigns.filter((c) => c.status === "active" && !acceptedIds.has(c.id));
  const myActiveLinks = myLinks.filter((l) => l.campaigns?.status === "active");
  const finishedLinks = myLinks.filter((l) => l.campaigns?.status !== "active");

  const tabs = [
    { key: "available" as const, label: t("echo.rythmes.tabAvailable"), count: availableCampaigns.length },
    { key: "mine" as const, label: t("echo.rythmes.tabMine"), count: myActiveLinks.length },
    { key: "done" as const, label: t("echo.rythmes.tabDone"), count: finishedLinks.length },
  ];

  return (
    <div className="px-4 py-5">
      {ToastComponent}

      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          link={selectedLink}
          open={!!selectedCampaign}
          onClose={() => { setSelectedCampaign(null); setSelectedLink(undefined); }}
        />
      )}

      <h1 className="text-xl font-bold font-syne mb-4">{t("echo.rythmes.title")}</h1>

      {/* 3-tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === tab.key
                ? "bg-[#1D9E75] text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label} {tab.count > 0 && <span className="opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* TAB: Available campaigns */}
      {activeTab === "available" && (
        <div className="space-y-3">
          {availableCampaigns.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm font-semibold mb-1">{t("echo.rythmes.noAvailable")}</p>
                <p className="text-xs text-white/30">{t("echo.rythmes.notifHint")}</p>
              </div>
              {canAskNotification() && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
                  <div className="text-3xl mb-3">🔔</div>
                  <h3 className="text-white font-bold mb-1">{t("echo.rythmes.newRythmesSoon")}</h3>
                  <p className="text-gray-400 text-sm mb-4">{t("echo.rythmes.notifFirstToShare")}</p>
                  <button
                    onClick={async () => {
                      const granted = await requestNotificationPermission();
                      if (granted) showToast(t("echo.rythmes.notifActivated"), "success");
                    }}
                    className="bg-[#1D9E75] text-white px-6 py-2.5 rounded-lg text-sm font-medium"
                  >
                    {t("echo.rythmes.enableNotifications")} 🔔
                  </button>
                </div>
              )}
              {typeof window !== "undefined" && "Notification" in window && !canAskNotification() && Notification.permission === "granted" && (
                <div className="text-center text-gray-500 text-sm mt-2">
                  ✓ {t("echo.rythmes.notifGranted")}
                </div>
              )}
            </div>
          ) : (
            availableCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                {campaign.creative_urls && campaign.creative_urls.length > 0 && (
                  <div
                    className="flex gap-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-pointer"
                    onClick={() => openDetail(campaign)}
                  >
                    {campaign.creative_urls.map((url, i) => (
                      url.match(/\.(mp4|webm)/) ? (
                        <video key={i} src={url} className="w-full h-40 object-cover snap-center flex-shrink-0" controls />
                      ) : (
                        <img key={i} src={url} alt={`${campaign.title} ${i + 1}`} className="w-full h-40 object-cover snap-center flex-shrink-0" />
                      )
                    ))}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2 cursor-pointer" onClick={() => openDetail(campaign)}>
                    <h3 className="font-bold text-sm flex-1 mr-2">{campaign.title}</h3>
                    <StatusBadge status="new" />
                  </div>
                  <p className="text-xs text-white/30 mb-2 line-clamp-2">{campaign.description}</p>
                  {campaign.target_cities && campaign.target_cities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {campaign.target_cities.map((city: string) => (
                        <span key={city} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#1D9E75]/70">📍 {city}</span>
                      ))}
                    </div>
                  )}
                  {(campaign.objective || "traffic") === "awareness" && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300 mb-2">
                      {t("echo.rythmes.awarenessHint")}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-[#D35400]">{campaign.cpc} FCFA / {t("common.clicks")}</span>
                    <span className="text-xs text-white/40">{formatFCFA(campaign.budget - campaign.spent)} {t("common.remaining")}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }} />
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
            ))
          )}
        </div>
      )}

      {/* TAB: My active Rythmes */}
      {activeTab === "mine" && (
        <div className="space-y-3">
          {myActiveLinks.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-semibold mb-1">{t("echo.dashboard.noActiveRythme")}</p>
              <p className="text-xs text-white/30 mb-4">{t("echo.dashboard.discoverCampaigns")}</p>
              <button
                onClick={() => setActiveTab("available")}
                className="bg-[#1D9E75] text-white text-xs font-bold py-2 px-6 rounded-xl"
              >
                {t("echo.dashboard.discover")}
              </button>
            </div>
          ) : (
            myActiveLinks.map((link) => {
              const campaign = link.campaigns;
              if (!campaign) return null;
              const isShareable = campaign.status === "active";
              const earned = Math.floor(link.click_count * campaign.cpc * ECHO_SHARE_PERCENT / 100);

              return (
                <div key={link.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                  {campaign.creative_urls && campaign.creative_urls.length > 0 && (
                    <div
                      className="flex gap-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-pointer"
                      onClick={() => openDetail(campaign)}
                    >
                      {campaign.creative_urls.slice(0, 3).map((url, j) => (
                        url.match(/\.(mp4|webm)/) ? (
                          <video key={j} src={url} className="w-full h-36 object-cover snap-center flex-shrink-0" />
                        ) : (
                          <img key={j} src={url} alt="" className="w-full h-36 object-cover snap-center flex-shrink-0" />
                        )
                      ))}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2 cursor-pointer" onClick={() => openDetail(campaign)}>
                      <h3 className="font-bold text-sm flex-1 mr-2 truncate">{campaign.title}</h3>
                      <StatusBadge status="active" />
                    </div>

                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <span className="font-semibold">{link.click_count}</span>
                      </div>
                      <span className="font-bold text-[#D35400]">{formatFCFA(earned)} {t("common.earned")}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => isShareable ? handleSmartShare(link.short_code, campaign.id, campaign.creative_urls, campaign.objective) : openDetail(campaign)}
                        disabled={sharing === campaign.id}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                          isShareable
                            ? "bg-[#1a8d4a] hover:bg-[#178542] text-white active:bg-[#147a3b]"
                            : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {sharing === campaign.id ? (
                          <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {t("common.preparing")}</>
                        ) : (
                          <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> {(campaign.objective || "traffic") === "awareness" ? t("echo.rythmes.shareVisualLink") : t("common.shareOnWhatsApp")}</>
                        )}
                      </button>
                      {(campaign.objective || "traffic") !== "awareness" && (
                        <button
                          onClick={() => isShareable ? copyLink(link.short_code) : openDetail(campaign)}
                          className={`w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isShareable ? "active:bg-white/10 text-white/60" : "opacity-30 cursor-not-allowed"}`}
                        >
                          🔗 {t("common.copyLink")}
                        </button>
                      )}
                    </div>
                    {isShareable && (
                      <p className="text-white/30 text-[10px] text-center mt-2">
                        📱 {t("common.shareWhatsAppHint")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: Finished campaigns */}
      {activeTab === "done" && (
        <div className="space-y-3">
          {finishedLinks.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="text-sm font-semibold mb-1">{t("echo.rythmes.noFinished")}</p>
              <p className="text-xs text-white/30">{t("echo.rythmes.finishedHint")}</p>
            </div>
          ) : (
            finishedLinks.map((link) => {
              const earned = Math.floor(link.click_count * (link.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100);
              return (
                <div key={link.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold truncate flex-1 mr-2">{link.campaigns?.title || "—"}</h3>
                    <span className="text-[10px] text-white/30">{timeAgo(link.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/40">{link.click_count} {t("echo.rythmes.clicks")}</span>
                    <span className="font-bold text-[#D35400]">{formatFCFA(earned)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Quick actions when no campaigns in any tab */}
      {campaigns.length === 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => window.location.href = "/profil"}
            className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center"
          >
            <span className="text-xl block mb-1">🤝</span>
            <span className="text-xs font-bold block">{t("echo.rythmes.inviteFriend")}</span>
            <span className="text-[10px] text-[#D35400] block mt-0.5">{t("echo.rythmes.referralBonus")}</span>
          </button>
          <button
            onClick={() => window.location.href = "/earnings"}
            className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center"
          >
            <span className="text-xl block mb-1">💰</span>
            <span className="text-xs font-bold block">{t("echo.rythmes.seeEarnings")}</span>
            <span className="text-[10px] text-white/30 block mt-0.5">{t("echo.rythmes.trackYourGains")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
