"use client";

import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";

interface StreakProps {
  streak: {
    current_streak: number;
    longest_streak: number;
    last_campaign_date: string | null;
    frozen?: boolean;
  };
  hasActiveCampaigns?: boolean;
}

const STREAK_MILESTONES = [
  { days: 7,  reward: 100,  label: "Semaine",   emoji: "🔥" },
  { days: 30, reward: 500,  label: "Mois",      emoji: "💪" },
  { days: 90, reward: 2000, label: "Trimestre",  emoji: "👑" },
] as const;

export default function StreakDisplay({ streak, hasActiveCampaigns = true }: StreakProps) {
  const { t } = useTranslation();
  const current = streak.current_streak;

  const nextMilestone = STREAK_MILESTONES.find((m) => m.days > current);
  const isFrozen = !hasActiveCampaigns && current > 0;

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-white mb-3">
        {current > 0
          ? `🔥 ${t("gamification.streakTitle", { count: current })}`
          : t("gamification.startStreak")}
      </h3>

      {current > 0 && (
        <>
          {/* Milestone progress bar */}
          <div className="space-y-2 mb-4">
            {STREAK_MILESTONES.map((milestone) => {
              const progress = Math.min(current / milestone.days, 1);
              const completed = current >= milestone.days;

              return (
                <div key={milestone.days} className="flex items-center gap-3">
                  <span className="text-sm w-5 text-center">{milestone.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-semibold ${completed ? "text-[#1ABC9C]" : "text-white/50"}`}>
                        {milestone.label} ({milestone.days}j)
                      </span>
                      <span className={`text-[10px] font-bold ${completed ? "text-[#1ABC9C]" : "text-white/30"}`}>
                        {completed ? `✓ ${formatFCFA(milestone.reward)}` : formatFCFA(milestone.reward)}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${completed ? "bg-[#1ABC9C]" : "bg-[#D35400]"}`}
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Frozen state */}
          {isFrozen ? (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                {t("gamification.streakFrozen")}
              </p>
              <p className="text-xs text-blue-400/60 mt-1">
                {t("gamification.streakFrozenHint")}
              </p>
            </div>
          ) : nextMilestone ? (
            <div>
              <p className="text-sm text-gray-300">
                {nextMilestone.emoji} Encore {nextMilestone.days - current} jour{nextMilestone.days - current > 1 ? "s" : ""} pour {formatFCFA(nextMilestone.reward)}
              </p>
              <p className="text-xs text-white/30 mt-1">
                {t("gamification.streakKeepGoing")}
              </p>
            </div>
          ) : current >= 90 ? (
            <div>
              <p className="text-sm text-[#1ABC9C] font-medium">
                👑 Cycle complété ! Les récompenses se renouvellent.
              </p>
              <p className="text-xs text-white/30 mt-1">
                Tu gagnes {formatFCFA(2000)} tous les 90 jours de série.
              </p>
            </div>
          ) : null}
        </>
      )}

      {current === 0 && (
        <p className="text-sm text-gray-400">
          {t("gamification.startStreakHint")}
        </p>
      )}
    </div>
  );
}
