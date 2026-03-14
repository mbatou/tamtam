"use client";

import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";

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
}

interface Achievement {
  milestone_id: string;
  achieved_at: string;
  reward_fcfa: number;
}

interface UserStats {
  total_valid_clicks: number;
  total_campaigns_joined: number;
  referral_count: number;
  current_streak: number;
}

interface AchievementsGridProps {
  milestones: Milestone[];
  achievements: Achievement[];
  userStats: UserStats;
}

function getProgress(milestone: Milestone, userStats: UserStats): number {
  const statMap: Record<string, number> = {
    valid_clicks: userStats.total_valid_clicks,
    campaigns_joined: userStats.total_campaigns_joined,
    referrals: userStats.referral_count,
    streak: userStats.current_streak,
  };
  const current = statMap[milestone.condition_type] ?? 0;
  return Math.min(current, milestone.condition_value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AchievementsGrid({
  milestones,
  achievements,
  userStats,
}: AchievementsGridProps) {
  const { t } = useTranslation();

  const achievementMap = new Map(
    achievements.map((a) => [a.milestone_id, a])
  );

  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="grid grid-cols-2 gap-3">
      {sorted.map((milestone) => {
        const achievement = achievementMap.get(milestone.id);
        const isAchieved = !!achievement;
        const progress = getProgress(milestone, userStats);
        const target = milestone.condition_value;
        const percentage = Math.round((progress / target) * 100);
        const nearlyAchieved = !isAchieved && percentage >= 80;

        return (
          <div
            key={milestone.id}
            className={`glass-card p-4 rounded-2xl flex flex-col items-center text-center transition-all ${
              isAchieved
                ? ""
                : "opacity-50"
            } ${nearlyAchieved ? "border border-primary/50" : ""}`}
          >
            {/* Icon */}
            <div className="text-3xl mb-2 relative">
              {milestone.icon}
              {isAchieved && (
                <span className="absolute -top-1 -right-3 text-sm">✅</span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-sm font-semibold text-white mb-1">
              {milestone.title}
            </h4>

            {/* Description */}
            <p className="text-[11px] text-gray-400 mb-2 line-clamp-2">
              {milestone.description}
            </p>

            {/* Nearly achieved label */}
            {nearlyAchieved && (
              <span className="text-[10px] font-bold text-[#D35400] mb-1">
                {t("gamification.almost")}
              </span>
            )}

            {isAchieved ? (
              <>
                <p className="text-xs text-gray-400 mb-1">
                  {formatDate(achievement.achieved_at)}
                </p>
                <p className="text-sm font-bold text-[#1ABC9C]">
                  +{formatFCFA(achievement.reward_fcfa)}
                </p>
              </>
            ) : (
              <>
                {/* Progress bar */}
                <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                  <div
                    className="bg-gradient-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  {progress} / {target} ({percentage}%)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  +{formatFCFA(milestone.reward_fcfa)}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
