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
  campaigns: { id: string; title: string; budget: number; spent: number; status: string; cpc: number; created_at: string; realClicks?: number; realValidClicks?: number }[];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
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

  // Cost per click calculation — fall back to average configured CPC when no valid clicks yet
  const costPerClick = stats.validClicks > 0
    ? Math.round(stats.budgetSpent / stats.validClicks)
    : (() => {
        const campaignsWithCpc = allCampaigns.filter(c => c.cpc > 0);
        if (campaignsWithCpc.length === 0) return 0;
        return Math.round(campaignsWithCpc.reduce((s, c) => s + c.cpc, 0) / campaignsWithCpc.length);
      })();

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
    const tourSteps = [
      {
        emoji: "🥁",
        title: t("admin.onboarding.welcome"),
        desc: t("admin.onboarding.howItWorks"),
        content: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {[t("admin.onboarding.step1"), t("admin.onboarding.step2"), t("admin.onboarding.step3"), t("admin.onboarding.step4")].map((step, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-lg font-bold text-primary">{i + 1}.</span>
                <p className="text-sm font-semibold mt-1">{step}</p>
              </div>
            ))}
          </div>
        ),
      },
      {
        emoji: "📊",
        title: t("admin.onboarding.tourDashboard"),
        desc: t("admin.onboarding.tourDashboardDesc"),
        highlight: "/admin/dashboard",
      },
      {
        emoji: "🎯",
        title: t("admin.onboarding.tourCampaigns"),
        desc: t("admin.onboarding.tourCampaignsDesc"),
        highlight: "/admin/campaigns",
      },
      {
        emoji: "💰",
        title: t("admin.onboarding.tourWallet"),
        desc: t("admin.onboarding.tourWalletDesc"),
        highlight: "/admin/wallet",
        content: (
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
        ),
      },
      {
        emoji: "📈",
        title: t("admin.onboarding.tourAnalytics"),
        desc: t("admin.onboarding.tourAnalyticsDesc"),
        highlight: "/admin/analytics",
      },
      {
        emoji: "👥",
        title: t("admin.onboarding.tourEchos"),
        desc: t("admin.onboarding.tourEchosDesc"),
        highlight: "/admin/echos",
      },
      {
        emoji: "💬",
        title: t("admin.onboarding.tourSupport"),
        desc: t("admin.onboarding.tourSupportDesc"),
        highlight: "/admin/support",
      },
      {
        emoji: "🚀",
        title: t("admin.onboarding.tourReady"),
        desc: t("admin.onboarding.tourReadyDesc"),
        content: (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/admin/wallet" className="btn-primary px-6 py-3 text-sm text-center">
              {t("admin.onboarding.addFunds")}
            </a>
            <a href="/admin/campaigns" className="btn-outline px-6 py-3 text-sm text-center">
              {t("admin.onboarding.createCampaign")}
            </a>
          </div>
        ),
      },
    ];

    const step = tourSteps[onboardingStep - 1];
    const totalSteps = tourSteps.length;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider">
              {onboardingStep}/{totalSteps}
            </span>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-xs text-white/30 hover:text-white/50 transition"
            >
              {t("admin.onboarding.skipTour")}
            </button>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-5 text-2xl">
            {step.emoji}
          </div>

          {/* Title and description */}
          <h2 className="text-xl font-bold mb-2">{step.title}</h2>
          <p className="text-sm text-white/50 max-w-md mx-auto mb-6 leading-relaxed">{step.desc}</p>

          {/* Highlighted page link */}
          {step.highlight && (
            <a
              href={step.highlight}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition mb-6"
            >
              <span>{t("admin.dashboard.open")}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}

          {/* Custom content */}
          {step.content && <div className="mb-6">{step.content}</div>}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
            <button
              onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
              className={`text-sm font-semibold transition ${onboardingStep === 1 ? "text-white/10 cursor-default" : "text-white/40 hover:text-white/60"}`}
              disabled={onboardingStep === 1}
            >
              ← {t("admin.onboarding.prev")}
            </button>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setOnboardingStep(i + 1)}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === onboardingStep ? "w-6 bg-primary" : "w-1.5 bg-white/10 hover:bg-white/20"
                  }`}
                />
              ))}
            </div>

            {onboardingStep < totalSteps ? (
              <button
                onClick={() => setOnboardingStep(onboardingStep + 1)}
                className="text-sm font-semibold text-primary hover:text-primary-light transition"
              >
                {t("admin.onboarding.next")}
              </button>
            ) : (
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-sm font-bold text-accent hover:text-accent/80 transition"
              >
                {t("admin.onboarding.letsGo")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">{t("admin.dashboard.title")}</h1>

      {/* ── Welcome Bonus Banner (LUP-68) ── */}
      {stats.walletBalance > 0 && stats.totalCampaigns === 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-4 text-center mb-6">
          <div className="text-white font-bold text-lg">{t("admin.dashboard.welcomeBonus")}</div>
          <div className="text-white/80 text-sm">
            {t("admin.dashboard.welcomeBonusDesc")}
          </div>
        </div>
      )}

      {/* ── Snapchat Announcement (LUP-85) ── */}
      <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-400/20 rounded-xl p-4 mb-4 flex items-center gap-4">
        <span className="text-3xl">👻</span>
        <div>
          <h4 className="text-white font-bold text-sm">{t("snapchat.brandAnnounceTitle")}</h4>
          <p className="text-gray-400 text-sm mt-0.5">
            {t("snapchat.brandAnnounceDesc")}
          </p>
        </div>
        <span className="bg-yellow-400/20 text-yellow-300 text-xs px-3 py-1.5 rounded-full font-medium shrink-0">
          {t("snapchat.comingSoonBrand")}
        </span>
      </div>

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
              const clicks = c.realClicks ?? (c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0);
              return (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="font-semibold flex-1 min-w-0 truncate">{c.title}</span>
                  <span className="text-white/40 shrink-0">{pct}% — {clicks} {t("common.clicks")}</span>
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
          sub={costPerClick > 0 && stats.validClicks === 0 ? t("admin.dashboard.configuredCpcHint") : t("admin.dashboard.costPerClickSub")}
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
                const clicks = c.realClicks ?? (c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0);
                const cpc = clicks > 0 ? Math.round(c.spent / clicks) : c.cpc;
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {i < 3 && <span className="text-sm">{medals[i]}</span>}
                      <span className="text-sm font-semibold flex-1 truncate">{c.title}</span>
                      <span className="text-xs text-white/40">{formatFCFA(c.budget)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>{clicks} {t("common.clicks")}</span>
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
