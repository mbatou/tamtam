"use client";

import { useState, useEffect, useCallback } from "react";
import { generateEggShareCard, TIER_COLORS, TIER_EMOJIS } from "@/lib/share-card";
import { trackEvent } from "@/lib/analytics";

interface ChallengeReward {
  id: string;
  tier: string;
  amount: number;
  emoji: string;
  color: string;
  total_quantity: number;
  remaining_quantity: number;
}

interface ChallengeData {
  challenge: {
    id: string;
    name: string;
    description: string;
    theme: string;
    challenge_rewards: ChallengeReward[];
  } | null;
  participation: {
    valid_clicks: number;
    eggs_earned: number;
    total_won: number;
  };
  eggsRemaining: number;
  recentCracks: {
    id: string;
    tier: string;
    amount: number;
    users?: { name: string } | null;
  }[];
  clicksNeeded: number;
  echoName: string;
}

export default function ChallengeBanner() {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [cracking, setCracking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reward, setReward] = useState<{
    tier: string;
    amount: number;
    emoji: string;
    color: string;
  } | null>(null);

  const loadChallenge = useCallback(() => {
    fetch("/api/echo/challenge")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadChallenge();
    const interval = setInterval(loadChallenge, 30000);
    return () => clearInterval(interval);
  }, [loadChallenge]);

  if (!data?.challenge) return null;

  const { challenge, participation, eggsRemaining, clicksNeeded, recentCracks, echoName } = data;
  const clicksInProgress = participation.valid_clicks % clicksNeeded;
  const clicksToNext = clicksNeeded - clicksInProgress;
  const canCrackEgg = participation.valid_clicks >= (participation.eggs_earned + 1) * clicksNeeded && eggsRemaining > 0;

  async function handleCrackEgg() {
    if (!challenge) return;
    setCracking(true);

    try {
      const res = await fetch("/api/echo/challenge/crack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      const result = await res.json();

      // Delay to show animation
      await new Promise((r) => setTimeout(r, 2000));

      if (result.success) {
        trackEvent.echoCrackEgg(result.reward.tier, result.reward.amount);
        setReward(result.reward);
      }
    } catch {
      // ignore
    }
    setCracking(false);
  }

  function closeReward() {
    setReward(null);
    loadChallenge();
  }

  async function handleShareVictory() {
    if (!reward || !data) return;
    setSharing(true);
    try {
      const file = await generateEggShareCard({
        echoName: echoName || "Echo",
        tier: reward.tier,
        amount: reward.amount,
        eggsRemaining: data.eggsRemaining,
        tierColor: reward.color || TIER_COLORS[reward.tier] || "#FFD700",
        tierEmoji: reward.emoji || TIER_EMOJIS[reward.tier] || "🥚",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `J'ai gagné ${reward.amount} FCFA en craquant un œuf ${reward.tier} sur Tamtam! 🥚 Toi aussi gagne avec ton WhatsApp → tamma.me/echos`,
        });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tamtam-oeuf.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
    setSharing(false);
  }

  return (
    <>
      {/* Challenge banner */}
      <div className="bg-gradient-to-r from-green-900/50 via-yellow-900/30 to-red-900/50 border border-yellow-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2 text-sm">
              🥚🇸🇳 {challenge.name}
            </h3>
            <p className="text-gray-300 text-xs mt-1">{challenge.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-yellow-400 font-bold text-lg">
              {eggsRemaining} oeufs
            </div>
            <div className="text-gray-500 text-xs">restants</div>
          </div>
        </div>

        {/* Progress to next egg */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400 text-xs">
              {clicksInProgress} / {clicksNeeded} clics
            </span>
            <span className="text-yellow-400 text-xs">
              Prochain oeuf dans {clicksToNext} clics
            </span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all"
              style={{ width: `${(clicksInProgress / clicksNeeded) * 100}%` }}
            />
          </div>
        </div>

        {/* Egg to crack (if available) */}
        {canCrackEgg && (
          <button
            onClick={handleCrackEgg}
            disabled={cracking}
            className="mt-4 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-lg animate-bounce disabled:opacity-50 disabled:animate-none"
          >
            🥚 Craque ton oeuf!
          </button>
        )}

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-green-400">🥚 {participation.eggs_earned} oeufs craques</span>
          <span className="text-yellow-400">💰 {participation.total_won} FCFA gagnes</span>
        </div>
      </div>

      {/* Live feed */}
      {recentCracks.length > 0 && (
        <div className="glass-card rounded-xl p-4 mb-4">
          <h4 className="text-white text-sm font-bold mb-2">🎉 En direct</h4>
          <div className="space-y-1">
            {recentCracks.slice(0, 5).map((crack) => (
              <div key={crack.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 text-xs">
                  {crack.users?.name || "Echo"} a craque un oeuf {crack.tier}!
                </span>
                <span className="text-green-400 font-bold text-xs">+{crack.amount} F</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen crack modal */}
      {(cracking || reward) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          {cracking && !reward && (
            <div className="text-center">
              <div className="text-8xl animate-bounce">🥚</div>
              <p className="text-white text-xl mt-4 animate-pulse">Ca craque...</p>
            </div>
          )}
          {reward && (
            <div className="text-center animate-scale-in">
              <div className="text-8xl mb-4">
                {reward.tier === "Diamant" ? "💎" : reward.tier === "Patriote" ? "🇸🇳" : "🥚"}
              </div>
              <div className="text-yellow-400 text-4xl font-black mb-2">
                +{reward.amount} FCFA!
              </div>
              <div className="text-white text-xl">
                Oeuf {reward.tier}!
              </div>
              <button
                onClick={handleShareVictory}
                disabled={sharing}
                className="mt-6 px-8 py-3 rounded-xl font-bold text-white border-none cursor-pointer flex items-center gap-2 mx-auto"
                style={{ background: "#00853F" }}
              >
                {sharing ? "Préparation..." : "📸 Partager ta victoire!"}
              </button>
              <button
                onClick={closeReward}
                className="mt-3 bg-white text-black px-8 py-3 rounded-xl font-bold"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
