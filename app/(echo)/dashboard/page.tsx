"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import TabBar from "@/components/ui/TabBar";
import { useToast } from "@/components/ui/Toast";
import type { User, TrackedLinkWithCampaign, Campaign } from "@/lib/types";

export default function EchoDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeLinks, setActiveLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
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
      showToast("Rythme accepté !", "success");
      await loadData();
    } else {
      const data = await res.json();
      showToast(data.error || "Erreur", "error");
    }
    setAccepting(null);
  }

  function copyLink(shortCode: string) {
    navigator.clipboard.writeText(getTrackingUrl(shortCode));
    showToast("Lien copié ✓", "success");
  }

  function shareLink(shortCode: string, title: string) {
    const url = getTrackingUrl(shortCode);
    const text = `Découvre ${title} 👉 ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalClicks = activeLinks.reduce((sum, l) => sum + l.click_count, 0);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {ToastComponent}

      {/* Greeting */}
      <h1 className="text-2xl font-bold mb-1">
        Ton Pulse
      </h1>
      <p className="text-sm text-white/40 mb-6">
        Salut {user?.name?.split(" ")[0]} 👋
      </p>

      {/* Earnings card */}
      <div className="earnings-card-bg rounded-2xl p-6 mb-6 border border-primary/20 animate-pulse-glow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-white/40 font-semibold mb-1">Solde disponible</p>
            <p className="text-5xl font-black tracking-tight">{formatFCFA(user?.balance || 0)}</p>
          </div>
          <button
            onClick={() => window.location.href = "/earnings"}
            className="btn-primary text-xs !py-2 !px-4"
          >
            Retirer via {user?.mobile_money_provider === "wave" ? "Wave" : "OM"}
          </button>
        </div>
        <p className="text-xs text-white/30">
          Total gagné: {formatFCFA(user?.total_earned || 0)}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-white/40">Résonances</span>
            <span className="live-dot" />
          </div>
          <span className="text-2xl font-black">{totalClicks}</span>
        </div>
        <StatCard
          label="Rythmes actifs"
          value={activeLinks.filter((l) => l.campaigns?.status === "active").length.toString()}
          accent="teal"
        />
        <StatCard label="Classement" value="#—" accent="purple" />
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: "active", label: "Mes Rythmes", count: activeLinks.length },
          { key: "discover", label: "Découvrir", count: availableCampaigns.length },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {/* Content */}
      {tab === "active" ? (
        <div className="space-y-3">
          {activeLinks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-white/30 text-sm">
                Aucun rythme actif. Découvre les campagnes disponibles !
              </p>
            </div>
          ) : (
            activeLinks.map((link, i) => (
              <div key={link.id} className="glass-card p-5 animate-slide-up" style={{ opacity: 0, animationDelay: `${i * 0.1}s` }}>
                {/* Campaign creatives */}
                {link.campaigns?.creative_urls && link.campaigns.creative_urls.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {link.campaigns.creative_urls.slice(0, 3).map((url, j) => (
                      url.match(/\.(mp4|webm)/) ? (
                        <video key={j} src={url} className="w-20 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                      ) : (
                        <img key={j} src={url} alt="" className="w-20 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                      )
                    ))}
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-sm">{link.campaigns?.title}</h3>
                    <p className="text-xs text-white/30 mt-1">{link.campaigns?.description}</p>
                  </div>
                  <span className={`badge-${link.campaigns?.status || "active"}`}>
                    {link.campaigns?.status === "active" ? "Actif" : link.campaigns?.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
                  <span>{link.click_count} résonances</span>
                  <span>
                    {formatFCFA(
                      Math.floor(link.click_count * (link.campaigns?.cpc || 0) * 0.75)
                    )}{" "}
                    gagnés
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(link.short_code)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition"
                  >
                    Copier le lien
                  </button>
                  <button
                    onClick={() => shareLink(link.short_code, link.campaigns?.title || "")}
                    className="flex-1 py-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition flex items-center justify-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {availableCampaigns.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-white/30 text-sm">
                Aucun rythme disponible pour le moment.
              </p>
            </div>
          ) : (
            availableCampaigns.map((campaign, i) => (
              <div key={campaign.id} className="glass-card p-5 animate-slide-up" style={{ opacity: 0, animationDelay: `${i * 0.1}s` }}>
                {/* Campaign creatives */}
                {campaign.creative_urls && campaign.creative_urls.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {campaign.creative_urls.map((url, j) => (
                      url.match(/\.(mp4|webm)/) ? (
                        <video key={j} src={url} className="w-28 h-20 object-cover rounded-xl border border-white/10 flex-shrink-0" controls />
                      ) : (
                        <img key={j} src={url} alt={`${campaign.title} ${j + 1}`} className="w-28 h-20 object-cover rounded-xl border border-white/10 flex-shrink-0" />
                      )
                    ))}
                  </div>
                )}
                <h3 className="font-bold text-sm mb-1">{campaign.title}</h3>
                <p className="text-xs text-white/30 mb-3">{campaign.description}</p>
                <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
                  <span className="font-bold text-primary">{campaign.cpc} FCFA / clic</span>
                  <span>
                    Budget: {formatFCFA(campaign.budget - campaign.spent)} restant
                  </span>
                </div>
                <button
                  onClick={() => acceptCampaign(campaign.id)}
                  disabled={accepting === campaign.id}
                  className="btn-primary w-full text-xs !py-2.5 text-center disabled:opacity-50"
                >
                  {accepting === campaign.id ? "Acceptation..." : "Accepter le Rythme"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
