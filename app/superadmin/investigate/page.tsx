"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { getBrandDisplayName, getBrandSubtitle } from "@/lib/display-utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";

interface InvestigationData {
  user: Record<string, unknown>;
  authUser: { email: string; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null } | null;
  walletTransactions: { id: string; amount: number; type: string; description: string; status: string; created_at: string }[];
  payouts: { id: string; amount: number; provider: string | null; status: string; created_at: string; failure_reason: string | null }[];
  payments: { id: string; amount: number; payment_method: string | null; status: string; ref_command: string | null; created_at: string }[];
  trackedLinks: { id: string; short_code: string; click_count: number; created_at: string; campaigns: { title: string; cpc: number; status: string } | null }[];
  campaignsCreated: { id: string; title: string; status: string; cpc: number; budget: number; spent: number; created_at: string }[];
  clickStats: { total: number; valid: number; fraud: number };
  achievements: { created_at: string; reward_fcfa: number; gamification_milestones: { name: string; reward_fcfa: number } | null }[];
  streakRewards: { created_at: string; reward_fcfa: number; streak_count: number }[];
  streakData: { current_streak: number; longest_streak: number; last_active_date: string } | null;
  referrer: { id: string; name: string; phone: string | null; role: string } | null;
  referrals: { id: string; name: string; phone: string | null; role: string; created_at: string }[];
  adminActions: { created_at: string; action: string; admin_id: string; details: Record<string, unknown> }[];
  timeline: { time: string; type: string; description: string; amount?: number; details?: unknown }[];
  anomalies: { severity: "high" | "medium" | "low"; message: string }[];
}

export default function InvestigatePageWrapper() {
  return <Suspense><InvestigatePageContent /></Suspense>;
}

function InvestigatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUserId = searchParams.get("user_id") || "";

  const [searchInput, setSearchInput] = useState(initialUserId);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InvestigationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "wallet" | "payouts" | "campaigns" | "gamification" | "admin">("timeline");

  const investigate = useCallback(async (userId?: string) => {
    const id = (userId || searchInput).trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/superadmin/investigate?user_id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erreur");
        setLoading(false);
        return;
      }
      const result = await res.json();
      setData(result);
      // Update URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.set("user_id", id);
      window.history.replaceState({}, "", url.toString());
    } catch {
      setError("Erreur réseau");
    }
    setLoading(false);
  }, [searchInput]);

  // Auto-load if user_id in URL
  useState(() => {
    if (initialUserId) {
      investigate(initialUserId);
    }
  });

  const typeColors: Record<string, string> = {
    wallet: "bg-primary/10 text-primary border-primary/20",
    payment: "bg-accent/10 text-accent border-accent/20",
    payout: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    campaign_join: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    achievement: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    streak: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    admin: "bg-red-500/10 text-red-400 border-red-500/20",
    account: "bg-white/10 text-white/60 border-white/10",
  };

  const typeEmojis: Record<string, string> = {
    wallet: "💳",
    payment: "💰",
    payout: "📤",
    campaign_join: "🔗",
    achievement: "🏆",
    streak: "🔥",
    admin: "🛡️",
    account: "👤",
  };

  const severityColors: Record<string, string> = {
    high: "bg-red-500/10 border-red-500/30 text-red-400",
    medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    low: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Investigation Utilisateur</h1>
          <p className="text-xs text-white/30 mt-1">Analysez en détail l&apos;activité et les transactions d&apos;un utilisateur</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && investigate()}
          placeholder="Entrez l'ID utilisateur (UUID)..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition font-mono"
        />
        <button
          onClick={() => investigate()}
          disabled={loading || !searchInput.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-primary text-white font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "..." : "Investiguer"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="skeleton h-32 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Anomalies Alert */}
          {data.anomalies.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <span>⚠️</span> Anomalies détectées ({data.anomalies.length})
              </h2>
              {data.anomalies.map((a, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm font-medium ${severityColors[a.severity]}`}>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mr-2 ${
                    a.severity === "high" ? "bg-red-500/20" : a.severity === "medium" ? "bg-yellow-500/20" : "bg-blue-500/20"
                  }`}>
                    {a.severity}
                  </span>
                  {a.message}
                </div>
              ))}
            </div>
          )}

          {/* User Profile Card */}
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-bold text-white shrink-0">
                {getBrandDisplayName({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string }).charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{getBrandDisplayName({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string })}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    data.user.role === "echo" ? "bg-primary/10 text-primary" :
                    data.user.role === "batteur" ? "bg-accent/10 text-accent" :
                    "bg-red-500/10 text-red-400"
                  }`}>{data.user.role as string}</span>
                  <Badge status={(data.user.status as string) || "active"} />
                  {data.user.risk_level ? <Badge status={data.user.risk_level as string} /> : null}
                </div>
                {getBrandSubtitle({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string }) && <p className="text-sm text-white/40 mt-0.5">{getBrandSubtitle({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string })}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/40">
                  <span>Tel: <strong className="text-white/70">{(data.user.phone as string) || "—"}</strong></span>
                  <span>Ville: <strong className="text-white/70">{(data.user.city as string) || "—"}</strong></span>
                  <span>Provider: <strong className="text-white/70">{(data.user.mobile_money_provider as string) || "—"}</strong></span>
                  {data.authUser?.email && (
                    <span>Email: <strong className="text-white/70">{data.authUser.email}</strong></span>
                  )}
                  <span>Créé: <strong className="text-white/70">{new Date(data.user.created_at as string).toLocaleString("fr-FR")}</strong></span>
                  {data.authUser?.last_sign_in_at && (
                    <span>Dernière connexion: <strong className="text-white/70">{timeAgo(data.authUser.last_sign_in_at)}</strong></span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-[10px] font-mono text-white/20 select-all">{data.user.id as string}</span>
                </div>
                {data.user.referral_code ? (
                  <div className="mt-1 text-xs">
                    <span className="text-white/40">Code parrain: </span>
                    <span className="font-bold text-purple-300">{data.user.referral_code as string}</span>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => router.push(`/superadmin/users?id=${data.user.id}`)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs font-semibold text-white/50"
              >
                Voir profil
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Solde actuel" value={formatFCFA((data.user.balance as number) || 0)} accent="orange" />
            <StatCard label="Total gagné" value={formatFCFA((data.user.total_earned as number) || 0)} accent="teal" />
            <StatCard
              label="Clics (total / valides)"
              value={`${data.clickStats.total} / ${data.clickStats.valid}`}
              sub={data.clickStats.fraud > 0 ? `${data.clickStats.fraud} fraude` : undefined}
              accent="purple"
            />
            <StatCard
              label="Transactions"
              value={data.walletTransactions.length.toString()}
              sub={`${data.payouts.length} retraits · ${data.payments.length} paiements`}
              accent="red"
            />
          </div>

          {/* Referral Info */}
          {(data.referrer || data.referrals.length > 0) && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-3">
                <span>🤝</span> Parrainage
              </h3>
              <div className="space-y-2">
                {data.referrer && (
                  <div className="text-xs">
                    <span className="text-white/40">Parrainé par: </span>
                    <button
                      onClick={() => { setSearchInput(data.referrer!.id); investigate(data.referrer!.id); }}
                      className="font-bold text-primary hover:underline"
                    >
                      {data.referrer.name}
                    </button>
                    <span className="text-white/30"> ({data.referrer.role})</span>
                  </div>
                )}
                {data.referrals.length > 0 && (
                  <div>
                    <span className="text-xs text-white/40">Filleuls ({data.referrals.length}):</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.referrals.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setSearchInput(r.id); investigate(r.id); }}
                          className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60"
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {([
              { key: "timeline", label: "Chronologie", count: data.timeline.length },
              { key: "wallet", label: "Transactions", count: data.walletTransactions.length },
              { key: "payouts", label: "Retraits", count: data.payouts.length },
              { key: "campaigns", label: "Campagnes", count: data.trackedLinks.length + data.campaignsCreated.length },
              { key: "gamification", label: "Gamification", count: data.achievements.length + data.streakRewards.length },
              { key: "admin", label: "Actions admin", count: data.adminActions.length },
            ] as { key: typeof activeTab; label: string; count: number }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.key ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="glass-card p-4">
            {activeTab === "timeline" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.timeline.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-6">Aucun événement</p>
                ) : data.timeline.map((event, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${typeColors[event.type] || "bg-white/5 border-white/10"}`}>
                    <span className="text-base shrink-0 mt-0.5">{typeEmojis[event.type] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{event.description}</span>
                        {event.amount !== undefined && event.amount !== 0 && (
                          <span className={`text-sm font-bold shrink-0 ${event.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {event.amount > 0 ? "+" : ""}{formatFCFA(event.amount)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/30">{new Date(event.time).toLocaleString("fr-FR")}</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/30">{event.type}</span>
                      </div>
                      {event.details ? (
                        <div className="mt-1 text-[10px] text-white/20 font-mono break-all">
                          {JSON.stringify(event.details)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "wallet" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.walletTransactions.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-6">Aucune transaction</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-white/30 border-b border-white/5">
                            <th className="pb-2 font-semibold">Date</th>
                            <th className="pb-2 font-semibold">Type</th>
                            <th className="pb-2 font-semibold">Description</th>
                            <th className="pb-2 font-semibold text-right">Montant</th>
                            <th className="pb-2 font-semibold">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.walletTransactions.map((tx) => (
                            <tr key={tx.id} className="border-b border-white/5">
                              <td className="py-2 text-xs text-white/40">{new Date(tx.created_at).toLocaleString("fr-FR")}</td>
                              <td className="py-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/50">
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-2 text-xs">{tx.description}</td>
                              <td className="py-2 text-right font-bold">
                                <span className={tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}>
                                  {tx.amount >= 0 ? "+" : ""}{formatFCFA(tx.amount)}
                                </span>
                              </td>
                              <td className="py-2"><Badge status={tx.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "payouts" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.payouts.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-6">Aucun retrait</p>
                ) : data.payouts.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold">{formatFCFA(p.amount)}</span>
                        <span className="text-xs text-white/30 ml-2">via {p.provider || "?"}</span>
                      </div>
                      <Badge status={p.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-[11px] text-white/40 mt-1">
                      <span>{new Date(p.created_at).toLocaleString("fr-FR")}</span>
                      {p.failure_reason && <span className="text-red-400">Raison: {p.failure_reason}</span>}
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-white/15 select-all">{p.id}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "campaigns" && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {data.trackedLinks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-primary mb-2">Campagnes rejointes ({data.trackedLinks.length})</h4>
                    <div className="space-y-2">
                      {data.trackedLinks.map((l) => (
                        <div key={l.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold">{l.campaigns?.title || "?"}</span>
                            <Badge status={l.campaigns?.status || "unknown"} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 text-[11px] text-white/40 mt-1">
                            <span>Clics: <strong className="text-white/70">{l.click_count}</strong></span>
                            <span>CPC: <strong className="text-white/70">{formatFCFA(l.campaigns?.cpc || 0)}</strong></span>
                            <span>Gagné: <strong className="text-accent">{formatFCFA(Math.floor((l.click_count || 0) * (l.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100))}</strong></span>
                            <span>{new Date(l.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.campaignsCreated.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-accent mb-2">Campagnes créées ({data.campaignsCreated.length})</h4>
                    <div className="space-y-2">
                      {data.campaignsCreated.map((c) => (
                        <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold">{c.title}</span>
                            <Badge status={c.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 text-[11px] text-white/40 mt-1">
                            <span>Budget: {formatFCFA(c.budget)}</span>
                            <span>Dépensé: {formatFCFA(c.spent)}</span>
                            <span>CPC: {formatFCFA(c.cpc)}</span>
                            <span>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.trackedLinks.length === 0 && data.campaignsCreated.length === 0 && (
                  <p className="text-xs text-white/20 text-center py-6">Aucune campagne</p>
                )}
              </div>
            )}

            {activeTab === "gamification" && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {data.streakData && (
                  <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <h4 className="text-xs font-bold text-orange-400 mb-2">Série actuelle</h4>
                    <div className="flex gap-4 text-xs">
                      <span>Série: <strong className="text-white">{data.streakData.current_streak} jours</strong></span>
                      <span>Record: <strong className="text-white">{data.streakData.longest_streak} jours</strong></span>
                      <span>Dernière activité: <strong className="text-white">{data.streakData.last_active_date}</strong></span>
                    </div>
                  </div>
                )}
                {data.achievements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-yellow-400 mb-2">Milestones ({data.achievements.length})</h4>
                    <div className="space-y-2">
                      {data.achievements.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <div className="flex items-center gap-2">
                            <span>🏆</span>
                            <span className="text-sm">{a.gamification_milestones?.name || "?"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-emerald-400">+{formatFCFA(a.reward_fcfa)}</span>
                            <span className="text-[10px] text-white/30">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.streakRewards.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 mb-2">Récompenses série ({data.streakRewards.length})</h4>
                    <div className="space-y-2">
                      {data.streakRewards.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <div className="flex items-center gap-2">
                            <span>🔥</span>
                            <span className="text-sm">Série de {s.streak_count} jours</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-emerald-400">+{formatFCFA(s.reward_fcfa)}</span>
                            <span className="text-[10px] text-white/30">{new Date(s.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.achievements.length === 0 && data.streakRewards.length === 0 && !data.streakData && (
                  <p className="text-xs text-white/20 text-center py-6">Aucune donnée de gamification</p>
                )}
              </div>
            )}

            {activeTab === "admin" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.adminActions.length === 0 ? (
                  <p className="text-xs text-white/20 text-center py-6">Aucune action admin</p>
                ) : data.adminActions.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{a.action}</span>
                      <span className="text-[10px] text-white/30">{new Date(a.created_at).toLocaleString("fr-FR")}</span>
                    </div>
                    {a.details ? (
                      <div className="mt-1 text-[10px] text-white/20 font-mono break-all">
                        {JSON.stringify(a.details)}
                      </div>
                    ) : null}
                    <div className="mt-1 text-[10px] text-white/15 font-mono">admin: {a.admin_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
