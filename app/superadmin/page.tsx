"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatFCFA, formatNumber, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

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
  clicksChart: { date: string; valid: number; fraud: number }[];
  campaignsByStatus: Record<string, number>;
  signupsChart: { date: string; count: number }[];
  acquisitionChart: { date: string; echos: number; brands: number; cumulEchos: number; cumulBrands: number }[];
  activeEchos7d: number;
  budgetRemainingPercent: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  draft: "#94a3b8",
  paused: "#eab308",
  completed: "#3b82f6",
  rejected: "#ef4444",
};

function getStatusLabels(t: (key: string) => string): Record<string, string> {
  return {
    active: t("superadmin.dashboard.activeCampaigns"),
    draft: t("superadmin.dashboard.draftCampaigns"),
    paused: t("superadmin.dashboard.pausedCampaigns"),
    completed: t("superadmin.dashboard.finishedCampaigns"),
    rejected: t("superadmin.dashboard.rejectedCampaigns"),
  };
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function SuperAdminOverview() {
  const { t } = useTranslation();
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
  if (stats.fraudRate > 10) alerts.push({ type: "danger", message: t("superadmin.dashboard.highFraudRate", { rate: stats.fraudRate }) });
  if (stats.pendingPayoutsCount > 0) alerts.push({ type: "warning", message: `${stats.pendingPayoutsCount} ${t("superadmin.dashboard.pendingPayments", { amount: formatFCFA(stats.pendingPayoutAmount) })}` });
  if (stats.activeCampaigns === 0) alerts.push({ type: "info", message: t("superadmin.dashboard.noActiveCampaign") });

  const STATUS_LABELS = getStatusLabels(t);
  const pieData = Object.entries(stats.campaignsByStatus || {}).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "#64748b",
  }));

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold">{t("superadmin.dashboard.title")}</h1>

      {/* Row 1 — Critical KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("superadmin.dashboard.totalEchos")} value={formatNumber(stats.totalEchos)} sub={t("superadmin.dashboard.activeEchos7d", { count: String(stats.activeEchos7d || 0) })} accent="orange" />
        <StatCard label={t("superadmin.dashboard.activeCampaigns")} value={stats.activeCampaigns.toString()} accent="teal" />
        <StatCard label={t("superadmin.dashboard.grossRevenue")} value={formatFCFA(stats.platformRevenue)} accent="purple" />
        <StatCard
          label={t("superadmin.dashboard.fraudRate")}
          value={`${stats.fraudRate}%`}
          accent={stats.fraudRate > 10 ? "red" : "teal"}
        />
      </div>

      {/* Campaign Health Banner */}
      {stats.activeCampaigns === 0 ? (
        <Link href="/superadmin/campaigns" className="block p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition">
          <div className="flex items-center gap-3">
            <span className="text-red-400 font-bold text-sm">{t("superadmin.dashboard.noActiveCampaign")}</span>
            <span className="text-white/30">&rarr;</span>
          </div>
        </Link>
      ) : (
        <div className={`p-4 rounded-xl border ${stats.budgetRemainingPercent > 50 ? "bg-green-500/10 border-green-500/20" : stats.budgetRemainingPercent > 20 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20"}`}>
          <div className="flex items-center gap-3">
            <span className={`font-bold text-sm ${stats.budgetRemainingPercent > 50 ? "text-green-400" : stats.budgetRemainingPercent > 20 ? "text-yellow-400" : "text-red-400"}`}>
              {t("superadmin.dashboard.campaignHealth", { active: String(stats.activeCampaigns), budget: String(stats.budgetRemainingPercent) })}
            </span>
          </div>
        </div>
      )}

      {/* Conversion Funnel */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.conversionFunnel")}</h3>
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { label: t("superadmin.dashboard.funnelRegistered"), value: stats.totalEchos, color: "bg-primary" },
            { label: t("superadmin.dashboard.funnelActive"), value: stats.activeEchos7d || 0, color: "bg-accent" },
            { label: t("superadmin.dashboard.funnelValidClicks"), value: stats.validClicks, color: "bg-green-500" },
            { label: t("superadmin.dashboard.funnelPaid"), value: stats.paidToEchos > 0 ? 1 : 0, color: "bg-purple-500" },
          ].map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 text-center">
                <div className={`h-2 rounded-full ${step.color} mb-2`} style={{ opacity: 0.3 + (0.7 * (1 - i / arr.length)) }} />
                <div className="text-lg font-bold">{i === 3 ? formatFCFA(stats.paidToEchos) : formatNumber(step.value)}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{step.label}</div>
              </div>
              {i < arr.length - 1 && (
                <span className="text-white/15 text-lg shrink-0">&rarr;</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 — Money */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 font-medium mb-1">{t("superadmin.dashboard.grossRevenue")}</div>
          <div className="text-xl font-bold">{formatFCFA(stats.grossRevenue)}</div>
          <div className="text-xs text-white/30 mt-1">{stats.totalCampaigns} {t("superadmin.dashboard.totalCampaigns")}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 font-medium mb-1">{t("superadmin.dashboard.paidToEchos")}</div>
          <div className="text-xl font-bold text-accent">{formatFCFA(stats.paidToEchos)}</div>
          <div className="text-xs text-white/30 mt-1">{stats.totalBatteurs} {t("superadmin.dashboard.registeredBatteurs")}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-white/40 font-medium mb-1">{t("superadmin.dashboard.totalClicks")}</div>
          <div className="text-xl font-bold">{formatNumber(stats.totalClicks)}</div>
          <div className="text-xs text-white/30 mt-1">{formatNumber(stats.validClicks)} {t("superadmin.dashboard.validAndFraud", { count: formatNumber(stats.fraudClicks) })}</div>
        </div>
      </div>

      {/* Row 3 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clicks over time */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.clicksChart")}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.clicksChart || []}>
              <defs>
                <linearGradient id="gradValid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFraud" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="valid" name={t("common.valid")} stroke="#22c55e" fill="url(#gradValid)" strokeWidth={2} />
              <Area type="monotone" dataKey="fraud" name={t("common.invalid")} stroke="#ef4444" fill="url(#gradFraud)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign status pie */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.campaignsByStatus")}</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-white/50">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-white/30 text-center py-8">{t("superadmin.dashboard.noCampaign")}</p>
          )}
        </div>
      </div>

      {/* Row 4 — Echo signups chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.echoSignups")}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.signupsChart || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
              labelFormatter={(v) => formatShortDate(String(v))}
            />
            <Bar dataKey="count" name={t("superadmin.dashboard.signups")} fill="#D35400" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {stats.signupsChart && stats.signupsChart.length > 0 && (() => {
          const total = stats.signupsChart.reduce((s, d) => s + d.count, 0);
          const avg = (total / stats.signupsChart.length).toFixed(1);
          return (
            <p className="text-xs text-white/30 mt-2 text-center">
              {t("superadmin.dashboard.signupAnnotation", { total: String(total), avg })}
            </p>
          );
        })()}
      </div>

      {/* Row 4b — User acquisition (30 days) */}
      {stats.acquisitionChart && stats.acquisitionChart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.newSignupsDay")}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.acquisitionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => formatShortDate(String(v))}
                />
                <Bar dataKey="echos" name={t("superadmin.dashboard.totalEchos")} fill="#D35400" radius={[4, 4, 0, 0]} />
                <Bar dataKey="brands" name={t("superadmin.users.batteurs")} fill="#6C3483" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.cumulativeUsers")}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.acquisitionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => formatShortDate(String(v))}
                />
                <Line type="monotone" dataKey="cumulEchos" name={t("superadmin.dashboard.totalEchos")} stroke="#D35400" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumulBrands" name={t("superadmin.users.batteurs")} stroke="#6C3483" strokeWidth={2} dot={false} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Row 5 — Alerts */}
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

      {/* Row 6 — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Echos */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.latestEchos")}</h3>
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
            {stats.recentEchos.length === 0 && <p className="text-xs text-white/30">{t("superadmin.dashboard.noEcho")}</p>}
          </div>
        </div>

        {/* Top Echos */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.topEchos")}</h3>
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
                  <div className="text-xs text-white/30">{t("superadmin.dashboard.balance", { balance: formatFCFA(echo.balance) })}</div>
                </div>
              </div>
            ))}
            {stats.topEchos.length === 0 && <p className="text-xs text-white/30">{t("superadmin.dashboard.noEchoTop")}</p>}
          </div>
        </div>
      </div>

      {/* Row 7 — Recent campaigns + Pending payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.latestCampaigns")}</h3>
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
            {stats.recentCampaigns.length === 0 && <p className="text-xs text-white/30">{t("superadmin.dashboard.noCampaign")}</p>}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("superadmin.dashboard.pendingPayoutsTitle")}</h3>
          <div className="space-y-3">
            {stats.pendingPayoutsList.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.users?.name || "—"}</div>
                  <div className="text-xs text-white/30">{p.provider === "wave" ? t("common.wave") : t("common.orangeMoney")} · {timeAgo(p.created_at)}</div>
                </div>
                <span className="text-sm font-bold text-yellow-400">{formatFCFA(p.amount)}</span>
              </div>
            ))}
            {stats.pendingPayoutsList.length === 0 && <p className="text-xs text-white/30">{t("superadmin.dashboard.noPendingPayments")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
