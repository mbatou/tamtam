"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import StatCard from "@/components/StatCard";

interface Stats {
  totalClicks: number;
  validClicks: number;
  activeEchos: number;
  budgetSpent: number;
  budgetTotal: number;
  activeRythmes: number;
  totalCampaigns: number;
  topEchos: { id: string; name: string; clicks: number; earned: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
    setLoading(false);
  }

  if (loading || !stats) {
    return (
      <div className="p-6 max-w-6xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];
  const validityRate = stats.totalClicks > 0 ? Math.round((stats.validClicks / stats.totalClicks) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total clics" value={formatNumber(stats.totalClicks)} accent="orange" />
        <StatCard label="Clics valides" value={formatNumber(stats.validClicks)} accent="teal" />
        <StatCard label="Échos actifs" value={stats.activeEchos.toString()} accent="purple" />
        <StatCard label="Budget dépensé" value={formatFCFA(stats.budgetSpent)} accent="orange" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Rythmes actifs" value={stats.activeRythmes.toString()} accent="teal" />
        <StatCard
          label="Taux de validité"
          value={stats.totalClicks > 0 ? `${validityRate}%` : "—"}
          accent="orange"
        />
        <StatCard label="Budget restant" value={formatFCFA(stats.budgetTotal - stats.budgetSpent)} accent="purple" />
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Top Échos</h2>
        <div className="space-y-3">
          {stats.topEchos.length === 0 ? (
            <p className="text-white/30 text-sm">Aucun écho engagé dans vos campagnes pour le moment.</p>
          ) : (
            stats.topEchos.map((echo, i) => (
              <div
                key={echo.id}
                className={`flex items-center justify-between py-3 px-3 rounded-xl border border-transparent transition ${
                  i === 0 ? "bg-primary/5 border-primary/20" : "border-b border-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3 ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
                  }`}>
                    {i < 3 ? medals[i] : i + 1}
                  </span>
                  <div>
                    <span className="text-sm font-semibold">{echo.name}</span>
                    <span className="text-xs text-white/30 ml-2">{echo.clicks} clics</span>
                  </div>
                </div>
                <span className={`text-sm font-bold ${i === 0 ? "text-primary text-base" : "text-accent"}`}>
                  {formatFCFA(echo.earned)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
