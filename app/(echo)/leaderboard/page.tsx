"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const [error, setError] = useState(false);
  const [ranks, setRanks] = useState<{ week: number; month: number; all: number } | null>(null);
  const currentUserRef = useRef<HTMLDivElement>(null);
  const [myRowVisible, setMyRowVisible] = useState(true);
  const { t } = useTranslation();

  // Load ranks once on mount
  useEffect(() => {
    fetch("/api/echo/rank")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setRanks(data));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [leaderboardRes, userRes] = await Promise.all([
        fetch(`/api/leaderboard?period=${period}`),
        fetch("/api/echo/user"),
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        const raw = data.leaderboard || data;
        const mapped: LeaderboardEntry[] = (Array.isArray(raw) ? raw : []).map((e: Record<string, unknown>) => ({
          user_id: String(e.echo_id || e.user_id || ""),
          name: String(e.name || ""),
          tier: String(e.tier || "echo"),
          rythmes_joined: Number(e.campaigns_joined ?? e.rythmes_joined ?? 0),
          resonances: Number(e.total_clicks ?? e.resonances ?? 0),
        }));
        setEntries(mapped);
      } else {
        setError(true);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUserId(userData?.id || null);
      }
    } catch {
      setError(true);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-scroll to the current user's row after data loads
  useEffect(() => {
    if (!loading && currentUserRef.current) {
      setTimeout(() => {
        currentUserRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [loading, entries, currentUserId]);

  // Track if user's row is visible for sticky bar
  useEffect(() => {
    if (!currentUserRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMyRowVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(currentUserRef.current);
    return () => observer.disconnect();
  }, [loading, entries, currentUserId]);

  const currentRank = ranks ? ranks[period] : 0;

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

  // Find user above current user for proximity display
  const currentUserIndex = entries.findIndex((e) => e.user_id === currentUserId);
  const userAbove = currentUserIndex > 0 ? entries[currentUserIndex - 1] : null;
  const clicksToNextRank = userAbove && currentUserIndex >= 0
    ? userAbove.resonances - entries[currentUserIndex].resonances
    : 0;
  const currentUserEntry = currentUserIndex >= 0 ? entries[currentUserIndex] : null;
  const isInVisibleList = currentUserIndex >= 0 && currentUserIndex < entries.length;

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

  if (error && entries.length === 0) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-center">
        <p className="text-white/60">{t("common.loadError") || "Impossible de charger le classement. Réessaie plus tard."}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto pb-24">
      {/* Page title */}
      <h1 className="text-xl font-bold mb-4">{t("gamification.leaderboard")}</h1>

      {/* Rank banner */}
      {currentRank > 0 && (
        <div className="glass-card p-4 mb-4 border border-primary/20">
          <p className="text-center text-lg font-black mb-1">
            #{currentRank}
          </p>
          {/* Proximity to next rank */}
          {clicksToNextRank > 0 && userAbove && (
            <p className="text-center text-xs text-orange-400 font-medium mt-1">
              ↑ {clicksToNextRank} clic{clicksToNextRank > 1 ? "s" : ""} de plus pour passer #{currentRank - 1}
              <span className="text-gray-500"> ({formatName(userAbove.name)})</span>
            </p>
          )}
          {currentRank === 1 && (
            <p className="text-center text-xs text-green-400 font-medium mt-1">
              🏆 Tu es en tête !
            </p>
          )}
          {/* All period ranks */}
          {ranks && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {(["week", "month", "all"] as const).map((p) => (
                <div
                  key={p}
                  className={`text-center rounded-lg py-1.5 ${p === period ? "bg-primary/10" : "bg-white/5"}`}
                >
                  <p className={`text-xs font-bold ${p === period ? "text-primary" : "text-white/60"}`}>
                    {ranks[p] > 0 ? `#${ranks[p]}` : "—"}
                  </p>
                  <p className="text-[9px] text-white/40">
                    {t(`gamification.${p === "week" ? "thisWeek" : p === "month" ? "thisMonth" : "allTime"}`)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly prizes — coming soon */}
      <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-bold text-sm">🏆 Prix de la semaine</h4>
            <p className="text-gray-400 text-xs mt-0.5">Bientôt disponible !</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="text-center">
              <div className="text-yellow-400 font-bold">🥇</div>
              <div className="text-gray-500">1,000 F</div>
            </div>
            <div className="text-center">
              <div className="text-gray-300 font-bold">🥈</div>
              <div className="text-gray-500">500 F</div>
            </div>
            <div className="text-center">
              <div className="text-orange-700 font-bold">🥉</div>
              <div className="text-gray-500">250 F</div>
            </div>
          </div>
        </div>
      </div>

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
            <p className="text-sm text-white/30">{t("gamification.noRanking")}</p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const rank = idx + 1;
            const isCurrentUser = entry.user_id === currentUserId;

            return (
              <div
                key={entry.user_id}
                ref={isCurrentUser ? currentUserRef : undefined}
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

      {/* Sticky own position — shown when user is in list but scrolled out of view */}
      {isInVisibleList && currentUserEntry && !myRowVisible && (
        <div className="fixed bottom-16 left-0 right-0 px-4 z-30 pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <div className="glass-card p-3 border border-primary/30 flex items-center justify-between rounded-xl shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-primary">#{currentUserIndex + 1}</span>
                <span className="text-xs font-semibold">{formatName(currentUserEntry.name)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">{currentUserEntry.rythmes_joined} {t("gamification.rythmes").toLowerCase()}</span>
                <span className="text-xs font-bold text-accent">{currentUserEntry.resonances}</span>
              </div>
              {clicksToNextRank > 0 && (
                <span className="text-[10px] text-white/30 ml-2">
                  ↑{clicksToNextRank}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
