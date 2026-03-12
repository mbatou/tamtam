"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface ClickRow {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_valid: boolean;
  country: string | null;
  created_at: string;
  link_id: string;
  tracked_links: {
    short_code: string;
    echo_id: string;
    campaign_id: string;
    users: { name: string } | null;
    campaigns: { title: string } | null;
  } | null;
}

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  created_at: string;
}

interface FraudData {
  totalClicks: number;
  flaggedClicks: number;
  fraudRate: number;
  suspiciousIPs: { ip: string; count: number }[];
  recentClicks: ClickRow[];
  blockedIPs: BlockedIP[];
}

export default function FraudPage() {
  const [data, setData] = useState<FraudData | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedClick, setSelectedClick] = useState<ClickRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/fraud");
      const json = await res.json();
      setData(json);
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

  async function blockIP(ip: string) {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block_ip", ip }),
      });
      if (res.ok) {
        showToast(`IP ${ip} bloquée`, "success");
        loadData();
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function toggleClickValidity(clickId: string) {
    try {
      const res = await fetch("/api/superadmin/fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_validity", click_id: clickId }),
      });
      if (res.ok) {
        showToast("Status mis à jour", "success");
        setSelectedClick(null);
        loadData();
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const filteredClicks = data.recentClicks.filter((c) => {
    if (filter === "suspects") return !c.is_valid;
    if (filter === "valid") return c.is_valid;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">Anti-Fraude</h1>

      {/* Alert banner */}
      {data.flaggedClicks > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <span className="text-red-400 text-sm font-semibold">
            {data.flaggedClicks} clics frauduleux détectés ({data.fraudRate}%)
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total clics" value={formatNumber(data.totalClicks)} accent="orange" />
        <StatCard label="Clics signalés" value={formatNumber(data.flaggedClicks)} accent="red" />
        <StatCard label="Taux de fraude" value={`${data.fraudRate}%`} accent="red" />
        <StatCard label="IPs suspectes" value={data.suspiciousIPs.length.toString()} accent="purple" />
      </div>

      {/* IP Clusters */}
      {data.suspiciousIPs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Clusters IP suspects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.suspiciousIPs.map((cluster) => (
              <div key={cluster.ip} className="glass-card p-4 border-l-4 border-l-[#E74C3C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold">{cluster.ip}</span>
                  <Badge status="flagged" label={`${cluster.count} clics`} />
                </div>
                <button
                  onClick={() => blockIP(cluster.ip)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 transition"
                >
                  Bloquer cette IP
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked IPs */}
      {data.blockedIPs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">IPs bloquées ({data.blockedIPs.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.blockedIPs.map((ip) => (
              <span key={ip.id} className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {ip.ip_address}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Click Log */}
      <div>
        <h2 className="text-lg font-bold mb-4">Journal des clics</h2>
        <TabBar
          tabs={[
            { key: "all", label: "Tous", count: data.recentClicks.length },
            { key: "suspects", label: "Suspects", count: data.recentClicks.filter((c) => !c.is_valid).length },
            { key: "valid", label: "Valides", count: data.recentClicks.filter((c) => c.is_valid).length },
          ]}
          active={filter}
          onChange={setFilter}
          className="mb-4"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/30 border-b border-white/5">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">IP</th>
                <th className="pb-3 font-semibold hidden lg:table-cell">User Agent</th>
                <th className="pb-3 font-semibold">Écho</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Campagne</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredClicks.slice(0, 50).map((click) => (
                <tr
                  key={click.id}
                  className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition"
                  onClick={() => setSelectedClick(click)}
                >
                  <td className="py-3 text-xs text-white/50">
                    {new Date(click.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 font-mono text-xs">{click.ip_address || "—"}</td>
                  <td className="py-3 text-xs text-white/40 max-w-[200px] truncate hidden lg:table-cell">
                    {click.user_agent?.substring(0, 50) || "—"}
                  </td>
                  <td className="py-3 text-xs">{click.tracked_links?.users?.name || "—"}</td>
                  <td className="py-3 text-xs hidden md:table-cell">{click.tracked_links?.campaigns?.title || "—"}</td>
                  <td className="py-3">
                    <Badge status={click.is_valid ? "active" : "flagged"} label={click.is_valid ? "Valide" : "Fraude"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click Detail Modal */}
      <Modal
        open={!!selectedClick}
        onClose={() => setSelectedClick(null)}
        title="Détail du clic"
      >
        {selectedClick && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-white/40 block">IP</span>
                <span className="font-mono">{selectedClick.ip_address || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">Status</span>
                <Badge status={selectedClick.is_valid ? "active" : "flagged"} label={selectedClick.is_valid ? "Valide" : "Fraude"} />
              </div>
              <div>
                <span className="text-xs text-white/40 block">Écho</span>
                <span>{selectedClick.tracked_links?.users?.name || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">Campagne</span>
                <span>{selectedClick.tracked_links?.campaigns?.title || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">Pays</span>
                <span>{selectedClick.country || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block">Date</span>
                <span className="text-xs">{new Date(selectedClick.created_at).toLocaleString("fr-FR")}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-white/40 block">User Agent</span>
                <span className="text-xs font-mono break-all">{selectedClick.user_agent || "—"}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => toggleClickValidity(selectedClick.id)}
                className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
              >
                {selectedClick.is_valid ? "Marquer fraude" : "Marquer valide"}
              </button>
              {selectedClick.ip_address && (
                <button
                  onClick={() => { blockIP(selectedClick.ip_address!); setSelectedClick(null); }}
                  className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
                >
                  Bloquer IP
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
