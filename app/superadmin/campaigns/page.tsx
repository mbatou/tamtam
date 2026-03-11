"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import type { CampaignWithBatteur } from "@/lib/types";

export default function CampaignModerationPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithBatteur[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<CampaignWithBatteur | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from("campaigns")
      .select("*, users(name)")
      .order("created_at", { ascending: false });

    setCampaigns((data || []) as unknown as CampaignWithBatteur[]);
    setLoading(false);
  }

  async function approveCampaign(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("campaigns").update({
      moderation_status: "approved",
      status: "active",
      moderated_by: session?.user.id,
      moderated_at: new Date().toISOString(),
    }).eq("id", id);
    showToast("Campagne approuvée", "success");
    setSelected(null);
    loadData();
  }

  async function rejectCampaign(id: string) {
    if (!rejectReason.trim()) {
      showToast("Raison requise pour le rejet", "error");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("campaigns").update({
      moderation_status: "rejected",
      status: "rejected",
      moderation_reason: rejectReason,
      moderated_by: session?.user.id,
      moderated_at: new Date().toISOString(),
    }).eq("id", id);
    showToast("Campagne rejetée", "info");
    setRejectReason("");
    setSelected(null);
    loadData();
  }

  const pendingCount = campaigns.filter((c) => c.moderation_status === "pending").length;
  const filtered = campaigns.filter((c) => {
    if (filter === "pending") return c.moderation_status === "pending";
    if (filter === "approved") return c.moderation_status === "approved";
    if (filter === "rejected") return c.moderation_status === "rejected";
    return true;
  });

  // Get echo count per campaign
  async function getEchoCount(campaignId: string): Promise<number> {
    const { count } = await supabase
      .from("tracked_links")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);
    return count || 0;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">🥁 Modération des campagnes</h1>

      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-yellow-400 text-sm font-semibold">
            {pendingCount} campagne(s) en attente de validation
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={campaigns.length.toString()} accent="orange" />
        <StatCard label="Actives" value={campaigns.filter((c) => c.status === "active").length.toString()} accent="teal" />
        <StatCard label="En attente" value={pendingCount.toString()} accent="purple" />
        <StatCard label="Rejetées" value={campaigns.filter((c) => c.moderation_status === "rejected").length.toString()} accent="red" />
      </div>

      <TabBar
        tabs={[
          { key: "all", label: "Toutes", count: campaigns.length },
          { key: "pending", label: "En attente", count: pendingCount },
          { key: "approved", label: "Approuvées", count: campaigns.filter((c) => c.moderation_status === "approved").length },
          { key: "rejected", label: "Rejetées", count: campaigns.filter((c) => c.moderation_status === "rejected").length },
        ]}
        active={filter}
        onChange={setFilter}
        className="mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/30 border-b border-white/5">
              <th className="pb-3 font-semibold">Campagne</th>
              <th className="pb-3 font-semibold">Modération</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Budget</th>
              <th className="pb-3 font-semibold hidden md:table-cell">CPC</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Clics</th>
              <th className="pb-3 font-semibold hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((campaign) => (
              <tr
                key={campaign.id}
                className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition"
                onClick={() => setSelected(campaign)}
              >
                <td className="py-3">
                  <div className="font-semibold">{campaign.title}</div>
                  <div className="text-xs text-white/30">{campaign.users?.name}</div>
                </td>
                <td className="py-3">
                  <Badge status={campaign.moderation_status || "pending"} />
                </td>
                <td className="py-3 hidden md:table-cell">{formatFCFA(campaign.budget)}</td>
                <td className="py-3 hidden md:table-cell">{campaign.cpc} FCFA</td>
                <td className="py-3 hidden lg:table-cell">{campaign.spent > 0 ? Math.floor(campaign.spent / campaign.cpc) : 0}</td>
                <td className="py-3 text-xs text-white/40 hidden lg:table-cell">
                  {new Date(campaign.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Campaign Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setRejectReason(""); }} title={selected?.title || ""}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-white/40 block">Batteur</span>
                <span>{selected.users?.name}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">Status</span>
                <Badge status={selected.moderation_status || "pending"} />
              </div>
              <div>
                <span className="text-xs text-white/40 block">Budget</span>
                <span>{formatFCFA(selected.budget)}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">CPC</span>
                <span>{selected.cpc} FCFA</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-white/40 block mb-1">Budget dépensé</span>
                <ProgressBar value={selected.spent} max={selected.budget} />
                <span className="text-xs text-white/30 mt-1 block">
                  {formatFCFA(selected.spent)} / {formatFCFA(selected.budget)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-white/40 block">URL</span>
                <span className="text-xs font-mono break-all text-primary">{selected.destination_url}</span>
              </div>
              {selected.description && (
                <div className="col-span-2">
                  <span className="text-xs text-white/40 block">Description</span>
                  <span className="text-xs">{selected.description}</span>
                </div>
              )}
              {selected.moderation_reason && (
                <div className="col-span-2">
                  <span className="text-xs text-white/40 block">Raison du rejet</span>
                  <span className="text-xs text-red-400">{selected.moderation_reason}</span>
                </div>
              )}
            </div>

            {selected.moderation_status === "pending" && (
              <div className="space-y-3 pt-2 border-t border-white/5">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Raison du rejet (si applicable)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none h-20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => approveCampaign(selected.id)}
                    className="flex-1 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => rejectCampaign(selected.id)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
