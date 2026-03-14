"use client";

import { useTranslation } from "@/lib/i18n";

interface TierProgressProps {
  tier: string;
  tierBonusPercent: number;
  totalClicks: number;
}

const TIERS = [
  { key: "echo", threshold: 0, icon: "🔵", bonus: 0 },
  { key: "argent", threshold: 100, icon: "🥈", bonus: 5 },
  { key: "or", threshold: 500, icon: "🥇", bonus: 10 },
  { key: "diamant", threshold: 1000, icon: "💎", bonus: 20 },
] as const;

export default function TierProgress({
  tier,
  tierBonusPercent,
  totalClicks,
}: TierProgressProps) {
  const { t } = useTranslation();

  const currentIndex = TIERS.findIndex((ti) => ti.key === tier);
  const currentTier = TIERS[currentIndex] ?? TIERS[0];
  const nextTier = currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1] : null;
  const isMax = !nextTier;

  const progressCurrent = totalClicks - currentTier.threshold;
  const progressTarget = nextTier
    ? nextTier.threshold - currentTier.threshold
    : 1;
  const percentage = isMax
    ? 100
    : Math.min(Math.round((progressCurrent / progressTarget) * 100), 100);

  return (
    <div className="glass-card rounded-2xl p-4">
      {/* Current tier */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{currentTier.icon}</span>
        <div>
          <h3 className="text-lg font-bold text-white">
            {t(`gamification.tierName_${currentTier.key}`)}
          </h3>
          <p className="text-sm text-gray-400">
            {t("gamification.tierBonus", { percent: tierBonusPercent })}
          </p>
        </div>
      </div>

      {isMax ? (
        <div className="text-center py-2">
          <p className="text-[#1ABC9C] font-bold text-sm">
            {t("gamification.maxTier")}
          </p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="w-full bg-white/10 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-primary h-3 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Progress text */}
          <p className="text-sm text-gray-300 mb-1">
            {t("gamification.tierProgress", {
              current: totalClicks,
              target: nextTier.threshold,
              nextTier: t(`gamification.tierName_${nextTier.key}`),
            })}
          </p>

          {/* Next tier bonus */}
          <p className="text-xs text-gray-400">
            {t("gamification.nextTierBonus", { percent: nextTier.bonus })}
          </p>
        </>
      )}
    </div>
  );
}
