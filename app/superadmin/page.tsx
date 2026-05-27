"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatFCFA, formatNumber, timeAgo } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Building2,
  Megaphone,
  TrendingUp,
  BarChart3,
  MousePointerClick,
  Percent,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import DateRangeSelector, { type DateRange, getPresetRange } from "@/components/ui/DateRangeSelector";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { PageSkeleton } from "@/components/superadmin/AdminSkeleton";

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
  pendingPayoutsList: { id: string; echo_id: string; amount: number; provider: string; status: string; created_at: string; users: { name: string; phone: string } }[];
  clicksChart: { date: string; valid: number; fraud: number }[];
  campaignsByStatus: Record<string, number>;
  signupsChart: { date: string; count: number }[];
  acquisitionChart: { date: string; echos: number; brands: number; cumulEchos: number; cumulBrands: number }[];
  activeEchos7d: number;
  budgetRemainingPercent: number;
  activeCampaignsDetails: {
    id: string;
    title: string;
    budget: number;
    spent: number;
    cpc: number;
    engagedEchos: number;
    totalClicks: number;
    validClicks: number;
    topEchos: { id: string; name: string; city: string | null; validClicks: number }[];
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "#1D9E75",
  draft: "#64748b",
  paused: "#EAB308",
  completed: "#3b82f6",
  rejected: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actives",
  draft: "Brouillons",
  paused: "En pause",
  completed: "Terminées",
  rejected: "Rejetées",
};

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const tooltipStyle = {
  background: "#111128",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
};

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange("all"));
  const [chartTab, setChartTab] = useState<"clicks" | "revenue" | "echos" | "campaigns">("clicks");
  const [treasury, setTreasury] = useState<{
    total_available: number;
    total_pending: number;
    total_owed: number;
    upcoming_unlocks: { campaign: string; date: string; total: number; echos: number }[];
  } | null>(null);

  function fetchData() {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    const qs = params.toString();
    setLoading(true);
    Promise.all([
      fetch(`/api/superadmin/stats${qs ? `?${qs}` : ""}`).then((r) => r.json()),
      fetch("/api/superadmin/treasury").then((r) => r.json()),
    ]).then(([statsData, treasuryData]) => {
      setStats(statsData);
      if (!treasuryData.error) setTreasury(treasuryData);
    }).catch(() => {}).finally(() => {
      setLoading(false);
      setLastRefresh(new Date());
    });
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  if (loading || !stats) {
    return <PageSkeleton />;
  }

  const avgCpc = stats.validClicks > 0 ? Math.round(stats.grossRevenue / stats.validClicks) : 0;
  const verificationRate = stats.totalEchos > 0 ? Math.round((stats.activeEchos7d / stats.totalEchos) * 100) : 0;

  const pieData = Object.entries(stats.campaignsByStatus || {}).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "#64748b",
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div />
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="text-[11px] font-dm">
              {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </button>
          <DateRangeSelector value={dateRange.key} onChange={setDateRange} />
        </div>
      </div>

      {/* Top stats row — 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <AdminStatCard
          label="Total Échos"
          value={formatNumber(stats.totalEchos)}
          icon={<Users size={16} />}
          accent="white"
        />
        <AdminStatCard
          label="Échos vérifiés"
          value={formatNumber(stats.activeEchos7d)}
          icon={<UserCheck size={16} />}
          accent="teal"
          sub={`${verificationRate}% du total`}
        />
        <AdminStatCard
          label="Total Brands"
          value={formatNumber(stats.totalBatteurs)}
          icon={<Building2 size={16} />}
          accent="white"
        />
        <AdminStatCard
          label="Campagnes actives"
          value={stats.activeCampaigns}
          icon={<Megaphone size={16} />}
          accent="orange"
        />
        <AdminStatCard
          label="Platform GMV"
          value={formatFCFA(stats.grossRevenue)}
          icon={<TrendingUp size={16} />}
          accent="orange"
        />
        <AdminStatCard
          label="Revenu Tamtam"
          value={formatFCFA(stats.platformRevenue)}
          icon={<BarChart3 size={16} />}
          accent="orange"
          sub="25% marge"
        />
      </div>

      {/* Second row — 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <AdminStatCard
          label="Clics vérifiés"
          value={formatNumber(stats.validClicks)}
          icon={<MousePointerClick size={16} />}
          accent="white"
          sub={`${formatNumber(stats.totalClicks)} total · ${formatNumber(stats.fraudClicks)} filtrés`}
        />
        <AdminStatCard
          label="CPC moyen"
          value={`${avgCpc} F`}
          icon={<Percent size={16} />}
          accent={avgCpc <= 60 ? "teal" : avgCpc <= 80 ? "orange" : "red"}
          sub="cible : 50 F"
        />
        <AdminStatCard
          label="Taux d'activité Échos"
          value={`${verificationRate}%`}
          accent={verificationRate >= 70 ? "teal" : verificationRate >= 40 ? "orange" : "red"}
          sub="cible : 70%"
        />
      </div>

      {/* Full-width charts section */}
      <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
        {/* Tab toggle */}
        <div className="flex items-center gap-1 mb-5">
          {(["clicks", "revenue", "echos", "campaigns"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setChartTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-dm font-medium transition ${
                chartTab === tab
                  ? "bg-[#D35400]/12 text-[#D35400]"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              {tab === "clicks" ? "Clics" : tab === "revenue" ? "Revenu" : tab === "echos" ? "Échos" : "Campagnes"}
            </button>
          ))}
        </div>

        {/* Clicks chart */}
        {chartTab === "clicks" && (
          <>
            <div className="flex items-center gap-6 mb-4 text-xs">
              <div>
                <span className="text-white/30 font-dm">Total :</span>
                <span className="text-white font-syne font-bold ml-1.5">{formatNumber(stats.totalClicks)}</span>
              </div>
              <div>
                <span className="text-white/30 font-dm">Valides :</span>
                <span className="text-[#1D9E75] font-syne font-bold ml-1.5">{formatNumber(stats.validClicks)}</span>
              </div>
              <div>
                <span className="text-white/30 font-dm">Filtrés :</span>
                <span className="text-[#F09595] font-syne font-bold ml-1.5">{formatNumber(stats.fraudClicks)}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.clicksChart || []}>
                <defs>
                  <linearGradient id="gradValid2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D35400" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D35400" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFraud2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatShortDate(String(v))} />
                <Area type="monotone" dataKey="valid" name="Valides" stroke="#D35400" fill="url(#gradValid2)" strokeWidth={2} />
                <Area type="monotone" dataKey="fraud" name="Filtrés" stroke="#1D9E75" fill="url(#gradFraud2)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Revenue chart (using clicks data × avg CPC as proxy) */}
        {chartTab === "revenue" && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={(stats.clicksChart || []).map(d => ({ ...d, revenue: d.valid * avgCpc }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatShortDate(String(v))} formatter={(v) => formatFCFA(v as number)} />
              <Bar dataKey="revenue" name="Revenu" fill="#D35400" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Echos chart */}
        {chartTab === "echos" && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.signupsChart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatShortDate(String(v))} />
              <Bar dataKey="count" name="Inscriptions" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Campaigns pie chart */}
        {chartTab === "campaigns" && (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-dm">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: entry.color }} />
                  <span className="text-white/60">{entry.name}</span>
                  <span className="font-syne font-bold text-white">{entry.value}</span>
                </div>
              ))}
              {pieData.length === 0 && <p className="text-xs text-white/30">Aucune campagne</p>}
            </div>
          </div>
        )}
      </div>

      {/* Treasury */}
      {treasury && (
        <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-syne font-bold text-sm text-white mb-4">Trésorerie Échos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-4 bg-white/[0.03]">
              <div className="text-[11px] font-dm font-medium text-white/40 uppercase tracking-wider mb-1">Solde disponible</div>
              <div className="text-xl font-syne font-bold text-[#5DCAA5]">{formatFCFA(treasury.total_available)}</div>
              <div className="text-[10px] text-white/20 mt-1">Retirable par les Échos</div>
            </div>
            <div className="rounded-lg p-4 bg-white/[0.03]">
              <div className="text-[11px] font-dm font-medium text-white/40 uppercase tracking-wider mb-1">Solde en attente</div>
              <div className="text-xl font-syne font-bold text-[#EAB308]">{formatFCFA(treasury.total_pending)}</div>
              <div className="text-[10px] text-white/20 mt-1">Verrouillé par campagne</div>
            </div>
            <div className="rounded-lg p-4 bg-white/[0.03]">
              <div className="text-[11px] font-dm font-medium text-white/40 uppercase tracking-wider mb-1">Total dû</div>
              <div className="text-xl font-syne font-bold text-[#D35400]">{formatFCFA(treasury.total_owed)}</div>
              <div className="text-[10px] text-white/20 mt-1">Disponible + en attente</div>
            </div>
          </div>
          {treasury.upcoming_unlocks.length > 0 && (
            <div>
              <h4 className="text-[11px] font-dm font-medium text-white/30 uppercase tracking-wider mb-2">Prochains déblocages</h4>
              <div className="space-y-1.5">
                {treasury.upcoming_unlocks.slice(0, 5).map((u, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2.5">
                    <div>
                      <span className="text-[13px] font-dm font-medium text-white/70">{u.campaign}</span>
                      <span className="text-[11px] text-white/20 ml-2">
                        {new Date(u.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[13px] font-syne font-bold text-[#D35400]">{formatFCFA(u.total)}</span>
                      <span className="text-[11px] text-white/20 ml-2">{u.echos} écho{u.echos > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active campaigns detail */}
      {stats.activeCampaignsDetails && stats.activeCampaignsDetails.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-syne font-bold text-sm text-white mb-4">Campagnes actives</h3>
          <div className="space-y-4">
            {stats.activeCampaignsDetails.map((campaign) => {
              const pct = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;
              return (
                <div key={campaign.id} className="rounded-lg p-4 bg-white/[0.03]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-dm font-medium text-white">{campaign.title}</span>
                      <span className="text-[11px] text-white/20">{campaign.cpc} FCFA/clic</span>
                    </div>
                    <span className="text-[11px] text-white/30">{pct}% consommé</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-[#D35400]"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Engagement</div>
                      <div className="text-lg font-syne font-bold text-white">
                        {campaign.engagedEchos}
                        <span className="text-white/20 text-[11px] font-dm font-normal ml-1">échos</span>
                      </div>
                      <div className="text-[10px] text-white/20">
                        {campaign.validClicks} valides · {campaign.totalClicks} total
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Top Échos</div>
                      {campaign.topEchos.slice(0, 3).map((echo, i) => (
                        <div key={echo.id} className="flex items-center justify-between text-[12px] py-0.5">
                          <span className="text-white/50 truncate font-dm">
                            <span className="text-white/20 mr-1">{i + 1}.</span>
                            {echo.name}
                          </span>
                          <span className="text-[#D35400] font-syne font-bold text-[11px]">{echo.validClicks}</span>
                        </div>
                      ))}
                      {campaign.topEchos.length === 0 && (
                        <span className="text-white/20 text-[11px]">Aucun écho engagé</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent data — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Echos */}
        <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-sm text-white">Derniers Échos</h3>
            <Link href="/superadmin/users" className="text-[11px] text-white/30 hover:text-white/50 transition flex items-center gap-1">
              Voir tous <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stats.recentEchos.map((echo) => (
              <div key={echo.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D35400] flex items-center justify-center text-[11px] font-bold text-white">
                    {echo.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] font-dm font-medium text-white">{echo.name}</div>
                    <div className="text-[11px] text-white/20">{echo.city || echo.phone}</div>
                  </div>
                </div>
                <span className="text-[11px] text-white/20">{timeAgo(echo.created_at)}</span>
              </div>
            ))}
            {stats.recentEchos.length === 0 && <p className="text-[11px] text-white/20">Aucun écho inscrit</p>}
          </div>
        </div>

        {/* Top Echos */}
        <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-sm text-white">Top 10 Échos</h3>
            <Link href="/superadmin/users" className="text-[11px] text-white/30 hover:text-white/50 transition flex items-center gap-1">
              Voir tous <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stats.topEchos.map((echo, i) => (
              <div key={echo.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-syne font-bold ${
                    i < 3 ? "bg-[#D35400] text-white" : "bg-white/[0.05] text-white/30"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-dm font-medium text-white">{echo.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-syne font-bold text-[#D35400]">{formatFCFA(echo.total_earned)}</div>
                  <div className="text-[10px] text-white/20">Solde: {formatFCFA(echo.balance)}</div>
                </div>
              </div>
            ))}
            {stats.topEchos.length === 0 && <p className="text-[11px] text-white/20">Aucun écho</p>}
          </div>
        </div>
      </div>

      {/* Recent campaigns + Pending payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-sm text-white">Dernières campagnes</h3>
            <Link href="/superadmin/campaigns" className="text-[11px] text-white/30 hover:text-white/50 transition flex items-center gap-1">
              Voir toutes <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stats.recentCampaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-dm font-medium text-white">{c.title}</div>
                  <div className="text-[11px] text-white/20">{formatFCFA(c.spent)} / {formatFCFA(c.budget)}</div>
                </div>
                <AdminBadge
                  status={c.status === "active" ? "active" : c.status === "paused" ? "paused" : c.status === "completed" ? "finished" : c.status === "rejected" ? "rejected" : "draft"}
                  size="sm"
                >
                  {STATUS_LABELS[c.status] || c.status}
                </AdminBadge>
              </div>
            ))}
            {stats.recentCampaigns.length === 0 && <p className="text-[11px] text-white/20">Aucune campagne</p>}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-sm text-white">Paiements en attente</h3>
            <Link href="/superadmin/finance" className="text-[11px] text-white/30 hover:text-white/50 transition flex items-center gap-1">
              Voir tous <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {stats.pendingPayoutsList.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-dm font-medium text-white">{p.users?.name || "—"}</div>
                  <div className="text-[11px] text-white/20">{p.provider === "wave" ? "Wave" : "Orange Money"} · {timeAgo(p.created_at)}</div>
                </div>
                <span className="text-[13px] font-syne font-bold text-[#EAB308]">{formatFCFA(p.amount)}</span>
              </div>
            ))}
            {stats.pendingPayoutsList.length === 0 && <p className="text-[11px] text-white/20">Aucun paiement en attente</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
