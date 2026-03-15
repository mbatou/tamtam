"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
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

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected"),
    };
    return map[status] || status;
  }

  function downloadCSV(campaigns: CampaignAnalytics[]) {
    const header = "Campagne,Statut,Budget (FCFA),Dépensé (FCFA),CPC (FCFA),Portée totale,Visiteurs réels,Coût par visiteur,Échos\n";
    const rows = campaigns.map((c) => {
      const cpc = c.validClicks > 0 ? Math.round(c.spent / c.validClicks) : 0;
      return `"${c.title}",${getStatusLabel(c.status)},${c.budget},${c.spent},${cpc},${c.totalClicks},${c.validClicks},${cpc},${c.echoCount}`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamtam-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <h1 className="text-2xl font-bold mb-8">{t("admin.analytics.title")}</h1>
        <div className="glass-card p-12 text-center">
          <p className="text-white/40 text-sm mb-4">{t("admin.analytics.noAnalytics")}</p>
          <a href="/admin/campaigns" className="btn-primary text-sm inline-block">{t("admin.dashboard.launchRythme")}</a>
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
      spent: acc.spent + c.spent,
      budget: acc.budget + c.budget,
    }),
    { clicks: 0, valid: 0, spent: 0, budget: 0 }
  );

  const costPerClick = totals.valid > 0 ? Math.round(totals.spent / totals.valid) : 0;
  const progress = selected.budget > 0 ? Math.round((selected.spent / selected.budget) * 100) : 0;
  const selectedCPC = selected.validClicks > 0 ? Math.round(selected.spent / selected.validClicks) : 0;

  // Find best campaign by CPC
  const bestCampaign = [...campaigns]
    .filter(c => c.validClicks > 0)
    .sort((a, b) => (a.spent / a.validClicks) - (b.spent / b.validClicks))[0];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{t("admin.analytics.title")}</h1>
        <button
          onClick={() => downloadCSV(campaigns)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm font-semibold transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t("admin.analytics.exportCsv")}
        </button>
      </div>

      {/* Global KPIs — brand-friendly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("admin.dashboard.totalReach")} value={formatNumber(totals.clicks)} accent="orange" />
        <StatCard label={t("admin.analytics.realVisitors")} value={formatNumber(totals.valid)} accent="teal" />
        <StatCard label={t("admin.dashboard.costPerClick")} value={costPerClick > 0 ? formatFCFA(costPerClick) : "—"} accent="purple" />
        <StatCard label={t("admin.dashboard.budgetSpent")} value={formatFCFA(totals.spent)} accent="orange" />
      </div>

      {/* ── ROI Calculator ── */}
      {totals.valid > 0 && (
        <div className="glass-card p-6 mb-8">
          <h3 className="text-sm font-bold mb-4">{t("admin.analytics.roiTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-xl bg-white/[0.03] text-center">
              <p className="text-xs text-white/40 mb-1">{t("admin.analytics.youSpent")}</p>
              <p className="text-xl font-black text-primary">{formatFCFA(totals.spent)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] text-center">
              <p className="text-xs text-white/40 mb-1">{t("admin.analytics.youGot")}</p>
              <p className="text-xl font-black text-accent">{formatNumber(totals.valid)} {t("admin.analytics.visitors")}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] text-center">
              <p className="text-xs text-white/40 mb-1">{t("admin.analytics.costPerVisitor")}</p>
              <p className="text-xl font-black">{formatFCFA(costPerClick)}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
            <p className="text-sm text-white/70 mb-2">{t("admin.analytics.comparison")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Facebook Ads</span>
                <span className="font-semibold">200-500 FCFA/clic</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Instagram Ads</span>
                <span className="font-semibold">300-800 FCFA/clic</span>
              </div>
              <div className="flex justify-between">
                <span className="text-accent font-bold">Tamtam</span>
                <span className="font-bold text-accent">{formatFCFA(costPerClick)}/clic</span>
              </div>
            </div>
            {costPerClick < 200 && (
              <p className="text-xs text-accent mt-3 font-semibold">
                {t("admin.analytics.savings")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Campaign selector */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">{t("admin.analytics.campaignDetails")}</h3>
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
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">{t("admin.dashboard.totalReach")}</p>
            <p className="text-lg font-bold">{formatNumber(selected.totalClicks)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">{t("admin.analytics.realVisitors")}</p>
            <p className="text-lg font-bold text-emerald-400">{formatNumber(selected.validClicks)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">{t("admin.dashboard.costPerClick")}</p>
            <p className="text-lg font-bold text-purple-400">{selectedCPC > 0 ? formatFCFA(selectedCPC) : "—"}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">{t("admin.dashboard.activeEchos")}</p>
            <p className="text-lg font-bold">{selected.echoCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <p className="text-[10px] text-white/40 font-semibold mb-0.5">{t("common.budget")}</p>
            <p className={`text-lg font-bold ${progress >= 100 ? "text-emerald-400" : "text-primary"}`}>
              {progress >= 100 ? t("admin.analytics.consumed") : `${progress}%`}
            </p>
          </div>
        </div>

        {/* Daily clicks chart */}
        <h4 className="text-xs font-semibold text-white/40 mb-3">{t("admin.analytics.clicksPerDay")}</h4>
        {selected.dailyClicks.some((d) => d.valid > 0 || d.fraud > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={selected.dailyClicks}>
              <defs>
                <linearGradient id="gradValidAn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelFormatter={(v) => formatShortDate(String(v))}
              />
              <Area type="monotone" dataKey="valid" name={t("admin.analytics.realVisitors")} stroke="#22c55e" fill="url(#gradValidAn)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-white/30 text-center py-12">{t("admin.analytics.noClicksCampaign")}</p>
        )}
      </div>

      {/* Campaign comparison table — brand friendly */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-4">{t("admin.analytics.campaignComparison")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs">
                <th className="pb-3 font-semibold">{t("admin.analytics.campaign")}</th>
                <th className="pb-3 font-semibold">{t("common.status")}</th>
                <th className="pb-3 font-semibold text-right">{t("common.budget")}</th>
                <th className="pb-3 font-semibold text-right">{t("admin.dashboard.budgetSpent")}</th>
                <th className="pb-3 font-semibold text-right">{t("admin.analytics.realVisitors")}</th>
                <th className="pb-3 font-semibold text-right">{t("admin.dashboard.costPerClick")}</th>
                <th className="pb-3 font-semibold text-right">{t("admin.dashboard.activeEchos")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const cpc = c.validClicks > 0 ? Math.round(c.spent / c.validClicks) : 0;
                const isBest = bestCampaign && c.id === bestCampaign.id && campaigns.length > 1;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`border-t border-white/5 cursor-pointer hover:bg-white/[0.03] transition ${c.id === selected.id ? "bg-white/[0.05]" : ""} ${isBest ? "bg-accent/[0.03]" : ""}`}
                  >
                    <td className="py-3 font-semibold">
                      {c.title}
                      {isBest && <span className="ml-2 text-[10px] text-accent font-bold">MEILLEUR CPC</span>}
                    </td>
                    <td className="py-3"><span className={`badge-${c.status}`}>{getStatusLabel(c.status)}</span></td>
                    <td className="py-3 text-right text-white/50">{formatFCFA(c.budget)}</td>
                    <td className="py-3 text-right">
                      <span className={c.spent >= c.budget ? "text-emerald-400 font-semibold" : "text-white/70"}>
                        {formatFCFA(c.spent)}
                        {c.spent >= c.budget && " ✓"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-emerald-400">{formatNumber(c.validClicks)}</td>
                    <td className="py-3 text-right font-semibold">{cpc > 0 ? formatFCFA(cpc) : "—"}</td>
                    <td className="py-3 text-right">{c.echoCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
