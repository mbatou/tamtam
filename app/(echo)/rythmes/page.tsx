"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, getTrackingUrl } from "@/lib/utils";
import type { Campaign, TrackedLinkWithCampaign } from "@/lib/types";

export default function RythmesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myLinks, setMyLinks] = useState<TrackedLinkWithCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [campaignsRes, linksRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("tracked_links").select("*, campaigns(*)").eq("echo_id", session.user.id),
    ]);

    setCampaigns(campaignsRes.data || []);
    setMyLinks((linksRes.data || []) as TrackedLinkWithCampaign[]);
    setLoading(false);
  }

  async function acceptCampaign(campaignId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const shortCode = Math.random().toString(36).substring(2, 8);
    await supabase.from("tracked_links").insert({
      campaign_id: campaignId,
      echo_id: session.user.id,
      short_code: shortCode,
    });
    loadData();
  }

  function copyLink(shortCode: string) {
    navigator.clipboard.writeText(getTrackingUrl(shortCode));
    setCopied(shortCode);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const acceptedIds = new Set(myLinks.map((l) => l.campaign_id));

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rythmes</h1>

      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const myLink = myLinks.find((l) => l.campaign_id === campaign.id);
          const isAccepted = acceptedIds.has(campaign.id);

          return (
            <div key={campaign.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-sm">{campaign.title}</h3>
                <span className="badge-active">Actif</span>
              </div>
              <p className="text-xs text-white/30 mb-3">{campaign.description}</p>

              <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
                <span>{campaign.cpc} FCFA / clic</span>
                <span>Budget: {formatFCFA(campaign.budget)}</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-all"
                  style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                />
              </div>

              {isAccepted && myLink ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(myLink.short_code)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition"
                  >
                    {copied === myLink.short_code ? "Copié !" : "Copier le lien"}
                  </button>
                  <button
                    onClick={() => {
                      const url = getTrackingUrl(myLink.short_code);
                      const text = `Découvre ${campaign.title} 👉 ${url}`;
                      if (navigator.share) {
                        navigator.share({ text, url });
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                      }
                    }}
                    className="flex-1 btn-primary text-xs !py-2 text-center"
                  >
                    Partager
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => acceptCampaign(campaign.id)}
                  className="btn-primary w-full text-xs !py-2.5 text-center"
                >
                  Accepter le Rythme
                </button>
              )}
            </div>
          );
        })}

        {campaigns.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-white/30 text-sm">
              Aucun rythme disponible pour le moment. Reviens bientôt !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
