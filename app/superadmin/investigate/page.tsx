"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { getBrandDisplayName, getBrandSubtitle } from "@/lib/display-utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { Search, AlertTriangle, Wallet, TrendingUp, MousePointerClick, FileText, Users, Shield, Clock, ExternalLink, Trash2 } from "lucide-react";

interface InvestigationData {
  user: Record<string, unknown>;
  authUser: { email: string; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null } | null;
  walletTransactions: { id: string; amount: number; type: string; description: string; status: string; created_at: string }[];
  payouts: { id: string; amount: number; provider: string | null; status: string; created_at: string; failure_reason: string | null }[];
  payments: { id: string; amount: number; payment_method: string | null; status: string; ref_command: string | null; created_at: string }[];
  trackedLinks: { id: string; short_code: string; click_count: number; created_at: string; campaigns: { title: string; cpc: number; status: string } | null }[];
  campaignsCreated: { id: string; title: string; status: string; cpc: number; budget: number; spent: number; created_at: string }[];
  clickStats: { total: number; valid: number; fraud: number };
  referrer: { id: string; name: string; phone: string | null; role: string } | null;
  referrals: { id: string; name: string; phone: string | null; role: string; created_at: string }[];
  adminActions: { created_at: string; action: string; admin_id: string; details: Record<string, unknown> }[];
  timeline: { time: string; type: string; description: string; amount?: number; details?: unknown }[];
  anomalies: { severity: "high" | "medium" | "low"; message: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  wallet: "bg-[#D35400]/10 text-[#D35400] border-[#D35400]/20",
  payment: "bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20",
  payout: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  campaign_join: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  account: "bg-white/10 text-white/60 border-white/10",
};

const TYPE_ICONS: Record<string, typeof Wallet> = {
  wallet: Wallet,
  payment: TrendingUp,
  payout: ExternalLink,
  campaign_join: MousePointerClick,
  admin: Shield,
  account: Users,
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 border-red-500/30 text-red-400",
  medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  low: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

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
  const [activeTab, setActiveTab] = useState<"timeline" | "wallet" | "payouts" | "campaigns" | "admin">("timeline");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

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
      const url = new URL(window.location.href);
      url.searchParams.set("user_id", id);
      window.history.replaceState({}, "", url.toString());
    } catch {
      setError("Erreur réseau");
    }
    setLoading(false);
  }, [searchInput]);

  useState(() => {
    if (initialUserId) {
      investigate(initialUserId);
    }
  });

  const TABS: { key: typeof activeTab; label: string; count: number }[] = data ? [
    { key: "timeline", label: "Chronologie", count: data.timeline.length },
    { key: "wallet", label: "Transactions", count: data.walletTransactions.length },
    { key: "payouts", label: "Retraits", count: data.payouts.length },
    { key: "campaigns", label: "Campagnes", count: data.trackedLinks.length + data.campaignsCreated.length },
    { key: "admin", label: "Actions admin", count: data.adminActions.length },
  ] : [];

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-syne font-bold flex items-center gap-3">
            <Search size={24} className="text-[#D35400]" />
            Investigation
          </h1>
          <p className="text-xs font-dm text-white/30 mt-1">Analyser l&apos;activité et les transactions d&apos;un utilisateur</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && investigate()}
          placeholder="Entrer l'ID utilisateur (UUID)..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-dm font-mono focus:outline-none focus:border-[#D35400]/50 transition"
        />
        <button
          onClick={() => investigate()}
          disabled={loading || !searchInput.trim()}
          className="px-6 py-3 rounded-xl bg-[#D35400] text-white font-dm font-bold text-sm hover:bg-[#D35400]/90 transition disabled:opacity-50"
        >
          {loading ? "..." : "Investiguer"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-dm mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Anomalies Alert */}
          {data.anomalies.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-dm font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Anomalies détectées ({data.anomalies.length})
              </h2>
              {data.anomalies.map((a, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm font-dm font-medium ${SEVERITY_STYLES[a.severity]}`}>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mr-2 ${
                    a.severity === "high" ? "bg-red-500/20" : a.severity === "medium" ? "bg-yellow-500/20" : "bg-blue-500/20"
                  }`}>
                    {a.severity === "high" ? "Élevé" : a.severity === "medium" ? "Moyen" : "Faible"}
                  </span>
                  {a.message}
                </div>
              ))}
            </div>
          )}

          {/* User Profile Card */}
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-[#D35400]/20 flex items-center justify-center text-xl font-syne font-bold text-[#D35400] shrink-0">
                {getBrandDisplayName({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string }).charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-syne font-bold text-lg">{getBrandDisplayName({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string })}</h3>
                  <span className={`text-xs font-dm font-bold px-2 py-1 rounded-full ${
                    data.user.role === "echo" ? "bg-[#D35400]/10 text-[#D35400]" :
                    data.user.role === "batteur" ? "bg-[#1D9E75]/10 text-[#1D9E75]" :
                    "bg-red-500/10 text-red-400"
                  }`}>{data.user.role as string}</span>
                  <AdminBadge status={((data.user.status as string) === "active" || (data.user.status as string) === "verified") ? "active" : (data.user.status as string) === "suspended" ? "suspended" : "pending"} label={data.user.status as string} />
                </div>
                {getBrandSubtitle({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string }) && (
                  <p className="text-sm font-dm text-white/40 mt-0.5">{getBrandSubtitle({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string })}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-dm text-white/40">
                  <span>Tél: <strong className="text-white/70">{(data.user.phone as string) || "—"}</strong></span>
                  <span>Ville: <strong className="text-white/70">{(data.user.city as string) || "—"}</strong></span>
                  <span>Provider: <strong className="text-white/70">{(data.user.mobile_money_provider as string) || "—"}</strong></span>
                  {data.authUser?.email && (
                    <span>Email: <strong className="text-white/70">{data.authUser.email}</strong></span>
                  )}
                  <span>Créé: <strong className="text-white/70">{new Date(data.user.created_at as string).toLocaleString("fr-FR")}</strong></span>
                  <span>CGU: <strong className={data.user.terms_accepted_at ? "text-emerald-400" : "text-red-400"}>{data.user.terms_accepted_at ? `Accepté ${new Date(data.user.terms_accepted_at as string).toLocaleDateString("fr-FR")}` : "Non accepté"}</strong></span>
                  {data.authUser?.last_sign_in_at && (
                    <span>Dernière connexion: <strong className="text-white/70">{timeAgo(data.authUser.last_sign_in_at)}</strong></span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-[10px] font-mono text-white/20 select-all">{data.user.id as string}</span>
                </div>
                {data.user.referral_code ? (
                  <div className="mt-1 text-xs font-dm">
                    <span className="text-white/40">Code parrainage: </span>
                    <span className="font-bold text-purple-300">{data.user.referral_code as string}</span>
                  </div>
                ) : null}
                {data.user.brand_owner_id ? (
                  <div className="mt-1 text-xs font-dm">
                    <span className="text-white/40">Membre de: </span>
                    <button
                      onClick={() => { setSearchInput(data.user.brand_owner_id as string); investigate(data.user.brand_owner_id as string); }}
                      className="font-bold text-blue-300 hover:underline"
                    >
                      {data.user.brand_owner_id as string}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/superadmin/users?id=${data.user.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs font-dm font-semibold text-white/50 flex items-center gap-1.5"
                >
                  <ExternalLink size={12} />
                  Voir profil
                </button>
                {!data.user.deleted_at ? (
                  <button
                    onClick={() => setShowDelete(true)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-dm font-semibold hover:bg-red-500/20 transition flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-white/5">
                    <span className="text-red-400 text-xs font-dm">Supprimé le {new Date(data.user.deleted_at as string).toLocaleDateString("fr-FR")}</span>
                    {data.user.deletion_reason ? (
                      <span className="text-white/30 text-[10px] font-dm block mt-0.5">Raison: {String(data.user.deletion_reason)}</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard label="Solde actuel" value={formatFCFA((data.user.balance as number) || 0)} icon={<Wallet size={18} />} accent="orange" />
            <AdminStatCard label="Total gagné" value={formatFCFA((data.user.total_earned as number) || 0)} icon={<TrendingUp size={18} />} accent="teal" />
            <AdminStatCard
              label="Clics (total / valides)"
              value={`${data.clickStats.total} / ${data.clickStats.valid}`}
              sub={data.clickStats.fraud > 0 ? `${data.clickStats.fraud} fraude` : undefined}
              icon={<MousePointerClick size={18} />}
              accent="white"
            />
            <AdminStatCard
              label="Transactions"
              value={data.walletTransactions.length.toString()}
              sub={`${data.payouts.length} retraits · ${data.payments.length} paiements`}
              icon={<FileText size={18} />}
              accent="red"
            />
          </div>

          {/* Referral Info */}
          {(data.referrer || data.referrals.length > 0) && (
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-4">
              <h3 className="text-sm font-syne font-bold text-purple-300 flex items-center gap-2 mb-3">
                <Users size={16} /> Parrainages
              </h3>
              <div className="space-y-2">
                {data.referrer && (
                  <div className="text-xs font-dm">
                    <span className="text-white/40">Parrainé par: </span>
                    <button
                      onClick={() => { setSearchInput(data.referrer!.id); investigate(data.referrer!.id); }}
                      className="font-bold text-[#D35400] hover:underline"
                    >
                      {data.referrer.name}
                    </button>
                    <span className="text-white/30"> ({data.referrer.role})</span>
                  </div>
                )}
                {data.referrals.length > 0 && (
                  <div>
                    <span className="text-xs font-dm text-white/40">Filleuls ({data.referrals.length}):</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.referrals.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => { setSearchInput(r.id); investigate(r.id); }}
                          className="text-xs font-dm px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60"
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
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2 rounded-lg text-xs font-dm font-bold transition whitespace-nowrap ${
                  activeTab === t.key ? "bg-[#D35400] text-white" : "bg-[#111128] border border-white/[0.07] text-white/40 hover:bg-[#141420]"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-4">
            {activeTab === "timeline" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.timeline.length === 0 ? (
                  <p className="text-xs font-dm text-white/20 text-center py-6">Aucun événement</p>
                ) : data.timeline.map((event, i) => {
                  const EventIcon = TYPE_ICONS[event.type] || Clock;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${TYPE_COLORS[event.type] || "bg-white/5 border-white/10"}`}>
                      <EventIcon size={16} className="shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-dm font-medium">{event.description}</span>
                          {event.amount !== undefined && event.amount !== 0 && (
                            <span className={`text-sm font-syne font-bold shrink-0 ${event.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {event.amount > 0 ? "+" : ""}{formatFCFA(event.amount)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-dm text-white/30">{new Date(event.time).toLocaleString("fr-FR")}</span>
                          <span className="text-[9px] font-dm font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/30">{event.type}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "wallet" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.walletTransactions.length === 0 ? (
                  <p className="text-xs font-dm text-white/20 text-center py-6">Aucune transaction</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] font-dm text-white/30 border-b border-white/[0.05] uppercase">
                          <th className="pb-2 font-semibold">Date</th>
                          <th className="pb-2 font-semibold">Type</th>
                          <th className="pb-2 font-semibold">Description</th>
                          <th className="pb-2 font-semibold text-right">Montant</th>
                          <th className="pb-2 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.walletTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-white/[0.03]">
                            <td className="py-2 text-xs font-dm text-white/40">{new Date(tx.created_at).toLocaleString("fr-FR")}</td>
                            <td className="py-2">
                              <span className="text-[10px] font-dm font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/50">
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-2 text-xs font-dm">{tx.description}</td>
                            <td className="py-2 text-right font-syne font-bold">
                              <span className={tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}>
                                {tx.amount >= 0 ? "+" : ""}{formatFCFA(tx.amount)}
                              </span>
                            </td>
                            <td className="py-2">
                              <AdminBadge status={tx.status === "completed" ? "active" : tx.status === "pending" ? "pending" : "error"} label={tx.status} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payouts" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.payouts.length === 0 ? (
                  <p className="text-xs font-dm text-white/20 text-center py-6">Aucun retrait</p>
                ) : data.payouts.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-syne font-bold">{formatFCFA(p.amount)}</span>
                        <span className="text-xs font-dm text-white/30 ml-2">via {p.provider || "?"}</span>
                      </div>
                      <AdminBadge status={p.status === "completed" ? "active" : p.status === "pending" ? "pending" : "error"} label={p.status} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-[11px] font-dm text-white/40 mt-1">
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
                    <h4 className="text-xs font-dm font-bold text-[#D35400] mb-2">Campagnes rejointes ({data.trackedLinks.length})</h4>
                    <div className="space-y-2">
                      {data.trackedLinks.map((l) => (
                        <div key={l.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-dm font-semibold">{l.campaigns?.title || "?"}</span>
                            <AdminBadge status={l.campaigns?.status === "active" ? "active" : l.campaigns?.status === "completed" ? "finished" : "pending"} label={l.campaigns?.status || "?"} size="sm" />
                          </div>
                          <div className="flex flex-wrap gap-x-4 text-[11px] font-dm text-white/40 mt-1">
                            <span>Clics: <strong className="text-white/70">{l.click_count}</strong></span>
                            <span>CPC: <strong className="text-white/70">{formatFCFA(l.campaigns?.cpc || 0)}</strong></span>
                            <span>Gagné: <strong className="text-[#1D9E75]">{formatFCFA(Math.floor((l.click_count || 0) * (l.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100))}</strong></span>
                            <span>{new Date(l.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.campaignsCreated.length > 0 && (
                  <div>
                    <h4 className="text-xs font-dm font-bold text-[#1D9E75] mb-2">Campagnes créées ({data.campaignsCreated.length})</h4>
                    <div className="space-y-2">
                      {data.campaignsCreated.map((c) => (
                        <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-dm font-semibold">{c.title}</span>
                            <AdminBadge status={c.status === "active" ? "active" : c.status === "completed" ? "finished" : "pending"} label={c.status} size="sm" />
                          </div>
                          <div className="flex flex-wrap gap-x-4 text-[11px] font-dm text-white/40 mt-1">
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
                  <p className="text-xs font-dm text-white/20 text-center py-6">Aucune campagne</p>
                )}
              </div>
            )}

            {activeTab === "admin" && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {data.adminActions.length === 0 ? (
                  <p className="text-xs font-dm text-white/20 text-center py-6">Aucune action admin</p>
                ) : data.adminActions.map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-dm font-semibold">{a.action}</span>
                      <span className="text-[10px] font-dm text-white/30">{new Date(a.created_at).toLocaleString("fr-FR")}</span>
                    </div>
                    {a.details && (
                      <div className="mt-1 text-[10px] font-dm text-white/20 font-mono break-all">
                        {JSON.stringify(a.details)}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] font-dm text-white/15 font-mono">admin: {a.admin_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Account Drawer */}
      <AdminDrawer
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteReason(""); }}
        title="Supprimer le compte"
        subtitle={data ? getBrandDisplayName({ name: data.user.name as string, company_name: data.user.company_name as string | undefined, role: data.user.role as string }) : ""}
        width="480px"
      >
        {data && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-dm text-red-400">
                Le compte sera désactivé et les données anonymisées. L&apos;historique financier sera conservé.
              </p>
            </div>

            {(data.user.balance as number) > 0 && (
              <div className="bg-[#D35400]/10 border border-[#D35400]/20 rounded-lg p-3">
                <div className="text-[#D35400] text-sm font-dm">
                  Ce compte a un solde de {Number(data.user.balance).toLocaleString("fr-FR")} FCFA. Il sera perdu.
                </div>
              </div>
            )}

            <div>
              <label className="text-white/30 text-xs font-dm mb-1 block">Raison de suppression *</label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="Ex: Demande utilisateur, compte frauduleux..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-dm focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDelete(false); setDeleteReason(""); }}
                className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-lg text-sm font-dm hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await fetch("/api/superadmin/users/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: data.user.id, reason: deleteReason }),
                    });
                    setShowDelete(false);
                    setDeleteReason("");
                    investigate(data.user.id as string);
                  } catch {
                    // ignore
                  }
                  setDeleting(false);
                }}
                disabled={deleting || !deleteReason}
                className={`flex-1 py-2.5 rounded-lg text-sm font-dm font-medium transition ${
                  deleteReason && !deleting
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
              >
                {deleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
