"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import InsightBar from "@/components/dashboard/InsightBar";
import PixelSummary from "@/components/dashboard/PixelSummary";
import CampaignList from "@/components/dashboard/CampaignList";
import DashboardFunnel from "@/components/dashboard/DashboardFunnel";
import ClicksChart from "@/components/dashboard/ClicksChart";
import { Eye, UserCheck, Banknote, TrendingDown, ShieldCheck, Download, Plus } from "lucide-react";

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

export default function AdminDashboard() {
  const { t, locale } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data);
      if (data.totalCampaigns === 0 && data.walletBalance === 0) {
        setShowOnboarding(true);
      }
    }
    setLoading(false);
  }

  if (loading || !stats) {
    return (
      <div className="p-6 space-y-5" style={{ maxWidth: "100%" }}>
        <div className="skeleton h-6 w-36 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-[100px] rounded-xl" />)}
        </div>
        <div className="skeleton h-[90px] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="skeleton h-[240px] rounded-xl" />
          <div className="space-y-5">
            <div className="skeleton h-[140px] rounded-xl" />
            <div className="skeleton h-[90px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const allCampaigns = stats.campaigns || [];
  const finishedCampaigns = allCampaigns.filter(c => c.status === "completed");

  const costPerClick = stats.validClicks > 0
    ? Math.round(stats.budgetSpent / stats.validClicks)
    : (() => {
        const withCpc = allCampaigns.filter(c => c.cpc > 0);
        if (withCpc.length === 0) return 0;
        return Math.round(withCpc.reduce((s, c) => s + c.cpc, 0) / withCpc.length);
      })();

  const remainingBudget = Math.max(0, stats.budgetTotal - stats.budgetSpent);
  const budgetFullyConsumed = stats.budgetTotal > 0 && remainingBudget === 0;

  const campaignsWithCPC = finishedCampaigns
    .filter(c => c.spent > 0)
    .map(c => {
      const estimatedValidClicks = Math.floor(c.spent / c.cpc);
      const actualCPC = estimatedValidClicks > 0 ? Math.round(c.spent / estimatedValidClicks) : c.cpc;
      return { ...c, estimatedClicks: estimatedValidClicks, actualCPC };
    })
    .sort((a, b) => a.actualCPC - b.actualCPC);

  const bestCampaign = campaignsWithCPC[0] || null;
  const avgCPC = campaignsWithCPC.length > 0
    ? Math.round(campaignsWithCPC.reduce((s, c) => s + c.actualCPC, 0) / campaignsWithCPC.length)
    : 0;

  const campaignRows = allCampaigns.slice(0, 4).map(c => {
    const clicks = c.realClicks ?? (c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0);
    const cpc = clicks > 0 ? Math.round(c.spent / clicks) : c.cpc;
    return {
      id: c.id,
      title: c.title,
      clicks,
      cpc,
      budget: c.budget,
      status: c.status,
      isBest: bestCampaign?.id === c.id && finishedCampaigns.length > 1,
    };
  });

  const insightNode = bestCampaign ? (
    <>
      <span className="font-bold text-white">&ldquo;{bestCampaign.title}&rdquo;</span>
      {" "}{t("admin.dashboard.hasBestCpa")}{" "}
      <span style={{ color: "#5DCAA5" }}>{formatFCFA(bestCampaign.actualCPC)}/{t("admin.campaigns.perClick")}</span>
      {avgCPC > 0 && bestCampaign.actualCPC < avgCPC && (
        <> — {t("admin.dashboard.cheaperThanAvg", { ratio: String((avgCPC / bestCampaign.actualCPC).toFixed(1)) })}</>
      )}
    </>
  ) : (
    <>{t("admin.dashboard.launchPrompt")}</>
  );

  const dateStr = new Date().toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { day: "numeric", month: "long", year: "numeric" }
  );

  // Onboarding
  if (showOnboarding) {
    const tourSteps = [
      {
        emoji: "🥁",
        title: t("admin.onboarding.welcome"),
        desc: t("admin.onboarding.howItWorks"),
        content: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {[t("admin.onboarding.step1"), t("admin.onboarding.step2"), t("admin.onboarding.step3"), t("admin.onboarding.step4")].map((step, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                <span className="text-lg font-bold" style={{ color: "#D35400" }}>{i + 1}.</span>
                <p className="text-sm font-medium mt-1">{step}</p>
              </div>
            ))}
          </div>
        ),
      },
      { emoji: "📊", title: t("admin.onboarding.tourDashboard"), desc: t("admin.onboarding.tourDashboardDesc"), highlight: "/admin/dashboard" },
      { emoji: "🎯", title: t("admin.onboarding.tourCampaigns"), desc: t("admin.onboarding.tourCampaignsDesc"), highlight: "/admin/campaigns" },
      {
        emoji: "💰", title: t("admin.onboarding.tourWallet"), desc: t("admin.onboarding.tourWalletDesc"), highlight: "/admin/wallet",
        content: (
          <div className="flex flex-wrap gap-3 justify-center">
            {[10000, 25000, 50000].map(amount => (
              <a key={amount} href="/admin/wallet" className="px-5 py-3 rounded-xl text-sm font-medium transition" style={{ border: "0.5px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}>
                {formatFCFA(amount)}
              </a>
            ))}
          </div>
        ),
      },
      { emoji: "📈", title: t("admin.onboarding.tourAnalytics"), desc: t("admin.onboarding.tourAnalyticsDesc"), highlight: "/admin/analytics" },
      { emoji: "👥", title: t("admin.onboarding.tourEchos"), desc: t("admin.onboarding.tourEchosDesc"), highlight: "/admin/echos" },
      { emoji: "💬", title: t("admin.onboarding.tourSupport"), desc: t("admin.onboarding.tourSupportDesc"), highlight: "/admin/support" },
      {
        emoji: "🚀", title: t("admin.onboarding.tourReady"), desc: t("admin.onboarding.tourReadyDesc"),
        content: (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/admin/wallet" className="px-6 py-3 rounded-lg text-sm font-bold text-white text-center" style={{ background: "#D35400" }}>
              {t("admin.onboarding.addFunds")}
            </a>
            <a href="/admin/campaigns" className="px-6 py-3 rounded-lg text-sm font-bold text-center" style={{ border: "1px solid #D35400", color: "#D35400" }}>
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
        <div className="rounded-xl p-8 text-center" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
              {onboardingStep}/{totalSteps}
            </span>
            <button onClick={() => setShowOnboarding(false)} className="text-xs transition" style={{ color: "rgba(255,255,255,0.3)" }}>
              {t("admin.onboarding.skipTour")}
            </button>
          </div>

          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 text-2xl" style={{ background: "#D35400" }}>
            {step.emoji}
          </div>

          <h2 className="text-xl font-bold font-syne mb-2">{step.title}</h2>
          <p className="text-sm max-w-md mx-auto mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{step.desc}</p>

          {step.highlight && (
            <a href={step.highlight} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mb-6 transition" style={{ background: "rgba(211,84,0,0.1)", border: "0.5px solid rgba(211,84,0,0.3)", color: "#D35400" }}>
              {t("admin.dashboard.open")}
            </a>
          )}
          {step.content && <div className="mb-6">{step.content}</div>}

          <div className="flex items-center justify-between mt-6 pt-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
              className="text-sm font-medium transition"
              style={{ color: onboardingStep === 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)" }}
              disabled={onboardingStep === 1}
            >
              {t("admin.onboarding.prev")}
            </button>
            <div className="flex gap-1.5">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setOnboardingStep(i + 1)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i + 1 === onboardingStep ? 24 : 6,
                    background: i + 1 === onboardingStep ? "#D35400" : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
            {onboardingStep < totalSteps ? (
              <button onClick={() => setOnboardingStep(onboardingStep + 1)} className="text-sm font-medium" style={{ color: "#D35400" }}>
                {t("admin.onboarding.next")}
              </button>
            ) : (
              <button onClick={() => setShowOnboarding(false)} className="text-sm font-bold" style={{ color: "#1D9E75" }}>
                {t("admin.onboarding.letsGo")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:px-7 space-y-5" style={{ maxWidth: "100%" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">{t("admin.dashboard.title")}</h1>
          <p className="text-xs font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {dateStr} · {t("admin.dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition"
            style={{
              color: "rgba(255,255,255,0.5)",
              border: "0.5px solid rgba(255,255,255,0.1)",
            }}
          >
            <Download size={13} />
            {t("admin.dashboard.export")}
          </button>
          <a
            href="/admin/campaigns"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition active:scale-[0.98]"
            style={{ background: "#D35400" }}
          >
            <Plus size={13} />
            {t("admin.dashboard.newRythme")}
          </a>
        </div>
      </div>

      {/* Smart insight bar */}
      <InsightBar
        insight={insightNode}
        ctaLabel={bestCampaign ? t("admin.dashboard.relaunch") : t("admin.dashboard.launchRythme")}
        ctaHref="/admin/campaigns"
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-up animate-fade-up-1">
          <StatCard
            label={t("admin.dashboard.totalReach")}
            Icon={Eye}
            value={formatNumber(stats.totalClicks)}
            sub={t("admin.dashboard.peoplesaw")}
            accent="orange"
          />
        </div>
        <div className="animate-fade-up animate-fade-up-2">
          <StatCard
            label={t("admin.dashboard.realClicks")}
            Icon={UserCheck}
            value={formatNumber(stats.validClicks)}
            sub={t("admin.dashboard.verifiedHumans")}
            accent="teal"
            benchmarkIcon={<ShieldCheck size={11} style={{ color: "#5DCAA5" }} />}
          />
        </div>
        <div className="animate-fade-up animate-fade-up-3">
          <StatCard
            label={t("admin.dashboard.budgetSpent")}
            Icon={Banknote}
            value={formatFCFA(stats.budgetSpent)}
            sub={budgetFullyConsumed
              ? t("admin.dashboard.budgetConsumed")
              : remainingBudget > 0
              ? `${formatFCFA(remainingBudget)} ${t("admin.dashboard.remaining")}`
              : undefined
            }
            accent="orange"
          />
        </div>
        <div className="animate-fade-up animate-fade-up-4">
          <StatCard
            label={t("admin.dashboard.costPerClick")}
            Icon={TrendingDown}
            value={costPerClick > 0 ? formatFCFA(costPerClick) : "—"}
            sub={costPerClick > 0 ? t("admin.dashboard.cheaperThanMeta") : t("admin.dashboard.configuredCpcHint")}
            accent="teal"
            highlight={costPerClick > 0}
            benchmarkIcon={costPerClick > 0 ? <TrendingDown size={11} style={{ color: "#5DCAA5" }} /> : undefined}
          />
        </div>
      </div>

      {/* Pixel summary — only show if there's conversion data */}
      {stats.validClicks > 0 && (
        <PixelSummary
          stats={[
            { label: t("admin.dashboard.verifiedClicks"), value: stats.validClicks, sub: `100% ${t("admin.dashboard.ofFunnel")}` },
            { label: t("admin.dashboard.signups"), value: 0, sub: `0% ${t("admin.dashboard.conversion")}` },
            { label: t("admin.dashboard.activations"), value: 0, sub: `0% ${t("admin.dashboard.ofSignups")}` },
          ]}
        />
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left — Campaign results (wider) */}
        <div className="lg:col-span-3">
          {campaignRows.length > 0 ? (
            <CampaignList campaigns={campaignRows} />
          ) : (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.dashboard.noCampaign")}</p>
              <a href="/admin/campaigns" className="text-xs font-bold mt-3 inline-block" style={{ color: "#D35400" }}>
                {t("admin.dashboard.launchRythme")}
              </a>
            </div>
          )}
        </div>

        {/* Right — stacked */}
        <div className="lg:col-span-2 space-y-5">
          {/* Funnel — placeholder until pixel data arrives */}
          {stats.validClicks > 0 && (
            <DashboardFunnel
              campaignName={bestCampaign?.title || allCampaigns[0]?.title || "—"}
              rows={[
                { label: t("admin.dashboard.verifiedClicks"), value: stats.validClicks, pct: 100, note: `100% ${t("admin.dashboard.ofFunnel")}` },
                { label: t("admin.dashboard.signups"), value: 0, pct: 0, note: `0% ${t("admin.dashboard.ofClicksConverted")}` },
                { label: t("admin.dashboard.activations"), value: 0, pct: 0, note: `0% ${t("admin.dashboard.ofSignupsActivated")}` },
              ]}
            />
          )}

          {/* Clicks chart */}
          {stats.clicksChart && stats.clicksChart.length > 0 && (
            <ClicksChart data={stats.clicksChart} />
          )}

          {/* Empty state when no chart data */}
          {(!stats.clicksChart || stats.clicksChart.length === 0) && (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {t("admin.dashboard.noClicks")}
              </p>
              {stats.totalCampaigns === 0 && (
                <a href="/admin/campaigns" className="text-xs font-bold mt-2 inline-block" style={{ color: "#D35400" }}>
                  {t("admin.dashboard.launchRythme")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Échos */}
      {stats.topEchos.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.1em] mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
            {t("admin.dashboard.topEchos")}
          </p>
          <div className="space-y-0">
            {stats.topEchos.map((echo, i) => (
              <div key={echo.id}>
                {i > 0 && <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: i < 3 ? "#D35400" : "rgba(255,255,255,0.05)",
                        color: i < 3 ? "#fff" : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-[13px] font-medium">{echo.name}</span>
                      <span className="text-[11px] ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {echo.clicks} {t("common.clicks")}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[13px] font-bold font-syne"
                    style={{ color: i === 0 ? "#D35400" : "#1D9E75" }}
                  >
                    {formatFCFA(echo.earned)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
