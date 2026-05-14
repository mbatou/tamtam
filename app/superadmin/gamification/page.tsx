"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import TabBar from "@/components/ui/TabBar";
import DateRangeSelector, { type DateRange } from "@/components/ui/DateRangeSelector";

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
  users?: { name: string } | null;
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
  users?: { name: string } | null;
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
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [totalEchos, setTotalEchos] = useState(0);
  const [streaks, setStreaks] = useState<StreakRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [streakRewards, setStreakRewards] = useState<StreakReward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("week");
  const [dateRange, setDateRange] = useState<DateRange>({ key: "all", from: null, to: null });

  // Settings state
  const [gamificationEnabled, setGamificationEnabled] = useState(true);
  const [monthlyBudgetCap, setMonthlyBudgetCap] = useState(100000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  useEffect(() => {
    loadLeaderboard(leaderboardPeriod);
  }, [leaderboardPeriod]);

  async function loadData() {
    const params = new URLSearchParams();
    if (dateRange.from) params.set("from", dateRange.from);
    if (dateRange.to) params.set("to", dateRange.to);
    const qs = params.toString();
    const res = await fetch(`/api/superadmin/gamification${qs ? `?${qs}` : ""}`);
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
      ? (activeStreaks.reduce((sum, s) => sum + s.current_streak, 0) / activeStreaks.length).toFixed(1)
      : "0";
  const totalBadgesUnlocked = achievements.length;
  const totalStreakRewardsAmount = streakRewards.reduce((sum, r) => sum + r.reward_fcfa, 0);
  const totalMilestoneRewards = achievements.reduce((sum, a) => sum + a.reward_fcfa, 0);
  const totalBonusDistributed = totalStreakRewardsAmount + totalMilestoneRewards;

  // Build activity feed from achievements + streak rewards, sorted by date desc
  const activityFeed: { type: "achievement" | "streak"; date: string; echoId: string; echoName: string; amount: number }[] = [];
  for (const a of achievements) {
    activityFeed.push({ type: "achievement", date: a.achieved_at, echoId: a.echo_id, echoName: a.users?.name || a.echo_id.substring(0, 8), amount: a.reward_fcfa });
  }
  for (const s of streakRewards) {
    activityFeed.push({ type: "streak", date: s.credited_at, echoId: s.echo_id, echoName: s.users?.name || s.echo_id.substring(0, 8), amount: s.reward_fcfa });
  }
  activityFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentActivity = activityFeed.slice(0, 20);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">🎮 Gamification</h1>
        <DateRangeSelector value={dateRange.key} onChange={setDateRange} />
      </div>

      {/* Section 1: Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          icon="🔥"
          label={t("gamification.activeStreaks")}
          value={activeStreaks.length.toString()}
          sub={`${totalEchos > 0 ? Math.round((activeStreaks.length / totalEchos) * 100) : 0}% ${t("gamification.ofTotalEchos")}`}
        />
        <OverviewCard
          icon="📊"
          label={t("gamification.avgStreak")}
          value={avgStreak}
          sub={`${t("gamification.longestStreak")}: ${streaks.length > 0 ? Math.max(...streaks.map((s) => s.longest_streak)) : 0}`}
        />
        <OverviewCard
          icon="🏆"
          label={t("gamification.badgesUnlocked")}
          value={totalBadgesUnlocked.toString()}
          sub={`${totalEchos} total echos`}
        />
        <OverviewCard
          icon="💰"
          label={t("gamification.bonusDistributed")}
          value={formatFCFA(totalBonusDistributed)}
          sub={`${t("gamification.streakRewards")}: ${formatFCFA(totalStreakRewardsAmount)}`}
        />
      </div>

      {/* Section 2: Activity Feed */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">📋 Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {recentActivity.map((item, i) => (
              <button
                key={i}
                onClick={() => router.push(`/superadmin/investigate?user_id=${item.echoId}`)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition hover:bg-white/[0.03] text-left ${
                  item.type === "achievement"
                    ? "bg-yellow-500/5 border-yellow-500/10"
                    : "bg-orange-500/5 border-orange-500/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">
                    {item.type === "achievement" ? "🏆" : "🔥"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="text-white/80">{item.echoName}</span>
                      <span className="text-white/30 ml-1.5">—</span>
                      <span className="text-white/50 ml-1.5">
                        {item.type === "achievement" ? "Badge unlocked" : "Streak bonus"}
                      </span>
                    </p>
                    <p className="text-[10px] text-white/30 truncate">
                      {new Date(item.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-400 shrink-0 ml-3">
                  +{formatFCFA(item.amount)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Top Echos Leaderboard */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4">🏅 Top Echos</h2>
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
          <p className="text-xs text-white/40 text-center py-6">
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
                    className={`border-b border-white/5 cursor-pointer hover:bg-white/[0.03] transition ${
                      i === 0 ? "bg-yellow-500/5" : i === 1 ? "bg-slate-300/5" : i === 2 ? "bg-amber-700/5" : ""
                    }`}
                    onClick={() => router.push(`/superadmin/investigate?user_id=${entry.echo_id}`)}
                  >
                    <td className="py-2.5 font-bold">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="py-2.5 font-semibold">{entry.name}</td>
                    <td className="py-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TIER_COLORS[entry.tier || "echo"]}`}>
                        {TIER_ICONS[entry.tier || "echo"]}{" "}
                        {(entry.tier || "echo").charAt(0).toUpperCase() + (entry.tier || "echo").slice(1)}
                      </span>
                    </td>
                    <td className="text-right py-2.5 text-primary font-bold">{entry.total_clicks}</td>
                    <td className="text-right py-2.5 text-white/60">{entry.campaigns_joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4: Settings */}
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

          {/* Tier bonus reference */}
          <div>
            <p className="text-xs text-white/60 mb-2">Bonus par tier (% du CPC écho)</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: "🔵", name: "Écho", bonus: "0%" },
                { icon: "🥈", name: "Argent", bonus: "1%" },
                { icon: "🥇", name: "Or", bonus: "3%" },
                { icon: "💎", name: "Diamant", bonus: "5%" },
              ].map((t) => (
                <div key={t.name} className="bg-white/5 rounded-xl p-2 text-center">
                  <span className="text-base">{t.icon}</span>
                  <p className="text-[10px] text-white/50 font-semibold mt-1">{t.name}</p>
                  <p className="text-xs font-bold text-primary">{t.bonus}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Streak rewards reference */}
          <div>
            <p className="text-xs text-white/60 mb-2">Récompenses de série (cycle 90 jours)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji: "🔥", label: "7 jours", reward: "100 F" },
                { emoji: "💪", label: "30 jours", reward: "500 F" },
                { emoji: "👑", label: "90 jours", reward: "2 000 F" },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
                  <span className="text-base">{s.emoji}</span>
                  <p className="text-[10px] text-white/50 font-semibold mt-1">{s.label}</p>
                  <p className="text-xs font-bold text-accent">{s.reward}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Caps reference */}
          <div>
            <p className="text-xs text-white/60 mb-2">Plafonds de sécurité</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-white/40 font-semibold">Par écho / jour</p>
                <p className="text-sm font-bold">500 FCFA</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-white/40 font-semibold">Plateforme / mois</p>
                <p className="text-sm font-bold">50 000 FCFA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] text-white/30 mt-1">{sub}</p>
    </div>
  );
}
