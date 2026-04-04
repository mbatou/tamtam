"use client";

import { useEffect, useState, useCallback } from "react";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface Goal {
  id: string;
  phase: string;
  phase_label: string;
  metric_key: string;
  metric_label: string;
  target_value: number;
  icon: string;
  sort_order: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  phase: string;
  achieved: boolean;
  achieved_at: string | null;
  target_date: string | null;
  sort_order: number;
}

interface WeeklyMetric {
  current: number;
  previous: number;
}

interface RoadmapData {
  currentValues: Record<string, number>;
  goals: Goal[];
  milestones: Milestone[];
  weeklyComparison: {
    echos: WeeklyMetric;
    clicks: WeeklyMetric;
    revenue: WeeklyMetric;
    leads: WeeklyMetric;
  };
  fetchedAt: string;
}

type Phase = "phase_1" | "phase_2" | "phase_3";

const PHASE_META_KEYS: Record<Phase, { label: string; subtitle: string; weeks: string }> = {
  phase_1: { label: "superadmin.roadmap.prove", subtitle: "superadmin.roadmap.proveSubtitle", weeks: "superadmin.roadmap.proveWeeks" },
  phase_2: { label: "superadmin.roadmap.grow", subtitle: "superadmin.roadmap.growSubtitle", weeks: "superadmin.roadmap.growWeeks" },
  phase_3: { label: "superadmin.roadmap.dominate", subtitle: "superadmin.roadmap.dominateSubtitle", weeks: "superadmin.roadmap.dominateWeeks" },
};

function getPhaseFromEchos(total: number): Phase {
  if (total >= 500) return "phase_3";
  if (total >= 100) return "phase_2";
  return "phase_1";
}

function formatMetricValue(key: string, value: number, t: (k: string) => string): string {
  if (key === "total_paid_out" || key === "monthly_revenue") return formatFCFA(value);
  if (key === "fraud_rate_below" || key === "echo_retention_30d") return `${value}%`;
  if (key === "first_payout_done") return value >= 1 ? t("superadmin.roadmap.yes") : t("superadmin.roadmap.no");
  if (value >= 10000) return formatNumber(value);
  return value.toLocaleString("en-US");
}

function formatTargetValue(key: string, value: number, t: (k: string) => string): string {
  if (key === "total_paid_out" || key === "monthly_revenue") return formatFCFA(value);
  if (key === "fraud_rate_below") return `< ${value}%`;
  if (key === "echo_retention_30d") return `${value}%`;
  if (key === "first_payout_done") return t("superadmin.roadmap.yes");
  return value.toLocaleString("en-US");
}

function getGoalProgress(key: string, current: number, target: number): number {
  if (key === "fraud_rate_below") {
    if (current <= 0) return 100;
    if (current >= target * 2) return 0;
    return Math.max(0, Math.min(100, ((target * 2 - current) / (target * 2)) * 100));
  }
  if (key === "first_payout_done") return current >= 1 ? 100 : 0;
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

function getGoalStatus(key: string, current: number, target: number): "on_track" | "attention" | "behind" {
  const progress = getGoalProgress(key, current, target);
  if (key === "fraud_rate_below") {
    if (current <= target) return "on_track";
    if (current <= target * 1.5) return "attention";
    return "behind";
  }
  if (progress >= 50) return "on_track";
  if (progress >= 25) return "attention";
  return "behind";
}

export default function RoadmapPage() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [togglingMilestone, setTogglingMilestone] = useState<string | null>(null);
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/roadmap");
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function toggleMilestone(id: string, achieved: boolean) {
    setTogglingMilestone(id);
    await fetch("/api/superadmin/milestones", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, achieved }),
    });
    await loadData();
    setTogglingMilestone(null);
  }

  if (loading || !data) {
    return (
      <div className="p-6 max-w-7xl space-y-4">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const currentPhase = getPhaseFromEchos(data.currentValues.total_echos || 0);
  const getPhaseMetaTranslated = (phase: Phase) => {
    const keys = PHASE_META_KEYS[phase];
    return { label: t(keys.label), subtitle: t(keys.subtitle), weeks: t(keys.weeks) };
  };
  const phaseMeta = getPhaseMetaTranslated(currentPhase);
  const phaseGoals = data.goals.filter((g) => g.phase === currentPhase);
  const phaseMilestones = data.milestones.filter((m) => m.phase === currentPhase);

  const phaseProgress = phaseGoals.length > 0
    ? Math.round(
        phaseGoals.reduce((sum, g) => {
          return sum + getGoalProgress(g.metric_key, data.currentValues[g.metric_key] || 0, g.target_value);
        }, 0) / phaseGoals.length
      )
    : 0;

  function getPhaseProgress(phase: string) {
    const goals = data!.goals.filter((g) => g.phase === phase);
    if (goals.length === 0) return 0;
    return Math.round(
      goals.reduce((sum, g) => {
        return sum + getGoalProgress(g.metric_key, data!.currentValues[g.metric_key] || 0, g.target_value);
      }, 0) / goals.length
    );
  }

  const phases: Phase[] = ["phase_1", "phase_2", "phase_3"];

  const statusConfig = {
    on_track: { label: t("superadmin.roadmap.onTrack"), color: "text-emerald-400", dot: "bg-emerald-400" },
    attention: { label: t("superadmin.roadmap.attention"), color: "text-yellow-400", dot: "bg-yellow-400" },
    behind: { label: t("superadmin.roadmap.behind"), color: "text-red-400", dot: "bg-red-400" },
  };

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("superadmin.roadmap.title")}</h1>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">
            {t("superadmin.roadmap.dayLabel") || "Day"} {Math.floor((Date.now() - new Date("2026-03-10").getTime()) / 86400000)}
          </span>
          <span className="text-xs text-white/30 block">{t("superadmin.roadmap.sinceLaunch") || "since launch"}</span>
        </div>
      </div>

      {/* ===== Section 1: Current Phase Indicator ===== */}
      <div className="glass-card p-6 border border-primary/20" style={{ boxShadow: "0 0 30px rgba(211,84,0,0.08)" }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="text-xl font-bold">
              {t("superadmin.roadmap.phase", { num: currentPhase.replace("phase_", ""), label: phaseMeta.label })}
            </h2>
            <p className="text-xs text-white/40">{phaseMeta.subtitle} — {phaseMeta.weeks}</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-white/50">{t("superadmin.roadmap.globalProgress")}</span>
          <span className="text-sm font-bold text-primary">{phaseProgress}%</span>
        </div>
        <div className="h-4 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${phaseProgress}%`,
              background: `linear-gradient(90deg, #D35400 0%, #1ABC9C 100%)`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/30">
          <span>{data.currentValues.total_echos || 0} {t("superadmin.roadmap.registeredEchos")}</span>
          <span>{t("superadmin.roadmap.goal", { target: String(phaseGoals.find((g) => g.metric_key === "total_echos")?.target_value || "—") })}</span>
        </div>
      </div>

      {/* ===== This Week's Focus ===== */}
      {(() => {
        const goalsWithProgress = phaseGoals.map((g) => ({
          ...g,
          progress: getGoalProgress(g.metric_key, data.currentValues[g.metric_key] || 0, g.target_value),
          status: getGoalStatus(g.metric_key, data.currentValues[g.metric_key] || 0, g.target_value),
        }));
        const worstGoals = goalsWithProgress
          .filter((g) => g.progress < 100)
          .sort((a, b) => a.progress - b.progress)
          .slice(0, 3);

        if (worstGoals.length === 0) return null;

        return (
          <div className="glass-card p-5 border border-yellow-500/20 bg-yellow-500/5">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3">
              {t("superadmin.roadmap.weeklyFocus")}
            </h3>
            <div className="space-y-2">
              {worstGoals.map((g) => {
                const s = statusConfig[g.status];
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="text-base">{g.icon}</span>
                    <span className="text-sm text-white/70 flex-1">{g.metric_label}</span>
                    <span className={`text-xs font-bold ${s.color}`}>{Math.round(g.progress)}%</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===== Section 2: Phase Goals Grid ===== */}
      <div>
        <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">{t("superadmin.roadmap.phaseGoals", { num: currentPhase.replace("phase_", "") })}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {phaseGoals.map((goal) => {
            const current = data.currentValues[goal.metric_key] || 0;
            const progress = getGoalProgress(goal.metric_key, current, goal.target_value);
            const status = getGoalStatus(goal.metric_key, current, goal.target_value);
            const s = statusConfig[status];

            const borderColor = status === "on_track" ? "border-emerald-500/30" : status === "attention" ? "border-yellow-500/30" : "border-red-500/30";
            // Pacing: estimate projected end based on current rate
            const needed = goal.target_value - current;
            const pacingText = needed > 0 && current > 0
              ? t("superadmin.roadmap.pacing", { needed: formatMetricValue(goal.metric_key, needed, t) })
              : needed <= 0
              ? t("superadmin.roadmap.goalReached")
              : "";

            return (
              <div key={goal.id} className={`glass-card p-5 hover:border-white/10 transition border-l-4 ${borderColor}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{goal.icon}</span>
                  <span className="text-xs text-white/40 font-semibold truncate">{goal.metric_label}</span>
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-black">{formatMetricValue(goal.metric_key, current, t)}</span>
                  <span className="text-sm text-white/30 ml-1">/ {formatTargetValue(goal.metric_key, goal.target_value, t)}</span>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      background: `linear-gradient(90deg, #D35400, #1ABC9C)`,
                    }}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                  <span className="text-xs text-white/20 ml-auto">{Math.round(progress)}%</span>
                </div>
                {pacingText && (
                  <p className="text-[10px] text-white/25 mt-1.5">{pacingText}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Section 3: Milestones Timeline ===== */}
      <div>
        <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">{t("superadmin.roadmap.milestones")}</h3>
        <div className="glass-card p-5">
          <div className="space-y-0">
            {phaseMilestones.map((m, i) => {
              const isOverdue = !m.achieved && m.target_date && new Date(m.target_date) < new Date();
              const icon = m.achieved ? "✅" : isOverdue ? "⚠️" : "⬜";
              const dateStr = m.achieved && m.achieved_at
                ? new Date(m.achieved_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : m.target_date
                ? t("superadmin.roadmap.targetDate", { date: new Date(m.target_date).toLocaleDateString("en-US", { day: "numeric", month: "short" }) })
                : "";

              return (
                <div key={m.id} className="flex items-start gap-4 group">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => toggleMilestone(m.id, !m.achieved)}
                      disabled={togglingMilestone === m.id}
                      className="text-lg shrink-0 hover:scale-110 transition cursor-pointer disabled:opacity-50"
                      title={m.achieved ? t("superadmin.leads.markUnreached") : t("superadmin.leads.markReached")}
                    >
                      {togglingMilestone === m.id ? "..." : icon}
                    </button>
                    {i < phaseMilestones.length - 1 && (
                      <div className={`w-px h-8 ${m.achieved ? "bg-teal-500/30" : "bg-white/10"}`} />
                    )}
                  </div>

                  <div className="pb-6 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-sm font-bold ${m.achieved ? "text-teal-400" : isOverdue ? "text-red-400" : "text-white/60"}`}>
                        {m.title}
                      </span>
                      <span className={`text-xs ${m.achieved ? "text-teal-400/60" : isOverdue ? "text-red-400/60" : "text-white/20"}`}>
                        {dateStr}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-xs text-white/30 mt-0.5">{m.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {phaseMilestones.length === 0 && (
              <p className="text-sm text-white/30">{t("superadmin.roadmap.noMilestones")}</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Section 4: All Phases Accordion ===== */}
      <div>
        <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">{t("superadmin.roadmap.allPhases")}</h3>
        <div className="space-y-2">
          {phases.map((phase) => {
            const meta = getPhaseMetaTranslated(phase);
            const progress = getPhaseProgress(phase);
            const isCurrent = phase === currentPhase;
            const isExpanded = expandedPhases.has(phase);
            const phGoals = data.goals.filter((g) => g.phase === phase);

            return (
              <div key={phase} className={`glass-card overflow-hidden ${isCurrent ? "border-primary/20" : "opacity-60"}`}>
                <button
                  onClick={() => {
                    const next = new Set(expandedPhases);
                    if (next.has(phase)) next.delete(phase);
                    else next.add(phase);
                    setExpandedPhases(next);
                  }}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{isExpanded ? "▼" : "►"}</span>
                    <span className="text-sm font-bold">
                      {t("superadmin.roadmap.phase", { num: phase.replace("phase_", ""), label: meta.label })}
                    </span>
                    <span className="text-xs text-white/30">({meta.weeks})</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {t("superadmin.roadmap.inProgress")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, #D35400, #1ABC9C)`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white/40 w-8 text-right">{progress}%</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {phGoals.map((goal) => {
                        const current = data.currentValues[goal.metric_key] || 0;
                        const prog = getGoalProgress(goal.metric_key, current, goal.target_value);
                        return (
                          <div key={goal.id} className="bg-white/[0.03] rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-sm">{goal.icon}</span>
                              <span className="text-xs text-white/40 truncate">{goal.metric_label}</span>
                            </div>
                            <div className="text-lg font-bold">{formatMetricValue(goal.metric_key, current, t)}</div>
                            <div className="text-xs text-white/20 mb-2">/ {formatTargetValue(goal.metric_key, goal.target_value, t)}</div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(prog, 100)}%`,
                                  background: `linear-gradient(90deg, #D35400, #1ABC9C)`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Section 5: Weekly Snapshot ===== */}
      <div>
        <h3 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-wider">{t("superadmin.roadmap.weekComparison")}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t("superadmin.roadmap.newEchos"), key: "echos" as const, format: (v: number) => `+${v}` },
            { label: t("common.clicks"), key: "clicks" as const, format: (v: number) => `+${formatNumber(v)}` },
            { label: t("superadmin.roadmap.revenue"), key: "revenue" as const, format: (v: number) => `+${formatFCFA(v)}` },
            { label: t("superadmin.roadmap.brandLeads"), key: "leads" as const, format: (v: number) => `+${v}` },
          ].map((item) => {
            const metric = data.weeklyComparison[item.key];
            const change = metric.previous > 0
              ? Math.round(((metric.current - metric.previous) / metric.previous) * 100)
              : metric.current > 0 ? 100 : 0;
            const isUp = change > 0;
            const isDown = change < 0;

            return (
              <div key={item.key} className="glass-card p-4">
                <p className="text-xs text-white/40 font-semibold mb-2">{item.label}</p>
                <p className="text-xl font-bold">{item.format(metric.current)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/30">vs {item.format(metric.previous)}</span>
                  {(isUp || isDown) && (
                    <span className={`text-xs font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? "▲" : "▼"} {Math.abs(change)}%
                    </span>
                  )}
                  {!isUp && !isDown && <span className="text-xs text-white/20">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
