"use client";

import { useEffect, useState } from "react";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { Campaign, TrackedLinkWithCampaign } from "@/lib/types";

export default function RythmesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const { showToast, ToastComponent } = useToast();

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
      showToast("Rythme accepte !", "success");
      await loadData();
    } else {
      const err = await res.json();
      showToast(err.error || "Erreur", "error");
    }
    setAccepting(null);
  }

  function copyLink(shortCode: string) {
    navigator.clipboard.writeText(getTrackingUrl(shortCode));
    showToast("Lien copie !", "success");
  }

  function shareWhatsApp(shortCode: string, title: string, creativeUrls?: string[]) {
    const url = getTrackingUrl(shortCode);
    let text = `${title}\n\n`;

    if (creativeUrls && creativeUrls.length > 0) {
      const firstImage = creativeUrls.find(u => !u.match(/\.(mp4|webm)/));
      if (firstImage) {
        text += `${firstImage}\n\n`;
      }
    }

    text += `Clique ici 👉 ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {ToastComponent}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Rythmes</h1>
        <span className="text-xs text-white/30 font-semibold">
          {campaigns.length} disponible{campaigns.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const myLink = myLinks.find((l) => l.campaign_id === campaign.id);
          const isAccepted = acceptedIds.has(campaign.id);

          return (
            <div key={campaign.id} className="glass-card overflow-hidden">
              {/* Creative media — full width swipeable */}
              {campaign.creative_urls && campaign.creative_urls.length > 0 && (
                <div className="flex gap-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
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
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm flex-1 mr-2">{campaign.title}</h3>
                  {isAccepted ? (
                    <span className="badge-active text-[10px] shrink-0">Accepte</span>
                  ) : (
                    <span className="badge-pending text-[10px] shrink-0">Nouveau</span>
                  )}
                </div>
                <p className="text-xs text-white/30 mb-3 line-clamp-2">{campaign.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-primary">{campaign.cpc} FCFA / clic</span>
                  <span className="text-xs text-white/40">
                    {formatFCFA(campaign.budget - campaign.spent)} restant
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
                        {formatFCFA(Math.floor(myLink.click_count * campaign.cpc * 0.75))} gagne
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyLink(myLink.short_code)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold active:bg-white/10 transition flex items-center justify-center gap-1.5"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copier
                      </button>
                      <button
                        onClick={() => shareWhatsApp(myLink.short_code, campaign.title, campaign.creative_urls)}
                        className="flex-1 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-bold active:bg-[#25D366]/20 transition flex items-center justify-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Partager
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => acceptCampaign(campaign.id)}
                    disabled={accepting === campaign.id}
                    className="btn-primary w-full text-sm !py-3 text-center disabled:opacity-50"
                  >
                    {accepting === campaign.id ? "Acceptation..." : "Accepter le Rythme"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {campaigns.length === 0 && (
          <div className="glass-card p-8 text-center">
            <div className="text-3xl mb-2">🎵</div>
            <p className="text-sm font-semibold mb-1">Aucun rythme disponible</p>
            <p className="text-xs text-white/30">Reviens bientot, de nouvelles campagnes arrivent !</p>
          </div>
        )}
      </div>
    </div>
  );
}
