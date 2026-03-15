"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import TabBar from "@/components/ui/TabBar";

interface Milestone {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  reward_fcfa: number;
  condition_type: string;
  condition_value: number;
  sort_order: number;
  active: boolean;
}

interface Achievement {
  echo_id: string;
  milestone_id: string;
  reward_fcfa: number;
  achieved_at: string;
}

interface StreakRecord {
  echo_id: string;
  current_streak: number;
  longest_streak: number;
}

interface StreakReward {
  echo_id: string;
  reward_fcfa: number;
  credited_at: string;
}

interface LeaderboardEntry {
  echo_id: string;
  name: string;
  tier: string;
  total_clicks: number;
  campaigns_joined: number;
}

const TIER_ICONS: Record<string, string> = {
  echo: "🔵",
  argent: "🥈",
  or: "🥇",
  diamant: "💎",
};

const TIER_COLORS: Record<string, string> = {
  echo: "bg-blue-500/10 text-blue-400",
  argent: "bg-slate-300/10 text-slate-300",
  or: "bg-yellow-500/10 text-yellow-400",
  diamant: "bg-purple-500/10 text-purple-400",
};

export default function SuperadminGamification() {
  const { t } = useTranslation();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [totalEchos, setTotalEchos] = useState(0);
  const [streaks, setStreaks] = useState<StreakRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [streakRewards, setStreakRewards] = useState<StreakReward[]>([]);
  const [tierDistribution, setTierDistribution] = useState<
    Record<string, number>
  >({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("week");
  const [activeCampaigns, setActiveCampaigns] = useState(0);

  // Settings state
  const [gamificationEnabled, setGamificationEnabled] = useState(true);
  const [monthlyBudgetCap, setMonthlyBudgetCap] = useState(100000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadLeaderboard(leaderboardPeriod);
  }, [leaderboardPeriod]);

  async function loadData() {
    const res = await fetch("/api/superadmin/gamification");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();

    setTotalEchos(data.totalEchos || 0);
    setStreaks(data.streaks || []);
    setAchievements(data.achievements || []);
    setMilestones(data.milestones || []);
    setStreakRewards(data.streakRewards || []);
    setActiveCampaigns(data.activeCampaigns || 0);

    // Tier distribution
    const tiers: Record<string, number> = { echo: 0, argent: 0, or: 0, diamant: 0 };
    (data.tiers || []).forEach((u: { tier: string }) => {
      const tier = u.tier || "echo";
      tiers[tier] = (tiers[tier] || 0) + 1;
    });
    setTierDistribution(tiers);

    // Settings
    (data.settings || []).forEach((s: { key: string; value: string }) => {
      if (s.key === "gamification_enabled") setGamificationEnabled(s.value === "true");
      if (s.key === "gamification_monthly_cap") setMonthlyBudgetCap(parseInt(s.value) || 100000);
    });

    await loadLeaderboard("week");
    setLoading(false);
  }

  async function loadLeaderboard(period: string) {
    const res = await fetch(`/api/leaderboard?period=${period}`);
    if (res.ok) {
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    }
  }

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    await supabase
      .from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  // KPI calculations
  const activeStreaks = streaks.filter((s) => s.current_streak > 0);
  const avgStreak =
    activeStreaks.length > 0
      ? (
          activeStreaks.reduce((sum, s) => sum + s.current_streak, 0) /
          activeStreaks.length
        ).toFixed(1)
      : "0";

  const totalBadgesUnlocked = achievements.length;
  const totalStreakRewards = streakRewards.reduce(
    (sum, r) => sum + r.reward_fcfa,
    0
  );
  const totalMilestoneRewards = achievements.reduce(
    (sum, a) => sum + a.reward_fcfa,
    0
  );
  const totalBonusDistributed = totalStreakRewards + totalMilestoneRewards;

  // Streak distribution
  const streakBuckets: Record<string, number> = {
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5+": 0,
  };
  // Count echos with no streak record as streak 0
  const echosWithStreak = new Set(streaks.map((s) => s.echo_id));
  streakBuckets["0"] = totalEchos - echosWithStreak.size;
  streaks.forEach((s) => {
    if (s.current_streak === 0) streakBuckets["0"]++;
    else if (s.current_streak === 1) streakBuckets["1"]++;
    else if (s.current_streak === 2) streakBuckets["2"]++;
    else if (s.current_streak === 3) streakBuckets["3"]++;
    else if (s.current_streak === 4) streakBuckets["4"]++;
    else streakBuckets["5+"]++;
  });
  const maxStreakBucket = Math.max(...Object.values(streakBuckets), 1);

  // Milestone unlock rates
  const milestoneStats = milestones.map((m) => {
    const unlocked = achievements.filter(
      (a) => a.milestone_id === m.id
    ).length;
    const totalRewarded = unlocked * m.reward_fcfa;
    const percent = totalEchos > 0 ? Math.round((unlocked / totalEchos) * 100) : 0;
    return { ...m, unlocked, totalRewarded, percent };
  });
  milestoneStats.sort((a, b) => b.percent - a.percent);

  // Top streakers
  const topStreakers = [...streaks]
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 10);

  // Monthly cost tracking
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyStreakRewards = streakRewards
    .filter((r) => r.credited_at >= monthStart)
    .reduce((sum, r) => sum + r.reward_fcfa, 0);
  const monthlyMilestoneRewards = achievements
    .filter((a) => a.achieved_at >= monthStart)
    .reduce((sum, a) => sum + a.reward_fcfa, 0);
  const monthlyTotal = monthlyStreakRewards + monthlyMilestoneRewards;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">
          🎮 Gamification
        </h1>
      </div>

      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("gamification.activeStreaks")}
          value={activeStreaks.length.toString()}
          sub={`${totalEchos > 0 ? Math.round((activeStreaks.length / totalEchos) * 100) : 0}% ${t("gamification.ofTotalEchos")}`}
          icon="🔥"
        />
        <KpiCard
          label={t("gamification.avgStreak")}
          value={avgStreak}
          sub={`${t("gamification.longestStreak")}: ${streaks.length > 0 ? Math.max(...streaks.map((s) => s.longest_streak)) : 0}`}
          icon="📊"
        />
        <KpiCard
          label={t("gamification.badgesUnlocked")}
          value={totalBadgesUnlocked.toString()}
          sub={`${milestones.length} ${t("gamification.milestone")}s`}
          icon="🏆"
        />
        <KpiCard
          label={t("gamification.bonusDistributed")}
          value={formatFCFA(totalBonusDistributed)}
          sub={`${t("gamification.streakRewards")}: ${formatFCFA(totalStreakRewards)}`}
          icon="💰"
        />
      </div>

      {/* Warning callout */}
      {activeCampaigns === 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-red-400 text-sm font-semibold flex-1">
              {t("gamification.noCampaignsWarning")}
            </span>
            <Link
              href="/superadmin/campaigns"
              className="px-4 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold hover:opacity-90 transition whitespace-nowrap text-center"
            >
              {t("gamification.createCampaign")}
            </Link>
          </div>
        </div>
      )}

      {/* Gamification ROI */}
      {totalBonusDistributed > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold mb-3">{t("gamification.roiTitle")}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-400">{formatFCFA(totalBonusDistributed)}</div>
              <div className="text-[10px] text-white/40">{t("gamification.bonusesPaid")}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-accent">{activeStreaks.length}</div>
              <div className="text-[10px] text-white/40">{t("gamification.engagedEchos")}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {activeStreaks.length > 0 ? formatFCFA(Math.round(totalBonusDistributed / activeStreaks.length)) : "—"}
              </div>
              <div className="text-[10px] text-white/40">{t("gamification.costPerEngaged")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Tier Distribution */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">{t("gamification.tierDistribution")}</h2>
        <div className="space-y-3">
          {(["echo", "argent", "or", "diamant"] as const).map((tier) => {
            const count = tierDistribution[tier] || 0;
            const percent = totalEchos > 0 ? Math.round((count / totalEchos) * 100) : 0;
            return (
              <div key={tier} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{TIER_ICONS[tier]}</span>
                <span className="text-xs font-semibold w-20 capitalize">
                  {t(`gamification.tierName_${tier}`)}
                </span>
                <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      tier === "echo"
                        ? "bg-blue-500/30"
                        : tier === "argent"
                        ? "bg-slate-400/30"
                        : tier === "or"
                        ? "bg-yellow-500/30"
                        : "bg-purple-500/30"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs text-white/60 w-20 text-right">
                  {count} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Streak Distribution */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">{t("gamification.streakDistribution")}</h2>
        <div className="space-y-2">
          {Object.entries(streakBuckets).map(([label, count]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs font-semibold w-16 text-white/60">
                Streak {label}:
              </span>
              <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/30 rounded-full transition-all"
                  style={{
                    width: `${Math.round((count / maxStreakBucket) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-white/60 w-10 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Most Unlocked Milestones */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">{t("gamification.mostUnlocked")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/5">
                <th className="text-left py-2 font-semibold">{t("gamification.milestone")}</th>
                <th className="text-right py-2 font-semibold">{t("gamification.unlockedBy")}</th>
                <th className="text-right py-2 font-semibold">{t("gamification.percentEchos")}</th>
                <th className="text-right py-2 font-semibold">{t("gamification.totalRewarded")}</th>
              </tr>
            </thead>
            <tbody>
              {milestoneStats.map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="py-2.5">
                    <span className="mr-2">{m.icon}</span>
                    <span className="font-semibold">{m.title}</span>
                  </td>
                  <td className="text-right py-2.5 text-white/60">{m.unlocked}</td>
                  <td className="text-right py-2.5 text-white/60">{m.percent}%</td>
                  <td className="text-right py-2.5 text-accent font-semibold">
                    {formatFCFA(m.totalRewarded)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Top Streakers */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">{t("gamification.topStreakers")}</h2>
        {topStreakers.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-4">
            {t("gamification.noRanking")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="text-left py-2 font-semibold">Écho</th>
                  <th className="text-right py-2 font-semibold">{t("gamification.currentStreak")}</th>
                  <th className="text-right py-2 font-semibold">{t("gamification.longestStreak")}</th>
                </tr>
              </thead>
              <tbody>
                {topStreakers.map((s, i) => (
                  <tr key={s.echo_id} className="border-b border-white/5">
                    <td className="py-2.5 font-semibold">
                      <span className="text-white/30 mr-2">#{i + 1}</span>
                      {s.echo_id.substring(0, 8)}...
                    </td>
                    <td className="text-right py-2.5">
                      <span className="text-primary font-bold">{s.current_streak}</span>
                    </td>
                    <td className="text-right py-2.5 text-white/60">{s.longest_streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 6: Leaderboard Preview */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">{t("gamification.leaderboardPreview")}</h2>
        <TabBar
          tabs={[
            { key: "week", label: t("gamification.thisWeek") },
            { key: "month", label: t("gamification.thisMonth") },
            { key: "all", label: t("gamification.allTime") },
          ]}
          active={leaderboardPeriod}
          onChange={setLeaderboardPeriod}
          className="mb-4"
        />
        {leaderboard.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-4">
            {t("gamification.noRanking")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/5">
                  <th className="text-left py-2 font-semibold">{t("gamification.rank")}</th>
                  <th className="text-left py-2 font-semibold">{t("gamification.name")}</th>
                  <th className="text-center py-2 font-semibold">Tier</th>
                  <th className="text-right py-2 font-semibold">{t("gamification.resonances")}</th>
                  <th className="text-right py-2 font-semibold">{t("gamification.rythmes")}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr
                    key={entry.echo_id}
                    className={`border-b border-white/5 ${
                      i === 0
                        ? "bg-yellow-500/5"
                        : i === 1
                        ? "bg-slate-300/5"
                        : i === 2
                        ? "bg-amber-700/5"
                        : ""
                    }`}
                  >
                    <td className="py-2.5 font-bold">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="py-2.5 font-semibold">{entry.name}</td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          TIER_COLORS[entry.tier || "echo"]
                        }`}
                      >
                        {TIER_ICONS[entry.tier || "echo"]}{" "}
                        {(entry.tier || "echo").charAt(0).toUpperCase() +
                          (entry.tier || "echo").slice(1)}
                      </span>
                    </td>
                    <td className="text-right py-2.5 text-primary font-bold">
                      {entry.total_clicks}
                    </td>
                    <td className="text-right py-2.5 text-white/60">
                      {entry.campaigns_joined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 7: Cost Tracker */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">
          💰 {t("gamification.costTracker")}
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/60">{t("gamification.streakRewards")}:</span>
            <span className="font-semibold">{formatFCFA(monthlyStreakRewards)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/60">{t("gamification.milestoneRewards")}:</span>
            <span className="font-semibold">{formatFCFA(monthlyMilestoneRewards)}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
            <span className="font-bold">{t("gamification.totalCost")}:</span>
            <span className="font-black text-primary">{formatFCFA(monthlyTotal)}</span>
          </div>
          {monthlyBudgetCap > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>
                  {Math.round((monthlyTotal / monthlyBudgetCap) * 100)}% du plafond
                </span>
                <span>{formatFCFA(monthlyBudgetCap)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    monthlyTotal / monthlyBudgetCap > 0.8
                      ? "bg-red-500"
                      : monthlyTotal / monthlyBudgetCap > 0.5
                      ? "bg-yellow-500"
                      : "bg-accent"
                  }`}
                  style={{
                    width: `${Math.min(
                      (monthlyTotal / monthlyBudgetCap) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 8: Settings */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">⚙️ {t("gamification.settings")}</h2>
        <div className="space-y-4">
          {/* Gamification toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t("gamification.gamificationEnabled")}</p>
            </div>
            <button
              onClick={() => {
                const newVal = !gamificationEnabled;
                setGamificationEnabled(newVal);
                saveSetting("gamification_enabled", String(newVal));
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                gamificationEnabled ? "bg-accent" : "bg-white/10"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  gamificationEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Monthly budget cap */}
          <div>
            <label className="text-xs text-white/60 block mb-1">
              {t("gamification.monthlyBudgetCap")} (FCFA)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={monthlyBudgetCap}
                onChange={(e) => setMonthlyBudgetCap(parseInt(e.target.value) || 0)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-primary/50"
              />
              <button
                onClick={() =>
                  saveSetting("gamification_monthly_cap", String(monthlyBudgetCap))
                }
                disabled={saving}
                className="btn-primary text-xs !py-2 !px-4"
              >
                {saving ? "..." : t("common.save")}
              </button>
            </div>
          </div>

          {/* Milestone management */}
          <div>
            <p className="text-xs text-white/60 mb-2">{t("gamification.milestoneRewards")}</p>
            <div className="space-y-2">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span>{m.icon}</span>
                    <span className="text-xs font-semibold">{m.title}</span>
                    <span className="text-[10px] text-white/40">
                      {formatFCFA(m.reward_fcfa)}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase
                        .from("gamification_milestones")
                        .update({ active: !m.active })
                        .eq("id", m.id);
                      loadData();
                    }}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                      m.active
                        ? "bg-accent/10 text-accent"
                        : "bg-white/5 text-white/30"
                    }`}
                  >
                    {m.active ? "ON" : "OFF"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] text-white/30 mt-1">{sub}</p>
    </div>
  );
}
