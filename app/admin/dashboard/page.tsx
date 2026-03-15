"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import {
  AreaChart, Area,
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
  campaigns: { id: string; title: string; budget: number; spent: number; status: string; cpc: number; created_at: string }[];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data);
      // Show onboarding for new brands
      if (data.totalCampaigns === 0 && data.walletBalance === 0) {
        setShowOnboarding(true);
      }
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
  const allCampaigns = stats.campaigns || [];
  const activeCampaigns = allCampaigns.filter(c => c.status === "active");
  const finishedCampaigns = allCampaigns.filter(c => c.status === "completed");

  // Cost per click calculation
  const costPerClick = stats.validClicks > 0 ? Math.round(stats.budgetSpent / stats.validClicks) : 0;

  // Remaining budget — never show negative
  const remainingBudget = Math.max(0, stats.budgetTotal - stats.budgetSpent);
  const budgetFullyConsumed = stats.budgetTotal > 0 && remainingBudget === 0;

  // Find best campaign by CPC
  const campaignsWithCPC = finishedCampaigns
    .filter(c => c.spent > 0)
    .map(c => {
      // Estimate valid clicks from budget/cpc ratio
      const estimatedValidClicks = Math.floor(c.spent / c.cpc);
      const actualCPC = estimatedValidClicks > 0 ? Math.round(c.spent / estimatedValidClicks) : c.cpc;
      return { ...c, estimatedClicks: estimatedValidClicks, actualCPC };
    })
    .sort((a, b) => a.actualCPC - b.actualCPC);

  const bestCampaign = campaignsWithCPC[0] || null;

  // Top echos insight
  const topEchosTotal = stats.topEchos.slice(0, 5).reduce((sum, e) => sum + e.clicks, 0);
  const topEchosPct = stats.totalClicks > 0 ? Math.round((topEchosTotal / stats.totalClicks) * 100) : 0;

  // ── Onboarding overlay ──
  if (showOnboarding) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center">
          {onboardingStep === 1 && (
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mx-auto text-3xl">🥁</div>
              <h1 className="text-2xl font-bold">{t("admin.onboarding.welcome")}</h1>
              <p className="text-white/60 max-w-md mx-auto">{t("admin.onboarding.howItWorks")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg">1.</span>
                  <p className="text-sm font-semibold mt-1">{t("admin.onboarding.step1")}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg">2.</span>
                  <p className="text-sm font-semibold mt-1">{t("admin.onboarding.step2")}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg">3.</span>
                  <p className="text-sm font-semibold mt-1">{t("admin.onboarding.step3")}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-lg">4.</span>
                  <p className="text-sm font-semibold mt-1">{t("admin.onboarding.step4")}</p>
                </div>
              </div>
              <button onClick={() => setOnboardingStep(2)} className="btn-primary">{t("admin.onboarding.next")}</button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">{t("admin.onboarding.addFunds")}</h2>
              <p className="text-white/60">{t("admin.onboarding.addFundsDesc")}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {[10000, 25000, 50000].map(amount => (
                  <a
                    key={amount}
                    href="/admin/wallet"
                    className="px-5 py-3 rounded-xl border border-white/10 text-sm font-semibold hover:border-primary/30 hover:bg-primary/5 transition"
                  >
                    {formatFCFA(amount)}
                  </a>
                ))}
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setOnboardingStep(3)} className="text-sm text-white/40 hover:text-white/60">{t("admin.onboarding.skip")}</button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">{t("admin.onboarding.launchFirst")}</h2>
              <a href="/admin/campaigns" className="btn-primary inline-block">{t("admin.onboarding.createCampaign")}</a>
              <div>
                <button onClick={() => setShowOnboarding(false)} className="text-sm text-white/40 hover:text-white/60">{t("admin.onboarding.exploreDashboard")}</button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full ${s === onboardingStep ? "bg-primary" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">{t("admin.dashboard.title")}</h1>

      {/* ── Campaign Status Banner ── */}
      {activeCampaigns.length === 0 ? (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <h2 className="text-lg font-bold mb-2">{t("admin.dashboard.noCampaignActive")}</h2>
          <p className="text-sm text-white/60 mb-4">
            {stats.activeEchos > 0
              ? t("admin.dashboard.echosWaiting", { count: String(stats.activeEchos) })
              : t("admin.dashboard.launchPrompt")}
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/admin/campaigns" className="btn-primary text-sm">{t("admin.dashboard.launchRythme")}</a>
            {bestCampaign && (
              <a href="/admin/campaigns" className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/10 transition">
                {t("admin.dashboard.relaunchBest", { name: bestCampaign.title })}
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-emerald-400">
              {activeCampaigns.length} {t("admin.dashboard.campaignsRunning")}
            </h2>
          </div>
          <div className="space-y-2">
            {activeCampaigns.map(c => {
              const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
              const clicks = c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0;
              return (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="font-semibold flex-1 min-w-0 truncate">{c.title}</span>
                  <span className="text-white/40 shrink-0">{pct}% — {clicks} clics</span>
                </div>
              );
            })}
          </div>
          <a href="/admin/campaigns" className="text-xs text-accent font-semibold mt-3 inline-block hover:underline">
            {t("admin.dashboard.viewDetails")} →
          </a>
        </div>
      )}

      {/* ── Simplified Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("admin.dashboard.totalReach")} value={formatNumber(stats.totalClicks)} sub={t("admin.dashboard.totalReachSub")} accent="orange" />
        <StatCard label={t("admin.dashboard.realClicks")} value={formatNumber(stats.validClicks)} sub={t("admin.dashboard.realClicksSub")} accent="teal" />
        <StatCard
          label={t("admin.dashboard.budgetSpent")}
          value={formatFCFA(stats.budgetSpent)}
          sub={budgetFullyConsumed
            ? t("admin.dashboard.budgetConsumed")
            : remainingBudget > 0
            ? `${formatFCFA(remainingBudget)} ${t("common.remaining")}`
            : undefined}
          accent="orange"
        />
        <StatCard
          label={t("admin.dashboard.costPerClick")}
          value={costPerClick > 0 ? formatFCFA(costPerClick) : "—"}
          sub={t("admin.dashboard.costPerClickSub")}
          accent="purple"
        />
      </div>

      {/* ── Charts ── */}
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(v) => formatShortDate(String(v))}
                />
                <Area type="monotone" dataKey="valid" name={t("admin.dashboard.realClicks")} stroke="#22c55e" fill="url(#gradValidAdmin)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-white/30">{t("admin.dashboard.noClicks")}</p>
              {stats.totalCampaigns === 0 && (
                <a href="/admin/campaigns" className="text-xs text-primary font-semibold mt-2 inline-block">{t("admin.dashboard.launchRythme")}</a>
              )}
            </div>
          )}
        </div>

        {/* Campaign Scorecard (replaces budget bar chart) */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4">{t("admin.dashboard.campaignResults")}</h3>
          {allCampaigns.length > 0 ? (
            <div className="space-y-4">
              {allCampaigns.slice(0, 4).map((c, i) => {
                const progress = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
                const clicks = c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0;
                const cpc = clicks > 0 ? Math.round(c.spent / clicks) : c.cpc;
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {i < 3 && <span className="text-sm">{medals[i]}</span>}
                      <span className="text-sm font-semibold flex-1 truncate">{c.title}</span>
                      <span className="text-xs text-white/40">{formatFCFA(c.budget)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>{clicks} clics</span>
                      <span>·</span>
                      <span>{formatFCFA(cpc)}/clic</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-gradient-primary"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Insight */}
              {bestCampaign && allCampaigns.length > 1 && (
                <div className="mt-4 p-3 rounded-xl bg-accent/5 border border-accent/10">
                  <p className="text-xs text-accent">
                    {t("admin.dashboard.bestCampaignInsight", { name: bestCampaign.title, cpc: formatFCFA(bestCampaign.actualCPC) })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-white/30">{t("admin.dashboard.noCampaign")}</p>
              <a href="/admin/campaigns" className="text-xs text-primary font-semibold mt-2 inline-block">{t("admin.dashboard.launchRythme")}</a>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Échos ── */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">{t("admin.dashboard.topEchos")}</h2>
        <div className="space-y-3">
          {stats.topEchos.length === 0 ? (
            <p className="text-white/30 text-sm">{t("admin.dashboard.noEchoEngaged")}</p>
          ) : (
            <>
              {stats.topEchos.map((echo, i) => (
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
              ))}

              {/* Top echos insight */}
              {topEchosPct > 0 && stats.topEchos.length >= 3 && (
                <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs text-white/40">
                    {t("admin.dashboard.topEchosInsight", { pct: String(topEchosPct) })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
