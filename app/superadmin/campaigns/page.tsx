"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  destination_url: string;
  budget: number;
  spent: number;
  cpc: number;
  status: string;
  moderation_status: string | null;
  moderation_reason: string | null;
  created_at: string;
  echo_count: number;
  total_clicks: number;
  users: { name: string; phone: string } | null;
}

export default function CampaignModerationPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

  async function moderateCampaign(id: string, action: string, reason?: string) {
    try {
      const res = await fetch("/api/superadmin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: id, action, reason }),
      });
      if (res.ok) {
        showToast(
          action === "approve" ? "Campagne approuvée" :
          action === "reject" ? "Campagne rejetée" :
          action === "pause" ? "Campagne en pause" : "Campagne relancée",
          action === "approve" || action === "resume" ? "success" : "info"
        );
        setSelected(null);
        setRejectReason("");
        loadData();
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  const pendingCount = campaigns.filter((c) => (c.moderation_status || "pending") === "pending").length;
  const filtered = campaigns.filter((c) => {
    const ms = c.moderation_status || "pending";
    if (filter === "pending") return ms === "pending";
    if (filter === "approved") return ms === "approved";
    if (filter === "rejected") return ms === "rejected";
    return true;
  });

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

      <h1 className="text-2xl font-bold mb-6">Modération des campagnes</h1>

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
              <th className="pb-3 font-semibold hidden lg:table-cell">Échos</th>
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
                  <div className="text-xs text-white/30">{campaign.users?.name || "—"}</div>
                </td>
                <td className="py-3">
                  <Badge status={campaign.moderation_status || "pending"} />
                </td>
                <td className="py-3 hidden md:table-cell">{formatFCFA(campaign.budget)}</td>
                <td className="py-3 hidden md:table-cell">{campaign.cpc} FCFA</td>
                <td className="py-3 hidden lg:table-cell">{campaign.echo_count}</td>
                <td className="py-3 hidden lg:table-cell">{campaign.total_clicks}</td>
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
                <span>{selected.users?.name || "—"}</span>
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
              <div>
                <span className="text-xs text-white/40 block">Échos engagés</span>
                <span>{selected.echo_count}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">Clics totaux</span>
                <span>{selected.total_clicks}</span>
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

            {(selected.moderation_status || "pending") === "pending" && (
              <div className="space-y-3 pt-2 border-t border-white/5">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Raison du rejet (si applicable)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none h-20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => moderateCampaign(selected.id, "approve")}
                    className="flex-1 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => {
                      if (!rejectReason.trim()) { showToast("Raison requise pour le rejet", "error"); return; }
                      moderateCampaign(selected.id, "reject", rejectReason);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            )}

            {selected.status === "active" && (
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => moderateCampaign(selected.id, "pause")}
                  className="w-full py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold text-sm"
                >
                  Mettre en pause
                </button>
              </div>
            )}

            {selected.status === "paused" && (
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => moderateCampaign(selected.id, "resume")}
                  className="w-full py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm"
                >
                  Relancer
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
