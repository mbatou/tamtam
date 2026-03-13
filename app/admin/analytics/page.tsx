"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface CampaignAnalytics {
  id: string;
  title: string;
  status: string;
  budget: number;
  spent: number;
  cpc: number;
  created_at: string;
  totalClicks: number;
  validClicks: number;
  fraudClicks: number;
  echoCount: number;
  dailyClicks: { date: string; valid: number; fraud: number }[];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    active: "Actif", paused: "Pausé", completed: "Terminé", draft: "Brouillon", rejected: "Rejeté",
  };
  return map[status] || status;
}

function downloadCSV(campaigns: CampaignAnalytics[]) {
  const header = "Campagne,Statut,Budget (FCFA),Dépensé (FCFA),CPC (FCFA),Clics totaux,Clics valides,Clics fraude,Échos,Créée le\n";
  const rows = campaigns.map((c) =>
    `"${c.title}",${getStatusLabel(c.status)},${c.budget},${c.spent},${c.cpc},${c.totalClicks},${c.validClicks},${c.fraudClicks},${c.echoCount},${new Date(c.created_at).toLocaleDateString("fr-FR")}`
  ).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tamtam-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        if (data.campaigns?.length > 0) setSelectedId(data.campaigns[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="p-6 max-w-6xl">
        <h1 className="text-2xl font-bold mb-8">Analytics</h1>
        <div className="glass-card p-12 text-center">
          <p className="text-white/40 text-sm">Aucune campagne à analyser pour le moment.</p>
        </div>
      </div>
    );
  }

  const selected = campaigns.find((c) => c.id === selectedId) || campaigns[0];

  // Totals across all campaigns
  const totals = campaigns.reduce(
    (acc, c) => ({
      clicks: acc.clicks + c.totalClicks,
      valid: acc.valid + c.validClicks,
      fraud: acc.fraud + c.fraudClicks,
      spent: acc.spent + c.spent,
      budget: acc.budget + c.budget,
    }),
    { clicks: 0, valid: 0, fraud: 0, spent: 0, budget: 0 }
  );

  const validityRate = totals.clicks > 0 ? Math.round((totals.valid / totals.clicks) * 100) : 0;
  const progress = selected.budget > 0 ? Math.round((selected.spent / selected.budget) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <button
          onClick={() => downloadCSV(campaigns)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm font-semibold transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exporter CSV
        </button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total clics" value={formatNumber(totals.clicks)} accent="orange" />
        <StatCard label="Clics valides" value={formatNumber(totals.valid)} accent="teal" />
        <StatCard label="Taux de validité" value={totals.clicks > 0 ? `${validityRate}%` : "—"} accent="purple" />
        <StatCard label="Budget dépensé" value={formatFCFA(totals.spent)} accent="orange" />
      </div>

      {/* Campaign selector */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">Détails par campagne</h3>
          <select
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#1a1a2e]">
                {c.title} ({getStatusLabel(c.status)})
              </option>
            ))}
          </select>
        </div>

        {/* Selected campaign KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">Clics</p>
            <p className="text-lg font-bold">{formatNumber(selected.totalClicks)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">Valides</p>
            <p className="text-lg font-bold text-emerald-400">{formatNumber(selected.validClicks)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">Fraude</p>
            <p className="text-lg font-bold text-red-400">{formatNumber(selected.fraudClicks)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">Échos</p>
            <p className="text-lg font-bold">{selected.echoCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">Budget</p>
            <p className="text-lg font-bold text-primary">{progress}%</p>
          </div>
        </div>

        {/* Daily clicks chart */}
        <h4 className="text-xs font-semibold text-white/40 mb-3">Clics par jour (30 derniers jours)</h4>
        {selected.dailyClicks.some((d) => d.valid > 0 || d.fraud > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={selected.dailyClicks}>
              <defs>
                <linearGradient id="gradValidAn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFraudAn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelFormatter={(v) => formatShortDate(String(v))}
              />
              <Area type="monotone" dataKey="valid" name="Valides" stroke="#22c55e" fill="url(#gradValidAn)" strokeWidth={2} />
              <Area type="monotone" dataKey="fraud" name="Fraude" stroke="#ef4444" fill="url(#gradFraudAn)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-white/30 text-center py-12">Aucun clic sur cette campagne pour le moment</p>
        )}
      </div>

      {/* All campaigns comparison table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-4">Comparaison des campagnes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs">
                <th className="pb-3 font-semibold">Campagne</th>
                <th className="pb-3 font-semibold">Statut</th>
                <th className="pb-3 font-semibold text-right">Budget</th>
                <th className="pb-3 font-semibold text-right">Dépensé</th>
                <th className="pb-3 font-semibold text-right">Clics</th>
                <th className="pb-3 font-semibold text-right">Valides</th>
                <th className="pb-3 font-semibold text-right">Échos</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.03] transition ${c.id === selected.id ? "bg-white/[0.05]" : ""}`}
                >
                  <td className="py-3 font-semibold">{c.title}</td>
                  <td className="py-3"><span className={`badge-${c.status}`}>{getStatusLabel(c.status)}</span></td>
                  <td className="py-3 text-right text-white/50">{formatFCFA(c.budget)}</td>
                  <td className="py-3 text-right font-semibold text-primary">{formatFCFA(c.spent)}</td>
                  <td className="py-3 text-right">{formatNumber(c.totalClicks)}</td>
                  <td className="py-3 text-right text-emerald-400">{formatNumber(c.validClicks)}</td>
                  <td className="py-3 text-right">{c.echoCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
