"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber, timeAgo } from "@/lib/utils";
import StatCard from "@/components/StatCard";

interface Stats {
  totalEchos: number;
  totalBatteurs: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalClicks: number;
  validClicks: number;
  fraudClicks: number;
  pendingPayoutsCount: number;
  grossRevenue: number;
  platformRevenue: number;
  paidToEchos: number;
  pendingPayoutAmount: number;
  fraudRate: number;
  recentEchos: { id: string; name: string; phone: string; city: string; created_at: string }[];
  recentCampaigns: { id: string; title: string; status: string; budget: number; spent: number; cpc: number; created_at: string }[];
  topEchos: { id: string; name: string; total_earned: number; balance: number }[];
  recentClicks: { id: string; ip_address: string; is_valid: boolean; created_at: string; link_id: string }[];
  pendingPayoutsList: { id: string; echo_id: string; amount: number; provider: string; status: string; created_at: string; users: { name: string; phone: string } }[];
}

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-72 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const alerts: { type: "danger" | "warning" | "info"; message: string }[] = [];
  if (stats.fraudRate > 10) alerts.push({ type: "danger", message: `Taux de fraude élevé: ${stats.fraudRate}%` });
  if (stats.pendingPayoutsCount > 0) alerts.push({ type: "warning", message: `${stats.pendingPayoutsCount} paiement(s) en attente (${formatFCFA(stats.pendingPayoutAmount)})` });
  if (stats.activeCampaigns === 0) alerts.push({ type: "info", message: "Aucune campagne active" });

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold">Centre de commande</h1>

      {/* Row 1 — Critical KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Échos" value={formatNumber(stats.totalEchos)} accent="orange" />
        <StatCard label="Rythmes actifs" value={stats.activeCampaigns.toString()} accent="teal" />
        <StatCard label="Revenu plateforme" value={formatFCFA(stats.platformRevenue)} accent="purple" />
        <StatCard
          label="Taux de fraude"
          value={`${stats.fraudRate}%`}
          accent={stats.fraudRate > 10 ? "red" : "teal"}
        />
      </div>

      {/* Row 2 — Money */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 font-medium mb-1">Revenu brut</div>
          <div className="text-xl font-bold">{formatFCFA(stats.grossRevenue)}</div>
          <div className="text-xs text-white/30 mt-1">{stats.totalCampaigns} campagnes totales</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 font-medium mb-1">Payé aux Échos</div>
          <div className="text-xl font-bold text-accent">{formatFCFA(stats.paidToEchos)}</div>
          <div className="text-xs text-white/30 mt-1">{stats.totalBatteurs} batteurs inscrits</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 font-medium mb-1">Clics totaux</div>
          <div className="text-xl font-bold">{formatNumber(stats.totalClicks)}</div>
          <div className="text-xs text-white/30 mt-1">{formatNumber(stats.validClicks)} valides · {formatNumber(stats.fraudClicks)} fraude</div>
        </div>
      </div>

      {/* Row 3 — Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border text-sm font-semibold ${
                alert.type === "danger"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : alert.type === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}
            >
              {alert.type === "danger" ? "!!!" : alert.type === "warning" ? "!" : "i"} {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Row 4 — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Echos */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">Derniers Échos inscrits</h3>
          <div className="space-y-3">
            {stats.recentEchos.map((echo) => (
              <div key={echo.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white">
                    {echo.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{echo.name}</div>
                    <div className="text-xs text-white/30">{echo.city || echo.phone}</div>
                  </div>
                </div>
                <span className="text-xs text-white/30">{timeAgo(echo.created_at)}</span>
              </div>
            ))}
            {stats.recentEchos.length === 0 && <p className="text-xs text-white/30">Aucun écho inscrit</p>}
          </div>
        </div>

        {/* Top Echos */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">Top 10 Échos</h3>
          <div className="space-y-3">
            {stats.topEchos.map((echo, i) => (
              <div key={echo.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
                  }`}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                  </span>
                  <span className="text-sm font-semibold">{echo.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-accent">{formatFCFA(echo.total_earned)}</div>
                  <div className="text-xs text-white/30">Solde: {formatFCFA(echo.balance)}</div>
                </div>
              </div>
            ))}
            {stats.topEchos.length === 0 && <p className="text-xs text-white/30">Aucun écho</p>}
          </div>
        </div>
      </div>

      {/* Row 5 — Recent campaigns + Pending payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">Dernières campagnes</h3>
          <div className="space-y-3">
            {stats.recentCampaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="text-xs text-white/30">{formatFCFA(c.spent)} / {formatFCFA(c.budget)}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  c.status === "active" ? "bg-accent/10 text-accent" :
                  c.status === "paused" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-white/5 text-white/40"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
            {stats.recentCampaigns.length === 0 && <p className="text-xs text-white/30">Aucune campagne</p>}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">Paiements en attente</h3>
          <div className="space-y-3">
            {stats.pendingPayoutsList.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.users?.name || "—"}</div>
                  <div className="text-xs text-white/30">{p.provider === "wave" ? "Wave" : "Orange Money"} · {timeAgo(p.created_at)}</div>
                </div>
                <span className="text-sm font-bold text-yellow-400">{formatFCFA(p.amount)}</span>
              </div>
            ))}
            {stats.pendingPayoutsList.length === 0 && <p className="text-xs text-white/30">Aucun paiement en attente</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
