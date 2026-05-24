"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatFCFA, formatNumber } from "@/lib/utils";
import {
  Sparkles,
  Users,
  Megaphone,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Clock,
  Shield,
  Wallet,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import AdminStatCard from "@/components/superadmin/AdminStatCard";

interface BriefingData {
  daysSinceLaunch: number;
  date: string;
  actionRequired: {
    newLeads: number;
    oldestLeadAge: number;
    activeCampaigns: number;
    fraudRate: number;
    fraudRateToday: number;
    ipsToBlock: number;
    pendingPayouts: number;
    pendingPayoutAmount: number;
  };
  today: {
    signups: number;
    clicks: number;
    revenue: number;
  };
  totals: {
    echos: number;
    clicks: number;
    paid: number;
  };
  trends: {
    signupsDelta: number;
    clicksDelta: number;
  };
  financial: {
    commission: number;
    grossRevenue: number;
    pendingPayouts: number;
  };
  suggestedActions: { label: string; href: string; priority: "high" | "medium" | "low" }[];
}

interface Stats {
  activeEchos7d: number;
  activeCampaigns: number;
  clicksChart: { date: string; valid: number; fraud: number }[];
  signupsChart: { date: string; count: number }[];
  pendingPayoutsCount: number;
}


export default function MorningBriefPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [briefRes, statsRes] = await Promise.all([
        fetch("/api/superadmin/briefing"),
        fetch("/api/superadmin/stats"),
      ]);
      const [briefData, statsData] = await Promise.all([
        briefRes.json(),
        statsRes.json(),
      ]);
      setData(briefData);
      setStats(statsData);
      setLastUpdated(new Date());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="skeleton h-10 w-80 rounded-xl" />
        <div className="skeleton h-5 w-48 rounded-lg" />
        <div className="skeleton h-28 rounded-xl mt-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-white/40">
        Erreur de chargement
      </div>
    );
  }

  const now = new Date(data.date);
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  // Build action items
  const actionItems: {
    text: string;
    href: string;
    severity: "red" | "orange" | "blue";
    icon: React.ReactNode;
  }[] = [];

  if (data.actionRequired.pendingPayouts > 0) {
    actionItems.push({
      text: `${data.actionRequired.pendingPayouts} retrait(s) en attente (${formatFCFA(data.actionRequired.pendingPayoutAmount)})`,
      href: "/superadmin/finance",
      severity: "orange",
      icon: <Wallet size={14} />,
    });
  }

  if (data.actionRequired.newLeads > 0) {
    actionItems.push({
      text: `${data.actionRequired.newLeads} nouveau(x) lead(s) en attente (plus ancien : ${data.actionRequired.oldestLeadAge}h)`,
      href: "/superadmin/leads",
      severity: data.actionRequired.oldestLeadAge > 24 ? "red" : "orange",
      icon: <Target size={14} />,
    });
  }

  if (data.actionRequired.fraudRate > 15) {
    actionItems.push({
      text: `Taux de fraude à ${data.actionRequired.fraudRate}% — vérification requise`,
      href: "/superadmin/fraud",
      severity: "red",
      icon: <Shield size={14} />,
    });
  }

  if (data.actionRequired.activeCampaigns === 0) {
    actionItems.push({
      text: "Aucune campagne active — la plateforme est inactive",
      href: "/superadmin/campaigns",
      severity: "red",
      icon: <Megaphone size={14} />,
    });
  }

  if (data.actionRequired.ipsToBlock > 0) {
    actionItems.push({
      text: `${data.actionRequired.ipsToBlock} IP(s) suspecte(s) à bloquer`,
      href: "/superadmin/fraud",
      severity: "orange",
      icon: <AlertTriangle size={14} />,
    });
  }

  const pendingActions =
    (stats?.pendingPayoutsCount || data.actionRequired.pendingPayouts) +
    data.actionRequired.newLeads;

  // Sparkline data — last 7 days from charts
  const clicksSparkline = (stats?.clicksChart || []).slice(-7);
  const signupsSparkline = (stats?.signupsChart || []).slice(-7);
  const revenueSparkline = clicksSparkline.map((d) => ({
    date: d.date,
    value: d.valid * 50,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-syne font-bold text-xl text-white">
            {greeting} 👋
          </h1>
          <p className="text-xs text-white/30 mt-1 font-dm">
            Jour {data.daysSinceLaunch} depuis le lancement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-white/20 font-dm">
              Mis à jour il y a{" "}
              {Math.round((Date.now() - lastUpdated.getTime()) / 60000)} min
            </span>
          )}
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-white/40 hover:text-white/60"
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* AI Daily Brief card */}
      <div
        className="mb-6 rounded-xl p-5"
        style={{
          background: "#0F1A13",
          border: "0.5px solid rgba(29,158,117,0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1D9E75]/20 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} className="text-[#5DCAA5]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-syne font-bold text-sm text-[#5DCAA5] mb-2">
              Résumé du jour
            </h3>
            <ul className="space-y-1.5 text-[13px] text-white/60 font-dm">
              <li className="flex items-start gap-2">
                <span className="text-[#5DCAA5] shrink-0 mt-0.5">•</span>
                <span>
                  {data.today.clicks} clics aujourd&apos;hui
                  {data.trends.clicksDelta !== 0 && (
                    <span
                      className={
                        data.trends.clicksDelta > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {" "}
                      ({data.trends.clicksDelta > 0 ? "+" : ""}
                      {data.trends.clicksDelta} vs hier)
                    </span>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#5DCAA5] shrink-0 mt-0.5">•</span>
                <span>
                  {data.today.signups} nouvelle(s) inscription(s)
                  {data.trends.signupsDelta !== 0 && (
                    <span
                      className={
                        data.trends.signupsDelta > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {" "}
                      ({data.trends.signupsDelta > 0 ? "+" : ""}
                      {data.trends.signupsDelta} vs hier)
                    </span>
                  )}
                </span>
              </li>
              {data.actionRequired.activeCampaigns > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-[#5DCAA5] shrink-0 mt-0.5">•</span>
                  <span>
                    {data.actionRequired.activeCampaigns} campagne(s) active(s)
                  </span>
                </li>
              )}
              {data.actionRequired.fraudRate > 10 && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 shrink-0 mt-0.5">•</span>
                  <span className="text-yellow-400/80">
                    Taux de fraude à {data.actionRequired.fraudRate}%
                  </span>
                </li>
              )}
              {data.actionRequired.pendingPayouts > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-[#F0997B] shrink-0 mt-0.5">•</span>
                  <span className="text-[#F0997B]/80">
                    {data.actionRequired.pendingPayouts} paiement(s) en attente
                  </span>
                </li>
              )}
            </ul>
            <Link
              href="/superadmin"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-[#5DCAA5] hover:text-[#5DCAA5]/80 transition"
            >
              Voir le rapport complet
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <AdminStatCard
          label="Échos actifs"
          value={formatNumber(stats?.activeEchos7d || data.totals.echos)}
          icon={<Users size={16} />}
          accent="white"
          trend={
            data.trends.signupsDelta !== 0
              ? { value: data.trends.signupsDelta, label: "vs sem. dernière" }
              : undefined
          }
        />
        <AdminStatCard
          label="Campagnes actives"
          value={formatNumber(
            stats?.activeCampaigns || data.actionRequired.activeCampaigns,
          )}
          icon={<Megaphone size={16} />}
          accent="orange"
        />
        <AdminStatCard
          label="Revenu aujourd'hui"
          value={formatFCFA(data.today.revenue || data.today.clicks * 50)}
          icon={<TrendingUp size={16} />}
          accent="orange"
          trend={
            data.trends.clicksDelta !== 0
              ? { value: data.trends.clicksDelta, label: "vs hier" }
              : undefined
          }
        />
        <AdminStatCard
          label="Actions en attente"
          value={pendingActions}
          icon={<Clock size={16} />}
          accent={pendingActions > 0 ? "red" : "teal"}
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — Needs attention */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "#111128",
            border: "0.5px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3 className="font-syne font-bold text-sm text-white mb-4">
            Actions requises
          </h3>

          {actionItems.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#1D9E75]/10">
              <CheckCircle2 size={20} className="text-[#5DCAA5]" />
              <div>
                <p className="text-sm font-semibold text-[#5DCAA5]">
                  Tout est en ordre
                </p>
                <p className="text-xs text-white/30">
                  Aucune action urgente pour le moment.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition group"
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        item.severity === "red"
                          ? "#F09595"
                          : item.severity === "blue"
                            ? "#60A5FA"
                            : "#F0997B",
                    }}
                  />
                  <span
                    className={`shrink-0 ${
                      item.severity === "red"
                        ? "text-[#F09595]"
                        : item.severity === "blue"
                          ? "text-blue-400"
                          : "text-[#F0997B]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[13px] text-white/60 flex-1 font-dm">
                    {item.text}
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-white/10 group-hover:text-white/40 transition shrink-0"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right — Sparklines */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "#111128",
            border: "0.5px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3 className="font-syne font-bold text-sm text-white mb-4">
            7 derniers jours
          </h3>

          <div className="space-y-5">
            {/* Clicks sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-dm font-medium text-white/40 uppercase tracking-wider">
                  Clics
                </span>
                <span className="text-sm font-syne font-bold text-white">
                  {formatNumber(
                    clicksSparkline.reduce((s, d) => s + d.valid, 0),
                  )}
                </span>
              </div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={clicksSparkline}>
                    <defs>
                      <linearGradient
                        id="clicksGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#D35400"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#D35400"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="valid"
                      stroke="#D35400"
                      strokeWidth={1.5}
                      fill="url(#clicksGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Signups sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-dm font-medium text-white/40 uppercase tracking-wider">
                  Inscriptions
                </span>
                <span className="text-sm font-syne font-bold text-white">
                  {formatNumber(
                    signupsSparkline.reduce((s, d) => s + d.count, 0),
                  )}
                </span>
              </div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupsSparkline}>
                    <defs>
                      <linearGradient
                        id="signupsGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#1D9E75"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#1D9E75"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1D9E75"
                      strokeWidth={1.5}
                      fill="url(#signupsGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue sparkline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-dm font-medium text-white/40 uppercase tracking-wider">
                  Revenu
                </span>
                <span className="text-sm font-syne font-bold text-[#D35400]">
                  {formatFCFA(data.financial.grossRevenue)}
                </span>
              </div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueSparkline}>
                    <Bar
                      dataKey="value"
                      fill="#D35400"
                      radius={[2, 2, 0, 0]}
                      opacity={0.6}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial snapshot */}
      <div className="mt-6">
        <h3 className="text-[11px] font-dm font-medium text-white/30 uppercase tracking-wider mb-3">
          Aperçu financier
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminStatCard
            label="Commission gagnée"
            value={formatFCFA(data.financial.commission)}
            accent="teal"
          />
          <AdminStatCard
            label="Retraits en attente"
            value={formatFCFA(data.financial.pendingPayouts)}
            accent={data.financial.pendingPayouts > 0 ? "red" : "teal"}
          />
          <AdminStatCard
            label="Revenu brut"
            value={formatFCFA(data.financial.grossRevenue)}
            accent="orange"
          />
        </div>
      </div>
    </div>
  );
}
