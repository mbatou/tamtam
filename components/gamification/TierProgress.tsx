"use client";

import { useTranslation } from "@/lib/i18n";

interface TierProgressProps {
  tier: string;
  tierBonusPercent: number;
  totalClicks: number;
}

const TIERS = [
  { key: "echo", threshold: 0, icon: "🔵", bonus: 0 },
  { key: "argent", threshold: 100, icon: "🥈", bonus: 1 },
  { key: "or", threshold: 500, icon: "🥇", bonus: 3 },
  { key: "diamant", threshold: 1000, icon: "💎", bonus: 5 },
] as const;

const TIER_PERKS: Record<string, { label: string; unlocked: string[] }> = {
  echo: { label: "Écho", unlocked: [] },
  argent: { label: "Argent", unlocked: ["🥈 Badge Argent", "1% bonus par clic"] },
  or: { label: "Or", unlocked: ["🥇 Badge Or", "3% bonus par clic", "Priorité distribution", "Accès anticipé 24h"] },
  diamant: { label: "Diamant", unlocked: ["💎 Badge Diamant", "5% bonus par clic", "Priorité distribution", "Accès anticipé 24h", "Profil en avant", "Support direct WhatsApp"] },
};

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

  const remaining = nextTier ? nextTier.threshold - totalClicks : 0;

  const currentPerks = TIER_PERKS[currentTier.key] || TIER_PERKS.echo;
  const nextPerks = nextTier ? TIER_PERKS[nextTier.key] : null;

  return (
    <div className="glass-card rounded-2xl p-4">
      {/* Current tier */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{currentTier.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">
            {t(`gamification.tierName_${currentTier.key}`)}
          </h3>
          <p className="text-sm text-gray-400">
            {t("gamification.tierBonus", { percent: tierBonusPercent })}
          </p>
        </div>
        {!isMax && (
          <span className="text-xs font-bold text-white/40">{percentage}%</span>
        )}
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

          {/* Remaining + next tier bonus */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {t("gamification.tierRemaining", { count: remaining })}
            </p>
            <p className="text-xs text-gray-400">
              {nextTier.icon} +{nextTier.bonus}%
            </p>
          </div>

          <p className="text-[10px] text-white/20 mt-2">
            {t("gamification.tierHint")}
          </p>
        </>
      )}

      {/* Current tier perks */}
      {currentPerks.unlocked.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-2">Tes avantages</p>
          <div className="space-y-1.5">
            {currentPerks.unlocked.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1ABC9C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="text-xs text-white/60">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next tier perks (locked) */}
      {nextPerks && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] text-white/20 font-semibold uppercase tracking-wider mb-2">
            Débloque avec {remaining} clics de plus
          </p>
          <div className="space-y-1.5">
            {nextPerks.unlocked
              .filter((perk) => !currentPerks.unlocked.includes(perk))
              .map((perk) => (
                <div key={perk} className="flex items-center gap-2 opacity-40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span className="text-xs text-white/40">{perk}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
