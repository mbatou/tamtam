"use client";

import { useEffect, useState } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import CampaignList from "@/components/dashboard/CampaignList";
import ClicksChart from "@/components/dashboard/ClicksChart";
import WalletCard from "@/components/dashboard/WalletCard";
import TopEchosList from "@/components/dashboard/TopEchosList";
import { Eye, UserCheck, Banknote, TrendingDown, Plus, Search } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  budget: number;
  spent: number;
  status: string;
  cpc: number;
  created_at: string;
  objective?: string;
  realClicks?: number;
  realValidClicks?: number;
  echoCount?: number;
}

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
  campaigns: Campaign[];
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
      <div className="p-6 lg:p-8 space-y-6" style={{ maxWidth: "100%" }}>
        <div className="flex items-center justify-between">
          <div className="skeleton h-7 w-40 rounded-lg" />
          <div className="skeleton h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-[90px] rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 skeleton h-[300px] rounded-2xl" />
          <div className="skeleton h-[300px] rounded-2xl" />
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
    .filter(c => c.spent > 0 && (c.realValidClicks || 0) > 0)
    .map(c => ({ ...c, actualCPC: Math.round(c.spent / (c.realValidClicks || 1)) }))
    .sort((a, b) => a.actualCPC - b.actualCPC);

  const bestCampaign = campaignsWithCPC[0] || null;

  const campaignRows = allCampaigns.map(c => {
    const clicks = c.realValidClicks ?? c.realClicks ?? 0;
    const spent = c.spent || 0;
    const cpc = clicks > 0 ? Math.round(spent / clicks) : c.cpc;
    return {
      id: c.id,
      title: c.title,
      clicks,
      cpc,
      budget: c.budget,
      spent,
      status: c.status,
      echoCount: c.echoCount || 0,
      isBest: bestCampaign?.id === c.id && finishedCampaigns.length > 1,
      created_at: c.created_at,
    };
  });

  const dateStr = new Date().toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  // Onboarding
  if (showOnboarding) {
    const tourSteps = [
      {
        emoji: "\u{1F941}",
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
      { emoji: "\u{1F4CA}", title: t("admin.onboarding.tourDashboard"), desc: t("admin.onboarding.tourDashboardDesc"), highlight: "/admin/dashboard" },
      { emoji: "\u{1F3AF}", title: t("admin.onboarding.tourCampaigns"), desc: t("admin.onboarding.tourCampaignsDesc"), highlight: "/admin/campaigns" },
      {
        emoji: "\u{1F4B0}", title: t("admin.onboarding.tourWallet"), desc: t("admin.onboarding.tourWalletDesc"), highlight: "/admin/wallet",
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
      { emoji: "\u{1F4C8}", title: t("admin.onboarding.tourAnalytics"), desc: t("admin.onboarding.tourAnalyticsDesc"), highlight: "/admin/analytics" },
      { emoji: "\u{1F465}", title: t("admin.onboarding.tourEchos"), desc: t("admin.onboarding.tourEchosDesc"), highlight: "/admin/echos" },
      { emoji: "\u{1F4AC}", title: t("admin.onboarding.tourSupport"), desc: t("admin.onboarding.tourSupportDesc"), highlight: "/admin/support" },
      {
        emoji: "\u{1F680}", title: t("admin.onboarding.tourReady"), desc: t("admin.onboarding.tourReadyDesc"),
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
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
              {onboardingStep}/{totalSteps}
            </span>
            <button onClick={() => setShowOnboarding(false)} className="text-xs transition" style={{ color: "rgba(255,255,255,0.3)" }}>
              {t("admin.onboarding.skipTour")}
            </button>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl" style={{ background: "#D35400" }}>
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
            <button onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))} className="text-sm font-medium transition" style={{ color: onboardingStep === 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)" }} disabled={onboardingStep === 1}>
              {t("admin.onboarding.prev")}
            </button>
            <div className="flex gap-1.5">
              {tourSteps.map((_, i) => (
                <button key={i} onClick={() => setOnboardingStep(i + 1)} className="h-1.5 rounded-full transition-all" style={{ width: i + 1 === onboardingStep ? 24 : 6, background: i + 1 === onboardingStep ? "#D35400" : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
            {onboardingStep < totalSteps ? (
              <button onClick={() => setOnboardingStep(onboardingStep + 1)} className="text-sm font-medium" style={{ color: "#D35400" }}>{t("admin.onboarding.next")}</button>
            ) : (
              <button onClick={() => setShowOnboarding(false)} className="text-sm font-bold" style={{ color: "#1D9E75" }}>{t("admin.onboarding.letsGo")}</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-syne text-white">{t("admin.dashboard.title")}</h1>
          <p className="text-xs font-dm mt-1 capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
            {dateStr}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            <Search size={13} />
            <span>{t("admin.dashboard.searchPlaceholder")}</span>
          </div>
          <a
            href="/admin/campaigns"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-orange-900/20"
            style={{ background: "#D35400" }}
          >
            <Plus size={14} />
            {t("admin.dashboard.newRythme")}
          </a>
        </div>
      </div>

      {/* Stat cards row — Officex-style with colored icon circles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-up animate-fade-up-1">
          <StatCard
            label={t("admin.dashboard.totalReach")}
            Icon={Eye}
            value={formatNumber(stats.totalClicks)}
            sub={`${stats.activeEchos} ${t("admin.dashboard.echosActive")}`}
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
            accent="purple"
          />
        </div>
        <div className="animate-fade-up animate-fade-up-4">
          <StatCard
            label={t("admin.dashboard.costPerClick")}
            Icon={TrendingDown}
            value={costPerClick > 0 ? formatFCFA(costPerClick) : "—"}
            sub={costPerClick > 0 ? t("admin.dashboard.cheaperThanMeta") : t("admin.dashboard.configuredCpcHint")}
            accent="blue"
          />
        </div>
      </div>

      {/* Main content: 2/3 campaign table + 1/3 wallet card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {campaignRows.length > 0 ? (
            <CampaignList campaigns={campaignRows} />
          ) : (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(211,84,0,0.1)" }}>
                <Plus size={20} style={{ color: "#D35400" }} />
              </div>
              <p className="text-sm font-medium text-white mb-1">{t("admin.dashboard.noCampaign")}</p>
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.dashboard.launchPrompt")}</p>
              <a href="/admin/campaigns" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "#D35400" }}>
                <Plus size={13} />
                {t("admin.dashboard.launchRythme")}
              </a>
            </div>
          )}
        </div>

        <div>
          <WalletCard
            balance={stats.walletBalance}
            totalSpent={stats.budgetSpent}
            totalBudget={stats.budgetTotal}
          />
        </div>
      </div>

      {/* Bottom row: chart + top echos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {stats.clicksChart && stats.clicksChart.length > 0 ? (
            <ClicksChart data={stats.clicksChart} />
          ) : (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.dashboard.noClicks")}</p>
            </div>
          )}
        </div>

        <div>
          {stats.topEchos.length > 0 ? (
            <TopEchosList echos={stats.topEchos.slice(0, 5)} />
          ) : (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-sm font-semibold font-syne text-white mb-1">{t("admin.dashboard.topEchos")}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.dashboard.noEchoEngaged")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
