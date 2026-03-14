"use client";

import { useEffect, useState, useCallback } from "react";
import TabBar from "@/components/ui/TabBar";
import { useTranslation } from "@/lib/i18n";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  tier: string;
  rythmes_joined: number;
  resonances: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    setLoading(true);

    const [leaderboardRes, userRes] = await Promise.all([
      fetch(`/api/leaderboard?period=${period}`),
      fetch("/api/echo/user"),
    ]);

    if (leaderboardRes.ok) {
      const data = await leaderboardRes.json();
      setEntries(Array.isArray(data) ? data : []);
    }

    if (userRes.ok) {
      const userData = await userRes.json();
      setCurrentUserId(userData?.id || null);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentUserRank =
    currentUserId
      ? entries.findIndex((e) => e.user_id === currentUserId) + 1
      : 0;

  const tierBadge = (tier: string) => {
    switch (tier) {
      case "or":
        return "\uD83E\uDD47";
      case "argent":
        return "\uD83E\uDD48";
      case "diamant":
        return "\uD83D\uDC8E";
      default:
        return "\uD83D\uDD35";
    }
  };

  const medalBg = (rank: number) => {
    if (rank === 1) return "bg-[#FFD700]/10";
    if (rank === 2) return "bg-[#C0C0C0]/10";
    if (rank === 3) return "bg-[#CD7F32]/10";
    return "";
  };

  const formatName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  };

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-48 rounded-xl" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-10 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {/* Page title */}
      <h1 className="text-xl font-bold mb-4">{t("gamification.leaderboard")}</h1>

      {/* Rank banner */}
      {currentUserRank > 0 && (
        <div className="glass-card p-4 mb-4 border border-primary/20 text-center">
          <p className="text-sm font-bold">
            {t("gamification.yourRank", { rank: currentUserRank })}
          </p>
        </div>
      )}

      {/* Period tabs */}
      <TabBar
        tabs={[
          { key: "week", label: t("gamification.thisWeek") },
          { key: "month", label: t("gamification.thisMonth") },
          { key: "all", label: t("gamification.allTime") },
        ]}
        active={period}
        onChange={(key) => setPeriod(key as "week" | "month" | "all")}
        className="mb-4"
      />

      {/* Leaderboard table */}
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_60px_70px] gap-2 px-4 py-3 border-b border-white/5">
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
            {t("gamification.rank")}
          </span>
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
            {t("gamification.name")}
          </span>
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider text-center">
            {t("gamification.rythmes")}
          </span>
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider text-right">
            {t("gamification.resonances")}
          </span>
        </div>

        {/* Rows */}
        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-white/30">{t("gamification.leaderboard")}</p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const rank = idx + 1;
            const isCurrentUser = entry.user_id === currentUserId;

            return (
              <div
                key={entry.user_id}
                className={`grid grid-cols-[40px_1fr_60px_70px] gap-2 px-4 py-3 items-center transition-colors ${
                  medalBg(rank)
                } ${isCurrentUser ? "border border-primary rounded-lg" : "border-b border-white/5"}`}
              >
                {/* Rank */}
                <span className={`text-sm font-black ${rank === 1 ? "text-[#FFD700]" : rank === 2 ? "text-[#C0C0C0]" : rank === 3 ? "text-[#CD7F32]" : "text-white/60"}`}>
                  #{rank}
                </span>

                {/* Name + tier badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">{tierBadge(entry.tier)}</span>
                  <span className={`text-sm font-semibold truncate ${isCurrentUser ? "text-primary" : ""}`}>
                    {formatName(entry.name)}
                  </span>
                </div>

                {/* Rythmes joined */}
                <span className="text-xs font-semibold text-center text-white/60">
                  {entry.rythmes_joined}
                </span>

                {/* Resonances (clicks) */}
                <span className="text-xs font-bold text-right text-accent">
                  {entry.resonances.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
