"use client";

import { formatFCFA } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";
import { ConfirmPayoutAction } from "./types";

export default function PayoutConfirmModal({
  confirmAction,
  processing,
  onCancel,
  onConfirm,
}: {
  confirmAction: ConfirmPayoutAction;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: confirmAction.action === "approve" ? "rgba(29,158,117,0.05)" : "rgba(226,75,74,0.05)",
            border: `0.5px solid ${confirmAction.action === "approve" ? "rgba(29,158,117,0.15)" : "rgba(226,75,74,0.15)"}`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            {confirmAction.action === "approve" ? (
              <CheckCircle2 size={20} style={{ color: "#5DCAA5" }} />
            ) : (
              <XCircle size={20} style={{ color: "#F09595" }} />
            )}
            <div>
              <div className="font-syne font-bold text-sm text-white">
                {confirmAction.action === "approve" ? "Confirmer l'approbation" : "Confirmer le rejet"}
              </div>
              <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Cette action est irréversible</div>
            </div>
          </div>

          <div className="space-y-2 font-dm text-sm">
            <div className="flex justify-between">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Écho</span>
              <span className="font-semibold text-white">{confirmAction.payout.users?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Montant</span>
              <span className="font-semibold text-white">{formatFCFA(confirmAction.payout.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Fournisseur</span>
              <span className="font-semibold text-white">{confirmAction.payout.provider === "wave" ? "Wave" : "Orange Money"}</span>
            </div>
            {confirmAction.reason && (
              <div className="pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
                <span className="font-dm text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Raison du rejet</span>
                <p className="font-dm text-sm mt-1 text-white">{confirmAction.reason}</p>
              </div>
            )}
          </div>
        </div>

        {confirmAction.action === "reject" && (
          <p className="font-dm text-xs mb-4" style={{ color: "#F09595" }}>
            Le montant sera recrédité sur le solde de l&apos;écho.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{
              background: confirmAction.action === "approve" ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.1)",
              border: `0.5px solid ${confirmAction.action === "approve" ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`,
              color: confirmAction.action === "approve" ? "#5DCAA5" : "#F09595",
            }}
          >
            {processing ? "Traitement..." : confirmAction.action === "approve" ? "Confirmer l'envoi" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}
