"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Stats {
  totalClicks: number;
  validClicks: number;
  activeEchos: number;
  budgetSpent: number;
  budgetTotal: number;
  walletBalance: number;
  activeRythmes: number;
  totalCampaigns: number;
  topEchos: { id: string; name: string; clicks: number; earned: number }[];
  clicksChart: { date: string; valid: number; fraud: number }[];
  campaignBudgets: { name: string; budget: number; spent: number }[];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const { t } = useTranslation();
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
      <h1 className="text-2xl font-bold mb-8">{t("admin.dashboard.title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("admin.dashboard.totalClicks")} value={formatNumber(stats.totalClicks)} accent="orange" />
        <StatCard label={t("admin.dashboard.validClicks")} value={formatNumber(stats.validClicks)} accent="teal" />
        <StatCard label={t("admin.dashboard.activeEchos")} value={stats.activeEchos.toString()} accent="purple" />
        <StatCard label={t("admin.dashboard.budgetSpent")} value={formatFCFA(stats.budgetSpent)} accent="orange" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label={t("admin.dashboard.activeRythmes")} value={stats.activeRythmes.toString()} accent="teal" />
        <StatCard
          label={t("admin.dashboard.validityRate")}
          value={stats.totalClicks > 0 ? `${validityRate}%` : "—"}
          accent="orange"
        />
        <StatCard label={t("admin.dashboard.remainingBudget")} value={formatFCFA(stats.budgetTotal - stats.budgetSpent)} accent="purple" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Clicks over time */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("admin.dashboard.clicksChart")}</h3>
          {stats.clicksChart && stats.clicksChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.clicksChart}>
                <defs>
                  <linearGradient id="gradValidAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFraudAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => formatShortDate(String(v))}
                />
                <Area type="monotone" dataKey="valid" name={t("admin.dashboard.validLabel")} stroke="#22c55e" fill="url(#gradValidAdmin)" strokeWidth={2} />
                <Area type="monotone" dataKey="fraud" name={t("admin.dashboard.fraudLabel")} stroke="#ef4444" fill="url(#gradFraudAdmin)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-white/30 text-center py-12">{t("admin.dashboard.noClicks")}</p>
          )}
        </div>

        {/* Campaign budget usage */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("admin.dashboard.budgetByCampaign")}</h3>
          {stats.campaignBudgets && stats.campaignBudgets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.campaignBudgets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => formatFCFA(Number(value))}
                />
                <Bar dataKey="budget" name={t("common.budget")} fill="rgba(211,84,0,0.3)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" name={t("admin.dashboard.spent")} fill="#D35400" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-white/30 text-center py-12">{t("admin.dashboard.noCampaign")}</p>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">{t("admin.dashboard.topEchos")}</h2>
        <div className="space-y-3">
          {stats.topEchos.length === 0 ? (
            <p className="text-white/30 text-sm">{t("admin.dashboard.noEchoEngaged")}</p>
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
                    <span className="text-xs text-white/30 ml-2">{echo.clicks} {t("common.clicks")}</span>
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
