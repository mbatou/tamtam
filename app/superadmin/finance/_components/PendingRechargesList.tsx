"use client";

import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import { CheckCircle2 } from "lucide-react";
import { PaymentRow } from "./types";

export default function PendingRechargesList({
  pendingRecharges,
  onAction,
}: {
  pendingRecharges: PaymentRow[];
  onAction: (paymentId: string, action: "validate" | "reject") => void;
}) {
  return (
    <div>
      {pendingRecharges.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "rgba(29,158,117,0.5)" }} />
          <h3 className="font-syne font-bold text-lg text-white mb-1">Aucune recharge en attente</h3>
          <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Toutes les recharges ont été traitées</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingRecharges.map((payment) => (
            <div key={payment.id} className="rounded-xl p-4 flex items-center justify-between transition"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-dm text-sm font-bold" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>
                  W
                </div>
                <div>
                  <div className="font-dm text-sm font-semibold text-white">{payment.users ? getBrandDisplayName(payment.users) : "—"}</div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {payment.payment_method || "Wave"} · Ref: {payment.id.slice(0, 8)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-syne font-bold text-lg text-white">{formatFCFA(payment.amount)}</div>
                <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onAction(payment.id, "validate")}
                  className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                  style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                >
                  Valider
                </button>
                <button
                  onClick={() => onAction(payment.id, "reject")}
                  className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                  style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                >
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "rgba(96,165,250,0.04)", border: "0.5px solid rgba(96,165,250,0.1)" }}>
        <p className="font-dm text-xs" style={{ color: "rgba(96,165,250,0.5)" }}>
          Vérifiez les transactions Wave manuellement avant validation.
        </p>
      </div>
    </div>
  );
}
