"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import type { User, TrackedLinkWithCampaign, Campaign } from "@/lib/types";

export default function EchoDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeLinks, setActiveLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [tab, setTab] = useState<"active" | "discover">("active");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
    // Subscribe to realtime click updates
    const channel = supabase
      .channel("clicks")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clicks" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [userRes, linksRes, campaignsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", session.user.id).single(),
      supabase
        .from("tracked_links")
        .select("*, campaigns(*)")
        .eq("echo_id", session.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

    if (userRes.data) setUser(userRes.data);
    if (linksRes.data) setActiveLinks(linksRes.data as TrackedLinkWithCampaign[]);

    // Filter out campaigns already accepted
    const acceptedIds = new Set(linksRes.data?.map((l) => l.campaign_id) || []);
    const available = (campaignsRes.data || []).filter((c) => !acceptedIds.has(c.id));
    setAvailableCampaigns(available);

    setLoading(false);
  }

  async function acceptCampaign(campaignId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Generate unique short code
    let shortCode = Math.random().toString(36).substring(2, 8);

    const { error } = await supabase.from("tracked_links").insert({
      campaign_id: campaignId,
      echo_id: session.user.id,
      short_code: shortCode,
    });

    if (error) {
      if (error.code === "23505") {
        // Duplicate — retry with different code
        shortCode = Math.random().toString(36).substring(2, 8);
        await supabase.from("tracked_links").insert({
          campaign_id: campaignId,
          echo_id: session.user.id,
          short_code: shortCode,
        });
      }
    }

    loadData();
  }

  function copyLink(shortCode: string) {
    navigator.clipboard.writeText(getTrackingUrl(shortCode));
    setCopied(shortCode);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareLink(shortCode: string, title: string) {
    const url = getTrackingUrl(shortCode);
    const text = `Découvre ${title} 👉 ${url}`;
    if (navigator.share) {
      navigator.share({ text, url });
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalClicks = activeLinks.reduce((sum, l) => sum + l.click_count, 0);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Greeting */}
      <h1 className="text-2xl font-bold mb-1">
        Ton Pulse
      </h1>
      <p className="text-sm text-white/40 mb-6">
        Salut {user?.name?.split(" ")[0]} 👋
      </p>

      {/* Earnings card */}
      <div className="glass-card p-6 mb-6 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-white/40 font-semibold mb-1">Solde disponible</p>
            <p className="text-3xl font-black">{formatFCFA(user?.balance || 0)}</p>
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
        <StatCard label="Résonances" value={totalClicks.toString()} accent="orange" />
        <StatCard
          label="Rythmes actifs"
          value={activeLinks.filter((l) => l.campaigns?.status === "active").length.toString()}
          accent="teal"
        />
        <StatCard label="Classement" value="#—" accent="purple" />
      </div>

      {/* Tabs */}
      <div className="flex mb-6 glass-card p-1">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            tab === "active" ? "bg-gradient-primary text-white" : "text-white/40"
          }`}
        >
          Mes Rythmes ({activeLinks.length})
        </button>
        <button
          onClick={() => setTab("discover")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            tab === "discover" ? "bg-gradient-primary text-white" : "text-white/40"
          }`}
        >
          Découvrir ({availableCampaigns.length})
        </button>
      </div>

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
            activeLinks.map((link) => (
              <div key={link.id} className="glass-card p-5">
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
                    {copied === link.short_code ? "Copié !" : "Copier le lien"}
                  </button>
                  <button
                    onClick={() => shareLink(link.short_code, link.campaigns?.title || "")}
                    className="flex-1 btn-primary text-xs !py-2 text-center"
                  >
                    Propager l&apos;Écho
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
            availableCampaigns.map((campaign) => (
              <div key={campaign.id} className="glass-card p-5">
                <h3 className="font-bold text-sm mb-1">{campaign.title}</h3>
                <p className="text-xs text-white/30 mb-3">{campaign.description}</p>
                <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
                  <span>{campaign.cpc} FCFA / clic</span>
                  <span>
                    Budget: {formatFCFA(campaign.budget - campaign.spent)} restant
                  </span>
                </div>
                <button
                  onClick={() => acceptCampaign(campaign.id)}
                  className="btn-primary w-full text-xs !py-2.5 text-center"
                >
                  Accepter le Rythme
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
