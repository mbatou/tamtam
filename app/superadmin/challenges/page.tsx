"use client";

import { useEffect, useState } from "react";


interface RewardTier {
  id?: string;
  tier: string;
  amount: number;
  quantity: number;
  emoji: string;
  color: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  campaign_id: string | null;
  theme: string;
  status: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  budget_spent: number;
  clicks_per_reward: number;
  created_at: string;
  challenge_rewards: {
    id: string;
    tier: string;
    amount: number;
    total_quantity: number;
    remaining_quantity: number;
    emoji: string;
    color: string;
  }[];
  participantCount: number;
  eggsRemaining: number;
  totalEggs: number;
}

interface ChallengeDetail extends Challenge {
  participants: {
    id: string;
    echo_id: string;
    valid_clicks: number;
    eggs_earned: number;
    total_won: number;
    users?: { name: string } | null;
  }[];
  activityFeed: {
    id: string;
    echo_id: string;
    tier: string;
    amount: number;
    emoji: string;
    cracked_at: string;
    users?: { name: string } | null;
  }[];
}

interface Campaign {
  id: string;
  title: string;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    active: "bg-green-500/20 text-green-400",
    completed: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("easter_egg");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState(20000);
  const [clicksPerReward, setClicksPerReward] = useState(10);
  const [campaignId, setCampaignId] = useState("");
  const [rewards, setRewards] = useState<RewardTier[]>([
    { tier: "Bronze", amount: 100, quantity: 60, emoji: "🥚", color: "#CD7F32" },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadChallenges();
    fetch("/api/superadmin/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCampaigns(data.filter((c: Campaign) => c.status === "active"));
        }
      })
      .catch(() => {});
  }, []);

  async function loadChallenges() {
    const res = await fetch("/api/superadmin/challenges");
    if (res.ok) {
      const data = await res.json();
      setChallenges(data);
    }
    setLoading(false);
  }

  async function openDetail(c: Challenge) {
    setLoadingDetail(true);
    const res = await fetch(`/api/superadmin/challenges/${c.id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
    }
    setLoadingDetail(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/superadmin/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        theme,
        start_date: startDate,
        end_date: endDate,
        total_budget: budget,
        clicks_per_reward: clicksPerReward,
        campaign_id: campaignId || null,
        rewards: rewards.map((r) => ({
          tier: r.tier,
          amount: r.amount,
          total_quantity: r.quantity,
          remaining_quantity: r.quantity,
          emoji: r.emoji,
          color: r.color,
        })),
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      resetForm();
      await loadChallenges();
    }
    setCreating(false);
  }

  function resetForm() {
    setName("");
    setDescription("");
    setTheme("easter_egg");
    setStartDate("");
    setEndDate("");
    setBudget(20000);
    setClicksPerReward(10);
    setCampaignId("");
    setRewards([{ tier: "Bronze", amount: 100, quantity: 60, emoji: "🥚", color: "#CD7F32" }]);
  }

  function prefillEasterEgg() {
    setName("La Chasse aux Oeufs de Tamtam 🥚🇸🇳");
    setDescription("Partage, gagne 10 clics, et craque ton oeuf de Paques! Fete de l'Independance du Senegal.");
    setTheme("easter_egg");
    setStartDate("2026-04-01T00:00");
    setEndDate("2026-04-04T23:59");
    setBudget(20000);
    setClicksPerReward(10);
    setRewards([
      { tier: "Bronze", amount: 100, quantity: 60, emoji: "🥚", color: "#CD7F32" },
      { tier: "Argent", amount: 250, quantity: 24, emoji: "🥚", color: "#C0C0C0" },
      { tier: "Or", amount: 500, quantity: 8, emoji: "🥚", color: "#FFD700" },
      { tier: "Patriote", amount: 1000, quantity: 3, emoji: "🇸🇳", color: "#00853F" },
      { tier: "Diamant", amount: 1000, quantity: 1, emoji: "💎", color: "#B9F2FF" },
    ]);
  }

  function addReward() {
    setRewards([...rewards, { tier: "", amount: 100, quantity: 10, emoji: "🥚", color: "#CD7F32" }]);
  }

  function removeReward(i: number) {
    setRewards(rewards.filter((_, idx) => idx !== i));
  }

  function updateReward(i: number, field: keyof RewardTier, value: string | number) {
    const updated = [...rewards];
    updated[i] = { ...updated[i], [field]: value };
    setRewards(updated);
  }

  async function activate() {
    if (!detail) return;
    await fetch(`/api/superadmin/challenges/${detail.id}/activate`, { method: "POST" });
    await loadChallenges();
    openDetail(detail);
  }

  async function deactivate() {
    if (!detail) return;
    await fetch(`/api/superadmin/challenges/${detail.id}/deactivate`, { method: "POST" });
    await loadChallenges();
    openDetail(detail);
  }

  // Stats
  const activeChallenges = challenges.filter((c) => c.status === "active").length;
  const totalEggsRemaining = challenges.reduce((s, c) => s + c.eggsRemaining, 0);
  const budgetSpent = challenges.reduce((s, c) => s + c.budget_spent, 0);
  const totalParticipants = challenges.reduce((s, c) => s + c.participantCount, 0);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  // Detail view
  if (detail) {
    const totalEggs = detail.challenge_rewards.reduce((s, r) => s + r.total_quantity, 0);
    const eggsRemaining = detail.challenge_rewards.reduce((s, r) => s + r.remaining_quantity, 0);
    const totalCracked = totalEggs - eggsRemaining;

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <button onClick={() => setDetail(null)} className="text-white/40 text-sm mb-4 hover:text-white/60">
          &larr; Retour aux challenges
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
            <p className="text-white/40 text-sm mt-1">{detail.description}</p>
          </div>
          <div className="flex gap-2">
            {detail.status === "draft" && (
              <button onClick={activate} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                🚀 Activer le challenge
              </button>
            )}
            {detail.status === "active" && (
              <button onClick={deactivate} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                Desactiver
              </button>
            )}
            <StatusBadge status={detail.status} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-black text-white">{eggsRemaining} / {totalEggs}</div>
            <div className="text-xs text-white/40 mt-1">Oeufs restants</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-black text-white">{detail.budget_spent.toLocaleString("fr-FR")} / {detail.total_budget.toLocaleString("fr-FR")} F</div>
            <div className="text-xs text-white/40 mt-1">Budget depense</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-black text-white">{detail.participants.length}</div>
            <div className="text-xs text-white/40 mt-1">Participants</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-black text-white">{totalCracked}</div>
            <div className="text-xs text-white/40 mt-1">Oeufs craques</div>
          </div>
        </div>

        {/* Reward tiers status */}
        <div className="flex gap-3 mb-6">
          {detail.challenge_rewards.map((tier) => (
            <div key={tier.id} className="glass-card rounded-xl p-4 flex-1 text-center">
              <div className="text-2xl">{tier.emoji}</div>
              <div className="text-white font-bold">{tier.tier}</div>
              <div className="text-accent">{tier.amount} FCFA</div>
              <div className="text-gray-500 text-sm">{tier.remaining_quantity} / {tier.total_quantity} restants</div>
              <div className="w-full h-2 bg-gray-700 rounded-full mt-2">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${(tier.remaining_quantity / tier.total_quantity) * 100}%`, backgroundColor: tier.color || undefined }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live activity feed */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Activite en direct</h3>
          {detail.activityFeed.length === 0 ? (
            <p className="text-white/30 text-sm">Aucune activite pour le moment.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {detail.activityFeed.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span>{event.emoji}</span>
                    <span className="text-white text-sm">{event.users?.name || "Echo"}</span>
                    <span className="text-gray-500 text-xs">a craque un oeuf {event.tier}!</span>
                  </div>
                  <span className="text-green-400 font-bold text-sm">+{event.amount} F</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">🥚 Challenges</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white">{activeChallenges}</div>
          <div className="text-xs text-white/40 mt-1">Challenges actifs</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white">{totalEggsRemaining}</div>
          <div className="text-xs text-white/40 mt-1">Oeufs restants</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white">{budgetSpent.toLocaleString("fr-FR")} FCFA</div>
          <div className="text-xs text-white/40 mt-1">Budget depense</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-white">{totalParticipants}</div>
          <div className="text-xs text-white/40 mt-1">Participants</div>
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={() => setShowCreate(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg mb-6 text-sm font-bold transition"
      >
        + Creer un challenge
      </button>

      {/* Challenge table */}
      {challenges.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">🥚</div>
          <p className="text-white font-bold mb-1">Aucun challenge</p>
          <p className="text-white/30 text-sm">Creez votre premier challenge pour booster l&apos;engagement des Echos!</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Nom</th>
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Theme</th>
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Dates</th>
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Budget</th>
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Oeufs restants</th>
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Participants</th>
                <th className="text-left p-3 text-white/40 font-semibold text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                >
                  <td className="p-3 text-white font-medium">{c.name}</td>
                  <td className="p-3 text-white/60">
                    {c.theme === "easter_egg" ? "🥚 Easter Egg" : c.theme === "independence" ? "🇸🇳 Independance" : c.theme}
                  </td>
                  <td className="p-3 text-white/60">{formatDate(c.start_date)} &rarr; {formatDate(c.end_date)}</td>
                  <td className="p-3 text-white/60">{c.budget_spent.toLocaleString("fr-FR")} / {c.total_budget.toLocaleString("fr-FR")} F</td>
                  <td className="p-3 text-white/60">{c.eggsRemaining} / {c.totalEggs}</td>
                  <td className="p-3 text-white/60">{c.participantCount}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create challenge modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Creer un challenge</h2>
              <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white/60 text-xl">&times;</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                placeholder="Nom du challenge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30"
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 resize-none"
                rows={2}
              />

              {/* Theme selector */}
              <div>
                <label className="text-xs text-white/40 font-semibold mb-1 block">Theme</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("easter_egg")}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${theme === "easter_egg" ? "bg-orange-500 text-white" : "bg-white/5 text-white/50"}`}
                  >
                    🥚 Easter Egg
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("independence")}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${theme === "independence" ? "bg-green-500 text-white" : "bg-white/5 text-white/50"}`}
                  >
                    🇸🇳 Independance
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 font-semibold mb-1 block">Debut</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-semibold mb-1 block">Fin</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 font-semibold mb-1 block">Budget total (FCFA)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-semibold mb-1 block">Clics par recompense</label>
                  <input
                    type="number"
                    value={clicksPerReward}
                    onChange={(e) => setClicksPerReward(Number(e.target.value))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* Campaign link */}
              <div>
                <label className="text-xs text-white/40 font-semibold mb-1 block">Campagne liee (optionnel)</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Aucune campagne liee (challenge libre)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Reward tiers */}
              <div>
                <label className="text-xs text-white/40 font-semibold mb-2 block">Recompenses</label>
                {rewards.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input
                      placeholder="Tier"
                      value={r.tier}
                      onChange={(e) => updateReward(i, "tier", e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs w-24"
                    />
                    <input
                      type="number"
                      placeholder="FCFA"
                      value={r.amount}
                      onChange={(e) => updateReward(i, "amount", Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs w-20"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={r.quantity}
                      onChange={(e) => updateReward(i, "quantity", Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs w-16"
                    />
                    <input
                      placeholder="Emoji"
                      value={r.emoji}
                      onChange={(e) => updateReward(i, "emoji", e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs w-14"
                    />
                    <input
                      type="color"
                      value={r.color}
                      onChange={(e) => updateReward(i, "color", e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <button type="button" onClick={() => removeReward(i)} className="text-red-400 hover:text-red-300 text-sm">
                      &times;
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addReward} className="text-primary text-xs font-semibold">
                  + Ajouter un tier
                </button>
              </div>

              {/* Pre-fill button */}
              <button
                type="button"
                onClick={prefillEasterEgg}
                className="text-orange-400 text-sm underline"
              >
                Pre-remplir: Chasse aux Oeufs de Paques
              </button>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-sm transition disabled:opacity-50"
              >
                {creating ? "Creation..." : "Creer le challenge"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loading detail overlay */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
