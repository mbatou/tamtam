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

const THRESHOLDS = [1, 2, 3, 5, 7, 10];

const REWARDS: Record<number, number> = {
  3: 100,
  5: 250,
  7: 500,
  10: 1000,
};

export default function StreakDisplay({ streak, hasActiveCampaigns = true }: StreakProps) {
  const { t } = useTranslation();
  const current = streak.current_streak;

  const nextRewardThreshold = THRESHOLDS.find(
    (th) => th > current && REWARDS[th] !== undefined
  );

  // Streak is frozen when there are no active campaigns
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
          {/* Streak dots */}
          <div className="flex items-center gap-2 mb-4">
            {THRESHOLDS.map((th) => {
              const completed = current >= th;
              const isCurrent = current === th;

              return (
                <div key={th} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      completed
                        ? "bg-[#D35400] border-[#D35400]"
                        : "border-gray-500 bg-transparent"
                    } ${isCurrent ? "animate-pulse ring-2 ring-[#D35400]/50" : ""}`}
                  />
                  <span className="text-[10px] text-gray-400">{th}</span>
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
          ) : nextRewardThreshold && REWARDS[nextRewardThreshold] !== undefined ? (
            <div>
              <p className="text-sm text-gray-300">
                {t("gamification.nextBonus", {
                  count: nextRewardThreshold,
                  amount: formatFCFA(REWARDS[nextRewardThreshold]),
                })}
              </p>
              <p className="text-xs text-white/30 mt-1">
                {t("gamification.streakKeepGoing")}
              </p>
            </div>
          ) : current >= 10 ? (
            <p className="text-sm text-[#1ABC9C] font-medium">
              {t("gamification.maxStreak")}
            </p>
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
