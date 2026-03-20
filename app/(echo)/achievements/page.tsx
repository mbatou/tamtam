"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";
import StreakDisplay from "@/components/gamification/StreakDisplay";
import AchievementsGrid from "@/components/gamification/AchievementsGrid";
import TierProgress from "@/components/gamification/TierProgress";

interface GamificationData {
  user: {
    tier: string;
    tier_bonus_percent: number;
    total_valid_clicks: number;
    total_campaigns_joined: number;
    referral_count: number;
  } | null;
  streak: {
    current_streak: number;
    longest_streak: number;
    last_campaign_date: string | null;
  };
  achievements: Array<{
    milestone_id: string;
    reward_fcfa: number;
    achieved_at: string;
  }>;
  milestones: Array<{
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    reward_fcfa: number;
    condition_type: string;
    condition_value: number;
    sort_order: number;
  }>;
  streakRewards: Array<{
    streak_count: number;
    reward_fcfa: number;
    credited_at: string;
  }>;
}

export default function AchievementsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/echo/gamification")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-32 rounded-xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-center">
        <p className="text-white/60">{t("common.loadError") || "Impossible de charger les données. Réessaie plus tard."}</p>
      </div>
    );
  }

  const totalRewards =
    data.achievements.reduce((s, a) => s + a.reward_fcfa, 0) +
    data.streakRewards.reduce((s, r) => s + r.reward_fcfa, 0);

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t("gamification.achievements")}</h1>
        <p className="text-xs text-white/40 mt-0.5">
          {t("gamification.bonusEarned")}: {formatFCFA(totalRewards)}
        </p>
      </div>

      <TierProgress
        tier={data.user?.tier || "echo"}
        tierBonusPercent={data.user?.tier_bonus_percent || 0}
        totalClicks={data.user?.total_valid_clicks || 0}
      />

      <StreakDisplay streak={data.streak} />

      <div>
        <h2 className="text-sm font-bold mb-3">{t("gamification.achievements")}</h2>
        <AchievementsGrid
          milestones={data.milestones}
          achievements={data.achievements}
          userStats={{
            total_valid_clicks: data.user?.total_valid_clicks || 0,
            total_campaigns_joined: data.user?.total_campaigns_joined || 0,
            referral_count: data.user?.referral_count || 0,
            current_streak: data.streak.current_streak,
          }}
        />
      </div>
    </div>
  );
}
