"use client";

import { formatFCFA } from "@/lib/utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { BrandDetail, BrandUser } from "./types";

export default function BrandFinanceTab({
  user,
  detail,
  loading,
}: {
  user: BrandUser;
  detail: BrandDetail | null;
  loading: boolean;
}) {
  return (
    <div>
      {loading ? (
        <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Chargement...</div>
      ) : !detail ? (
        <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune donnée</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { value: formatFCFA(user.balance || 0), label: "Solde actuel", color: "#fff" },
              { value: formatFCFA(detail.totalRecharged || 0), label: "Total rechargé", color: "#5DCAA5" },
              { value: formatFCFA(detail.totalSpent || 0), label: "Total dépensé", color: "#D35400" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="font-syne font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Historique recharges</h4>
          {detail.payments.length === 0 ? (
            <div className="font-dm text-sm py-4 text-center mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune recharge</div>
          ) : (
            <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto">
              {detail.payments.map(p => (
                <div key={p.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-3">
                    <AdminBadge status={p.status === "completed" ? "active" : p.status === "pending" ? "pending" : "error"}>
                      {p.status === "completed" ? "OK" : p.status === "pending" ? "Attente" : "Échoué"}
                    </AdminBadge>
                    <div>
                      <div className="font-dm text-sm font-medium text-white">{formatFCFA(p.amount || 0)}</div>
                      <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{p.payment_method || "Wave"}</div>
                    </div>
                  </div>
                  <span className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )}

          <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Transactions récentes</h4>
          {detail.transactions.length === 0 ? (
            <div className="font-dm text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune transaction</div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {detail.transactions.map(tx => (
                <div key={tx.id} className="rounded-lg px-3 py-2.5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono font-bold font-dm text-xs" style={{ color: tx.amount >= 0 ? "#5DCAA5" : "#F09595" }}>
                      {tx.amount >= 0 ? "+" : ""}{formatFCFA(tx.amount)}
                    </span>
                    <span className="font-dm text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{tx.description || tx.type}</span>
                  </div>
                  <span className="font-dm text-xs ml-2 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(tx.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
