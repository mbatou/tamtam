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

export default function RythmesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedLink, setSelectedLink] = useState<TrackedLinkWithCampaign | undefined>(undefined);
  const [sharing, setSharing] = useState<string | null>(null);
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
    showToast(t("echo.dashboard.copied"), "success");
  }

  async function handleSmartShare(shortCode: string, campaignId: string, creativeUrls?: string[]) {
    const url = getTrackingUrl(shortCode);
    const firstImage = creativeUrls?.find(u => !u.match(/\.(mp4|webm)/));

    if (firstImage) {
      setSharing(campaignId);
      const result = await shareCampaignToWhatsApp(firstImage, url, campaignId);
      if (result === "shared") {
        showToast("✅ Partage envoyé !", "success");
      } else if (result === "fallback") {
        showToast("✅ Partage envoyé !", "success");
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
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
      </div>
    );
  }

  const acceptedIds = new Set(myLinks.map((l) => l.campaign_id));
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const finishedLinks = myLinks.filter((l) => l.campaigns?.status !== "active");

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {ToastComponent}

      {/* Campaign detail modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          link={selectedLink}
          open={!!selectedCampaign}
          onClose={() => { setSelectedCampaign(null); setSelectedLink(undefined); }}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">{t("echo.rythmes.title")}</h1>
        <span className="text-xs text-white/30 font-semibold">
          {activeCampaigns.length} {t("echo.rythmes.available")}{activeCampaigns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Snapchat coming soon banner */}
      <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-xl p-4 mb-4 flex items-center gap-3">
        <span className="text-2xl">👻</span>
        <div>
          <span className="text-yellow-300 font-bold text-sm">{t("snapchat.arrivingNextWeek")}</span>
          <span className="text-gray-400 text-xs block">{t("snapchat.doubleYourEarnings")}</span>
        </div>
      </div>

      {/* Active campaigns */}
      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const myLink = myLinks.find((l) => l.campaign_id === campaign.id);
          const isAccepted = acceptedIds.has(campaign.id);
          const isShareable = campaign.status === "active";

          return (
            <div key={campaign.id} className="glass-card overflow-hidden">
              {/* Creative media — clickable to open details */}
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
                <div
                  className="flex items-start justify-between mb-2 cursor-pointer"
                  onClick={() => openDetail(campaign)}
                >
                  <h3 className="font-bold text-sm flex-1 mr-2">{campaign.title}</h3>
                  {isAccepted ? (
                    <span className="badge-active text-[10px] shrink-0">{t("echo.rythmes.accepted")}</span>
                  ) : (
                    <span className="badge-pending text-[10px] shrink-0">{t("echo.rythmes.new")}</span>
                  )}
                </div>
                <p className="text-xs text-white/30 mb-2 line-clamp-2">{campaign.description}</p>
                {campaign.target_cities && campaign.target_cities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {campaign.target_cities.map((city: string) => (
                      <span key={city} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70">📍 {city}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-primary">{campaign.cpc} FCFA / {t("common.clicks")}</span>
                  <span className="text-xs text-white/40">
                    {formatFCFA(campaign.budget - campaign.spent)} {t("common.remaining")}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-primary rounded-full"
                    style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                  />
                </div>

                {isAccepted && myLink ? (
                  <div>
                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <span className="font-semibold">{myLink.click_count}</span>
                      </div>
                      <span className="font-bold text-accent">
                        {formatFCFA(Math.floor(myLink.click_count * campaign.cpc * ECHO_SHARE_PERCENT / 100))} {t("common.earned")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => isShareable ? handleSmartShare(myLink.short_code, campaign.id, campaign.creative_urls) : openDetail(campaign)}
                        disabled={sharing === campaign.id}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                          isShareable
                            ? "bg-[#1a8d4a] hover:bg-[#178542] text-white active:bg-[#147a3b]"
                            : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {sharing === campaign.id ? (
                          <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Préparation...</>
                        ) : (
                          <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Partager sur mon statut</>
                        )}
                      </button>
                      <button
                        onClick={() => isShareable ? copyLink(myLink.short_code) : openDetail(campaign)}
                        className={`w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isShareable ? "active:bg-white/10 text-white/60" : "opacity-30 cursor-not-allowed"}`}
                      >
                        🔗 Copier le lien
                      </button>
                    </div>
                    {isShareable && (
                      <p className="text-white/30 text-[10px] text-center mt-2">
                        📱 Choisis WhatsApp dans le menu de partage pour poster sur ton statut
                      </p>
                    )}
                    <div className="mt-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👻</span>
                        <div>
                          <span className="text-yellow-300 text-sm font-medium">{t("snapchat.name")}</span>
                          <span className="text-white/30 text-xs block">{t("snapchat.shareOnSnap")}</span>
                        </div>
                      </div>
                      <span className="bg-yellow-400/20 text-yellow-300 text-xs px-2.5 py-1 rounded-full font-medium">
                        {t("snapchat.comingSoon")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => acceptCampaign(campaign.id)}
                    disabled={accepting === campaign.id}
                    className="btn-primary w-full text-sm !py-3 text-center disabled:opacity-50"
                  >
                    {accepting === campaign.id ? t("echo.dashboard.accepting") : t("echo.dashboard.acceptRythme")}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state — enriched */}
        {campaigns.length === 0 && (
          <div className="space-y-4">
            <div className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">🔔</div>
              <p className="text-sm font-semibold mb-1">{t("echo.rythmes.noAvailable")}</p>
              <p className="text-xs text-white/30 mb-3">{t("echo.rythmes.notifHint")}</p>
            </div>

            {/* Notification CTA — empty rythmes */}
            {canAskNotification() && (
              <div className="bg-card rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🔔</div>
                <h3 className="text-white font-bold mb-1">Nouveaux rythmes bientôt!</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Sois le premier à partager — active les notifications pour être prévenu.
                </p>
                <button
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) showToast("Notifications activées!", "success");
                  }}
                  className="bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
                >
                  Activer les notifications 🔔
                </button>
              </div>
            )}

            {/* Reassurance when notifications already granted */}
            {typeof window !== "undefined" && "Notification" in window && !canAskNotification() && Notification.permission === "granted" && (
              <div className="text-center text-gray-500 text-sm mt-2">
                ✓ Tu seras notifié dès qu&apos;un nouveau rythme sera disponible.
              </div>
            )}

            {/* Quick actions when no campaigns */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.href = "/profil"}
                className="glass-card p-4 text-center"
              >
                <span className="text-xl block mb-1">🤝</span>
                <span className="text-xs font-bold block">{t("echo.rythmes.inviteFriend")}</span>
                <span className="text-[10px] text-accent block mt-0.5">+150 FCFA</span>
              </button>
              <button
                onClick={() => window.location.href = "/leaderboard"}
                className="glass-card p-4 text-center"
              >
                <span className="text-xl block mb-1">🏆</span>
                <span className="text-xs font-bold block">{t("echo.rythmes.seeRanking")}</span>
                <span className="text-[10px] text-white/30 block mt-0.5">{t("echo.rythmes.seeYourRank")}</span>
              </button>
            </div>

            {/* Past campaigns with results */}
            {finishedLinks.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">
                  {t("echo.rythmes.pastRythmes")}
                </h2>
                <div className="space-y-2">
                  {finishedLinks.map((link) => {
                    const earned = Math.floor(link.click_count * (link.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100);
                    return (
                      <div key={link.id} className="glass-card p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-bold truncate flex-1 mr-2">{link.campaigns?.title || "—"}</h3>
                          <span className="text-[10px] text-white/30">{timeAgo(link.created_at)}</span>
                        </div>
                        <p className="text-xs text-white/40">
                          {t("echo.rythmes.youGenerated", { clicks: link.click_count, amount: formatFCFA(earned) })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
