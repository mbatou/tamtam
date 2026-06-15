"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { isCpaCampaign, getEchoEarningPerConversion } from "@/lib/campaign-display";
import type { Campaign, TrackedLinkWithCampaign } from "@/lib/types";
import { shareCampaignToWhatsApp } from "@/lib/share-utils";
import { useTranslation } from "@/lib/i18n";

interface CampaignDetailModalProps {
  campaign: Campaign;
  link?: TrackedLinkWithCampaign;
  open: boolean;
  onClose: () => void;
}

export default function CampaignDetailModal({ campaign, link, open, onClose }: CampaignDetailModalProps) {
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  const isShareable = campaign.status === "active";
  const statusLabel: Record<string, string> = {
    active: "Actif",
    completed: "Terminé",
    paused: "En pause",
    rejected: "Supprimé",
    draft: "Brouillon",
  };

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(getTrackingUrl(link.short_code));
    showToast("Lien copié !", "success");
  }

  const objective = campaign.objective || "traffic";

  async function handleSmartShare() {
    if (!link) return;
    const url = getTrackingUrl(link.short_code);
    const firstImage = campaign.creative_urls?.find(u => !u.match(/\.(mp4|webm)/));

    // For awareness campaigns, image is mandatory
    if (objective === "awareness" && !firstImage) {
      showToast("Image manquante — contactez le support", "error");
      return;
    }

    if (firstImage) {
      setSharing(true);
      const result = await shareCampaignToWhatsApp(firstImage, url, campaign.id);
      if (result === "shared") {
        showToast("✅ Partage envoyé !", "success");
      } else if (result === "fallback") {
        showToast("✅ Partage envoyé !", "success");
      }
      try {
        await fetch("/api/echo/track-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: campaign.id, shareMethod: result === "shared" ? "native_share" : result === "fallback" ? "whatsapp_link" : "cancelled" }),
        });
      } catch {}
      setSharing(false);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
      try {
        await fetch("/api/echo/track-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: campaign.id, shareMethod: "link_only" }),
        });
      } catch {}
    }
  }

  async function downloadAsset(url: string, index: number) {
    setDownloading(index);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = url.split(".").pop()?.split("?")[0] || "png";
      const filename = `tamtam-${campaign.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${index + 1}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      showToast("Téléchargement lancé !", "success");
    } catch {
      showToast("Erreur de téléchargement", "error");
    }
    setDownloading(null);
  }

  return (
    <Modal open={open} onClose={onClose} title={campaign.title}>
      {ToastComponent}

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`badge-${campaign.status} text-[10px]`}>
          {statusLabel[campaign.status] || campaign.status}
        </span>
        <span className="text-xs text-white/40">
          {isCpaCampaign(campaign)
            ? `${formatFCFA(getEchoEarningPerConversion(campaign))} ${t("echo.rythmes.perConversion")}`
            : `${campaign.cpc} FCFA / ${t("common.clicks")}`}
        </span>
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="text-sm text-white/50 leading-relaxed mb-4">{campaign.description}</p>
      )}

      {/* Budget progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-white/40">Budget</span>
          <span className="text-white/60 font-semibold">
            {formatFCFA(campaign.spent)} / {formatFCFA(campaign.budget)}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary rounded-full transition-all"
            style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* My stats (if accepted) */}
      {link && (
        <div className="glass-card p-3 mb-4 flex items-center gap-4">
          <div className="text-center flex-1">
            <span className="text-lg font-black block">{link.click_count}</span>
            <span className="text-[9px] text-white/40 font-semibold">{t("common.clicks")}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center flex-1">
            {isCpaCampaign(campaign) ? (
              <>
                <span className="text-lg font-black block text-[#1D9E75]">
                  {formatFCFA(getEchoEarningPerConversion(campaign))}
                </span>
                <span className="text-[9px] text-white/40 font-semibold">{t("echo.rythmes.perConversion")}</span>
              </>
            ) : (
              <>
                <span className="text-lg font-black block text-accent">
                  {formatFCFA(Math.floor(link.click_count * campaign.cpc * ECHO_SHARE_PERCENT / 100))}
                </span>
                <span className="text-[9px] text-white/40 font-semibold">{t("common.earned")}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Creative assets — download */}
      {campaign.creative_urls && campaign.creative_urls.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-white/50 mb-2">
            Visuels ({campaign.creative_urls.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {campaign.creative_urls.map((url, i) => {
              const isVideo = !!url.match(/\.(mp4|webm)/);
              return (
                <div key={i} className="relative rounded-xl overflow-hidden group">
                  {isVideo ? (
                    <video src={url} className="w-full h-28 object-cover" />
                  ) : (
                    <img src={url} alt={`Asset ${i + 1}`} className="w-full h-28 object-cover" />
                  )}
                  {/* Download overlay */}
                  <button
                    onClick={() => downloadAsset(url, i)}
                    disabled={downloading === i}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 active:bg-black/50 transition-all flex items-center justify-center"
                  >
                    <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center opacity-70 group-hover:opacity-100 transition">
                      {downloading === i ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      )}
                    </div>
                  </button>
                  {isVideo && (
                    <div className="absolute top-1.5 left-1.5 bg-black/50 rounded px-1.5 py-0.5 text-[9px] text-white/70">
                      Vidéo
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Awareness indicator */}
      {objective === "awareness" && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300 mb-4">
          {t("echo.rythmes.awarenessHint")}
        </div>
      )}

      {/* CPA indicator */}
      {isCpaCampaign(campaign) && (
        <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-lg px-3 py-2 text-xs text-[#5DCAA5] mb-4">
          {t("echo.rythmes.cpaHint")}
        </div>
      )}

      {/* Share / copy buttons — disabled if not active */}
      {link && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSmartShare}
            disabled={!isShareable || sharing}
            className="w-full py-3 rounded-xl bg-[#1a8d4a] hover:bg-[#178542] active:bg-[#147a3b] text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sharing ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Préparation...</>
            ) : (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> {objective === "awareness" ? "Partager le visuel + lien" : "Partager sur mes réseaux"}</>
            )}
          </button>
          {objective !== "awareness" && (
            <button
              onClick={copyLink}
              disabled={!isShareable}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              🔗 Copier le lien
            </button>
          )}
        </div>
      )}

      {/* Disabled message */}
      {link && !isShareable && (
        <p className="text-[11px] text-white/30 text-center mt-2">
          Cette campagne est {statusLabel[campaign.status]?.toLowerCase() || campaign.status} — le partage est désactivé.
        </p>
      )}
    </Modal>
  );
}
