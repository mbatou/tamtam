"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import TabBar from "@/components/ui/TabBar";
import { useToast } from "@/components/ui/Toast";
import CampaignDetailModal from "@/components/CampaignDetailModal";
import type { User, TrackedLinkWithCampaign, Campaign } from "@/lib/types";

export default function EchoDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeLinks, setActiveLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<TrackedLinkWithCampaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();

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
      showToast("Rythme accepte !", "success");
      await loadData();
    } else {
      const data = await res.json();
      showToast(data.error || "Erreur", "error");
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
    (sum, l) => sum + Math.floor(l.click_count * (l.campaigns?.cpc || 0) * 0.75), 0
  );

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
            Salut {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-xs text-white/40 mt-0.5">Ton Pulse</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
      </div>

      {/* Earnings card — compact */}
      <div className="earnings-card-bg rounded-2xl p-5 mb-5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">Solde disponible</p>
            <p className="text-3xl font-black tracking-tight">{formatFCFA(user?.balance || 0)}</p>
            <p className="text-[10px] text-white/30 mt-1">
              Total gagne: {formatFCFA(user?.total_earned || 0)}
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/earnings"}
            className="btn-primary text-xs !py-2.5 !px-4 shrink-0"
          >
            Retirer
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="live-dot !w-[6px] !h-[6px]" />
          </div>
          <span className="text-lg font-black block">{totalClicks}</span>
          <span className="text-[9px] text-white/40 font-semibold">Resonances</span>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-lg font-black block text-accent">{formatFCFA(totalEarnings)}</span>
          <span className="text-[9px] text-white/40 font-semibold">Genere</span>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="text-lg font-black block">{activeLinks.filter((l) => l.campaigns?.status === "active").length}</span>
          <span className="text-[9px] text-white/40 font-semibold">Rythmes</span>
        </div>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: "active", label: "Mes Rythmes", count: activeLinks.length },
          { key: "discover", label: "Decouvrir", count: availableCampaigns.length },
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
              <p className="text-sm font-semibold mb-1">Aucun rythme actif</p>
              <p className="text-xs text-white/30 mb-4">
                Decouvre les campagnes et commence a gagner !
              </p>
              <button
                onClick={() => setTab("discover")}
                className="btn-primary text-xs !py-2 !px-6"
              >
                Decouvrir
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
                        {link.campaigns?.status === "active" ? "Actif" : link.campaigns?.status === "completed" ? "Termine" : link.campaigns?.status}
                      </span>
                    </div>

                    {/* Stats inline */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <span className="font-semibold">{link.click_count}</span>
                      </div>
                      <div className="text-xs font-bold text-accent">
                        {formatFCFA(Math.floor(link.click_count * (link.campaigns?.cpc || 0) * 0.75))}
                      </div>
                      <div className="text-[10px] text-white/30">
                        {link.campaigns?.cpc} FCFA/clic
                      </div>
                    </div>

                    {/* Action buttons — disabled if campaign not active */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => isShareable ? copyLink(link.short_code) : setSelectedLink(link)}
                        className={`flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isShareable ? "active:bg-white/10" : "opacity-30 cursor-not-allowed"}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copier
                      </button>
                      <button
                        onClick={() => isShareable ? shareWhatsApp(link.short_code, link.campaigns?.title || "", link.campaigns?.creative_urls) : setSelectedLink(link)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${isShareable ? "bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] active:bg-[#25D366]/20" : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Partager
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {availableCampaigns.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-3xl mb-2">🎵</div>
              <p className="text-sm font-semibold mb-1">Aucun rythme disponible</p>
              <p className="text-xs text-white/30">Reviens bientot !</p>
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
                    <span className="text-sm font-bold text-primary">{campaign.cpc} FCFA / clic</span>
                    <span className="text-xs text-white/40">
                      {formatFCFA(campaign.budget - campaign.spent)} restant
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
                    {accepting === campaign.id ? "Acceptation..." : "Accepter le Rythme"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
