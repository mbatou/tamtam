"use client";

import { formatFCFA } from "@/lib/utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import type { PayoutHistory, PayoutActionsState } from "./types";

export default function PayoutHistoryList({
  payouts,
  actions,
}: {
  payouts: PayoutHistory[];
  actions: PayoutActionsState;
}) {
  return payouts.length === 0 ? (
    <p className="font-dm text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>Aucun retrait</p>
  ) : (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {payouts.map((p) => {
        const isPending = p.status === "pending";
        const isRejecting = actions.rejectId === p.id;
        return (
          <div key={p.id} className="p-3 rounded-xl transition" style={{
            background: isPending ? "rgba(234,179,8,0.03)" : "rgba(255,255,255,0.03)",
            border: `0.5px solid ${isPending ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.05)"}`,
          }}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-syne font-bold text-sm text-white">{formatFCFA(p.amount)}</span>
              <AdminBadge status={p.status === "pending" ? "pending" : p.status === "sent" ? "active" : "error"}>
                {p.status === "pending" ? "En attente" : p.status === "sent" ? "Envoyé" : "Échoué"}
              </AdminBadge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-dm text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span>Via : <strong className="text-white/70">{p.provider === "wave" ? "Wave" : "Orange Money"}</strong></span>
              <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
              {p.failure_reason && <span style={{ color: "#F09595" }}>{p.failure_reason}</span>}
            </div>
            {isPending && !isRejecting && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => actions.onAction(p.id, "approve")}
                  disabled={actions.actionLoading === p.id}
                  className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold transition disabled:opacity-50"
                  style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                >
                  {actions.actionLoading === p.id ? "..." : "Approuver"}
                </button>
                <button
                  onClick={() => actions.onRejectIdChange(p.id)}
                  className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold transition"
                  style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                >
                  Rejeter
                </button>
              </div>
            )}
            {isRejecting && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={actions.rejectReason}
                  onChange={(e) => actions.onRejectReasonChange(e.target.value)}
                  placeholder="Raison du rejet..."
                  className="w-full rounded-lg px-3 py-2 font-dm text-xs resize-none h-12 focus:outline-none transition"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { actions.onRejectIdChange(null); actions.onRejectReasonChange(""); }}
                    className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold"
                    style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => actions.onAction(p.id, "reject", actions.rejectReason)}
                    disabled={actions.actionLoading === p.id}
                    className="flex-1 py-1.5 rounded-lg font-dm text-[11px] font-bold disabled:opacity-50"
                    style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                  >
                    {actions.actionLoading === p.id ? "..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
