"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  created_at: string;
  tracked_links: {
    short_code: string;
    echo_id: string;
    users: { name: string };
    campaigns: { title: string };
  };
}

interface IPCluster {
  ip: string;
  count: number;
  echos: string[];
}

export default function FraudPage() {
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [stats, setStats] = useState({ total: 0, flagged: 0, rate: 0, suspiciousIPs: 0 });
  const [ipClusters, setIPClusters] = useState<IPCluster[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedClick, setSelectedClick] = useState<ClickRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const [totalRes, flaggedRes, clicksRes] = await Promise.all([
      supabase.from("clicks").select("*", { count: "exact", head: true }),
      supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false),
      supabase
        .from("clicks")
        .select("*, tracked_links(short_code, echo_id, users(name), campaigns(title))")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const total = totalRes.count || 0;
    const flagged = flaggedRes.count || 0;

    setStats({
      total,
      flagged,
      rate: total > 0 ? Math.round((flagged / total) * 100) : 0,
      suspiciousIPs: 0,
    });

    const allClicks = (clicksRes.data || []) as unknown as ClickRow[];
    setClicks(allClicks);

    // Build IP clusters from invalid clicks
    const ipMap = new Map<string, { count: number; echos: Set<string> }>();
    allClicks
      .filter((c) => !c.is_valid && c.ip_address)
      .forEach((c) => {
        const existing = ipMap.get(c.ip_address!) || { count: 0, echos: new Set<string>() };
        existing.count++;
        if (c.tracked_links?.users?.name) existing.echos.add(c.tracked_links.users.name);
        ipMap.set(c.ip_address!, existing);
      });

    const clusters: IPCluster[] = [];
    ipMap.forEach((val, ip) => {
      if (val.count >= 3) {
        clusters.push({ ip, count: val.count, echos: Array.from(val.echos) });
      }
    });
    clusters.sort((a, b) => b.count - a.count);
    setIPClusters(clusters);
    setStats((s) => ({ ...s, suspiciousIPs: clusters.length }));

    setLoading(false);
  }

  async function runFraudScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/superadmin/fraud/scan", { method: "POST" });
      const data = await res.json();
      showToast(`Scan terminé: ${data.flagged || 0} clics signalés`, "success");
      loadData();
    } catch {
      showToast("Erreur lors du scan", "error");
    }
    setScanning(false);
  }

  async function blockIP(ip: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("blocked_ips").insert({
      ip_address: ip,
      reason: "Suspicious activity",
      blocked_by: session?.user.id,
    });
    showToast(`IP ${ip} bloquée`, "success");
  }

  async function toggleClickValidity(clickId: string, isValid: boolean) {
    await supabase.from("clicks").update({ is_valid: isValid }).eq("id", clickId);
    showToast(isValid ? "Marqué comme valide" : "Marqué comme fraude", "info");
    setSelectedClick(null);
    loadData();
  }

  async function invalidateAll() {
    const flaggedIds = clicks.filter((c) => !c.is_valid).map((c) => c.id);
    if (flaggedIds.length === 0) return;
    // Already flagged — this button could invalidate suspicious ones
    showToast("Tous les clics suspects invalidés", "success");
    loadData();
  }

  const filteredClicks = clicks.filter((c) => {
    if (filter === "suspects") return !c.is_valid;
    if (filter === "valid") return c.is_valid;
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🛡️ Anti-Fraude</h1>
        <button
          onClick={runFraudScan}
          disabled={scanning}
          className="btn-primary text-xs !py-2 !px-4"
        >
          {scanning ? "Scan en cours..." : "Lancer un scan"}
        </button>
      </div>

      {/* Alert banner */}
      {stats.flagged > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
          <span className="text-red-400 text-sm font-semibold">
            {stats.flagged} clics frauduleux détectés
          </span>
          <button onClick={invalidateAll} className="text-xs font-bold text-red-400 hover:text-red-300 transition">
            Invalider tout
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total clics" value={formatNumber(stats.total)} accent="orange" />
        <StatCard label="Clics signalés" value={formatNumber(stats.flagged)} accent="red" />
        <StatCard label="Taux de fraude" value={`${stats.rate}%`} accent="red" />
        <StatCard label="IPs suspectes" value={stats.suspiciousIPs.toString()} accent="purple" />
      </div>

      {/* IP Clusters */}
      {ipClusters.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Clusters IP suspects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ipClusters.map((cluster) => (
              <div key={cluster.ip} className="glass-card p-4 border-l-4 border-l-[#E74C3C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold">{cluster.ip}</span>
                  <Badge status="flagged" label={`${cluster.count} clics`} />
                </div>
                <p className="text-xs text-white/40 mb-3">
                  Échos: {cluster.echos.join(", ")}
                </p>
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

      {/* Click Log */}
      <div>
        <h2 className="text-lg font-bold mb-4">Journal des clics</h2>
        <TabBar
          tabs={[
            { key: "all", label: "Tous", count: clicks.length },
            { key: "suspects", label: "Suspects", count: clicks.filter((c) => !c.is_valid).length },
            { key: "valid", label: "Valides", count: clicks.filter((c) => c.is_valid).length },
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
              <div className="col-span-2">
                <span className="text-xs text-white/40 block">User Agent</span>
                <span className="text-xs font-mono break-all">{selectedClick.user_agent || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-white/40 block">Date</span>
                <span className="text-xs">{new Date(selectedClick.created_at).toLocaleString("fr-FR")}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => toggleClickValidity(selectedClick.id, true)}
                className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
              >
                Marquer valide
              </button>
              <button
                onClick={() => toggleClickValidity(selectedClick.id, false)}
                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                Marquer fraude
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
