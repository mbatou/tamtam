"use client";

import { useRouter } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName, getBrandSubtitle } from "@/lib/display-utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import {
  CheckCircle2,
  Flag,
  Ban,
  RotateCcw,
  Crown,
  CreditCard,
  MousePointerClick,
} from "lucide-react";
import CampaignHistoryList from "./CampaignHistoryList";
import PayoutHistoryList from "./PayoutHistoryList";
import {
  qualityScore,
  type UserRow,
  type HistoryState,
  type PayoutActionsState,
  type ToastFn,
} from "./types";

export default function UserDetailDrawer({
  user,
  users,
  onClose,
  onSelectUser,
  onAction,
  onTopup,
  showToast,
  history,
  payoutActions,
}: {
  user: UserRow | null;
  users: UserRow[];
  onClose: () => void;
  onSelectUser: (user: UserRow) => void;
  onAction: (userId: string, action: string) => void;
  onTopup: (user: UserRow) => void;
  showToast: ToastFn;
  history: HistoryState;
  payoutActions: PayoutActionsState;
}) {
  const router = useRouter();
  const selected = user;
  const { echoCampaigns, batteurCampaigns, payouts: payoutHistory, tab: historyTab, onTabChange: setHistoryTab } = history;

  return (
    <AdminDrawer
      open={!!selected}
      onClose={onClose}
      title={selected ? getBrandDisplayName(selected) : ""}
      subtitle={selected ? `${selected.role === "echo" ? "Écho" : "Marque"} · ${selected.city || ""} · ${selected.phone || ""}` : undefined}
      width="520px"
    >
      {selected && (
        <div className="space-y-5">
          {/* Avatar + ID */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-dm text-xl font-bold text-white shrink-0" style={{ background: "#D35400" }}>
              {getBrandDisplayName(selected).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-syne font-bold text-lg text-white">{getBrandDisplayName(selected)}</h3>
                {selected.is_dual_role && (
                  <span className="font-dm text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(192,132,252,0.15)", color: "#C084FC" }}>Double rôle</span>
                )}
              </div>
              {getBrandSubtitle(selected) && <p className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{getBrandSubtitle(selected)}</p>}
              <p
                className="font-dm text-[10px] font-mono mt-0.5 cursor-pointer select-all"
                style={{ color: "rgba(255,255,255,0.2)" }}
                onClick={() => { navigator.clipboard.writeText(selected.id); showToast("UUID copié", "success"); }}
                title="Cliquer pour copier"
              >
                {selected.id}
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2">
            <AdminBadge size="md" status={
              selected.status === "verified" ? "verified" :
              selected.status === "flagged" ? "error" :
              selected.status === "suspended" ? "suspended" :
              "active"
            }>
              {selected.status === "verified" ? "Vérifié" :
               selected.status === "flagged" ? "Signalé" :
               selected.status === "suspended" ? "Suspendu" :
               "Actif"}
            </AdminBadge>
            {selected.risk_level && (
              <AdminBadge size="md" status={selected.risk_level === "high" ? "fraud" : selected.risk_level === "medium" ? "pending" : "active"}>
                Risque: {selected.risk_level}
              </AdminBadge>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: formatFCFA(selected.total_earned), label: "Total gagné", color: "#D35400" },
              { value: formatFCFA(selected.balance || 0), label: "Solde", color: "#5DCAA5" },
              { value: String(selected.click_stats.total), label: "Total clics", color: "#fff" },
              { value: `${selected.click_stats.rate}%`, label: "Taux fraude", color: selected.click_stats.rate > 20 ? "#F09595" : "#fff" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="font-syne font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quality Score */}
          {(selected.role === "echo" || selected.has_echo_activity) && (() => {
            const score = qualityScore(selected);
            const scoreColor = score >= 70 ? "#5DCAA5" : score >= 40 ? "#D35400" : "#F09595";
            const scoreBg = score >= 70 ? "rgba(29,158,117,0.06)" : score >= 40 ? "rgba(211,84,0,0.06)" : "rgba(226,75,74,0.06)";
            const scoreBorder = score >= 70 ? "rgba(29,158,117,0.15)" : score >= 40 ? "rgba(211,84,0,0.15)" : "rgba(226,75,74,0.15)";
            return (
              <div className="rounded-xl p-3" style={{ background: scoreBg, border: `0.5px solid ${scoreBorder}` }}>
                <div className="flex items-center justify-between">
                  <span className="font-dm text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Score qualité</span>
                  <span className="font-syne font-bold text-lg" style={{ color: scoreColor }}>{score}%</span>
                </div>
                <div className="flex gap-4 mt-2 font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  <span>Ratio valide : {selected.click_stats.total > 0 ? Math.round(selected.click_stats.valid / selected.click_stats.total * 100) : 0}%</span>
                  <span>Campagnes : {selected.campaigns_joined}</span>
                </div>
              </div>
            );
          })()}

          {/* Referral info */}
          {(selected.referral_count > 0 || selected.referred_by) && (
            <div className="rounded-xl p-3" style={{ background: "rgba(192,132,252,0.04)", border: "0.5px solid rgba(192,132,252,0.1)" }}>
              <span className="font-dm text-xs font-semibold" style={{ color: "#C084FC" }}>Parrainage</span>
              <div className="flex flex-wrap gap-4 mt-2 font-dm text-xs">
                {selected.referral_code && (
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Code : </span>
                    <span className="font-bold" style={{ color: "#C084FC" }}>{selected.referral_code}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>Filleuls : </span>
                  <span className="font-bold" style={{ color: "#5DCAA5" }}>{selected.referral_count}</span>
                </div>
                {selected.referred_by && (
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Parrainé par : </span>
                    <button
                      onClick={() => {
                        const referrer = users.find((u) => u.id === selected.referred_by);
                        if (referrer) onSelectUser(referrer);
                      }}
                      className="font-bold transition" style={{ color: "#D35400" }}
                    >
                      {(() => { const ref = users.find((u) => u.id === selected.referred_by); return ref ? getBrandDisplayName(ref) : selected.referred_by!.slice(0, 8); })()}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History tabs */}
          <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="flex gap-1 mb-3">
              {echoCampaigns.length > 0 && (
                <button
                  onClick={() => setHistoryTab("echo")}
                  className="px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                  style={{
                    background: historyTab === "echo" ? "rgba(211,84,0,0.12)" : "rgba(255,255,255,0.04)",
                    color: historyTab === "echo" ? "#D35400" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Campagnes rejointes ({echoCampaigns.length})
                </button>
              )}
              {batteurCampaigns.length > 0 && (
                <button
                  onClick={() => setHistoryTab("batteur")}
                  className="px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                  style={{
                    background: historyTab === "batteur" ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.04)",
                    color: historyTab === "batteur" ? "#5DCAA5" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Campagnes lancées ({batteurCampaigns.length})
                </button>
              )}
              <button
                onClick={() => setHistoryTab("payouts")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                style={{
                  background: historyTab === "payouts" ? "rgba(192,132,252,0.12)" : "rgba(255,255,255,0.04)",
                  color: historyTab === "payouts" ? "#C084FC" : "rgba(255,255,255,0.4)",
                }}
              >
                Retraits ({payoutHistory.length})
                {payoutHistory.filter((p) => p.status === "pending").length > 0 && (
                  <span className="font-bold text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(226,75,74,0.15)", color: "#F09595" }}>
                    {payoutHistory.filter((p) => p.status === "pending").length}
                  </span>
                )}
              </button>
            </div>

            {echoCampaigns.length === 0 && batteurCampaigns.length === 0 && historyTab !== "payouts" && (
              <button
                onClick={() => setHistoryTab("echo")}
                className="px-3 py-1.5 rounded-lg font-dm text-[11px] font-bold mb-3"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
              >
                Campagnes rejointes (0)
              </button>
            )}

            {history.loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : historyTab === "payouts" ? (
              <PayoutHistoryList payouts={payoutHistory} actions={payoutActions} />
            ) : (
              <CampaignHistoryList
                campaigns={historyTab === "batteur" ? batteurCampaigns : echoCampaigns}
                isEcho={historyTab === "echo"}
              />
            )}
          </div>

          {/* Top-up for brands */}
          {(selected.role === "batteur" || selected.role === "admin" || selected.role === "superadmin") && (
            <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => onTopup(selected)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
              >
                <CreditCard size={14} />
                Recharger le solde
              </button>
            </div>
          )}

          {/* Investigate */}
          <div className="pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => router.push(`/superadmin/investigate?user_id=${selected.id}`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            >
              <MousePointerClick size={14} />
              Investiguer cet utilisateur
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <button onClick={() => onAction(selected.id, "verify")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
              style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}>
              <CheckCircle2 size={12} /> Vérifier
            </button>
            <button onClick={() => onAction(selected.id, "flag")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
              style={{ background: "rgba(234,179,8,0.1)", border: "0.5px solid rgba(234,179,8,0.3)", color: "#EAB308" }}>
              <Flag size={12} /> Signaler
            </button>
            <button onClick={() => onAction(selected.id, "suspend")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
              style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}>
              <Ban size={12} /> Suspendre
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onAction(selected.id, "reset_balance")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <RotateCcw size={12} /> Reset solde
            </button>
            <button onClick={() => onAction(selected.id, "promote_admin")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-dm text-xs font-bold transition"
              style={{ background: "rgba(192,132,252,0.1)", border: "0.5px solid rgba(192,132,252,0.3)", color: "#C084FC" }}>
              <Crown size={12} /> Promouvoir Admin
            </button>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}
