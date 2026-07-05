"use client";

import { formatFCFA } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { PayoutRow } from "./types";

export default function PayoutRequestsList({
  pendingPayouts,
  onSelect,
  onRequestAction,
}: {
  pendingPayouts: PayoutRow[];
  onSelect: (payout: PayoutRow) => void;
  onRequestAction: (payout: PayoutRow, action: "approve" | "reject", reason?: string) => void;
}) {
  return (
    <div>
      {pendingPayouts.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "rgba(29,158,117,0.5)" }} />
          <h3 className="font-syne font-bold text-lg text-white mb-1">Aucune demande</h3>
          <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Toutes les demandes ont été traitées</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingPayouts.map((payout) => (
            <div
              key={payout.id}
              className="rounded-xl p-4 flex items-center justify-between cursor-pointer transition"
              style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}
              onClick={() => onSelect(payout)}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#141420"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#111128"; }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-dm text-sm font-bold text-white" style={{ background: "#D35400" }}>
                  {payout.users?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="font-dm text-sm font-semibold text-white">{payout.users?.name || "—"}</div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {payout.users?.phone || ""} · {payout.provider === "wave" ? "Wave" : "Orange Money"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-syne font-bold text-lg text-white">{formatFCFA(payout.amount)}</div>
                <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onRequestAction(payout, "approve"); }}
                  className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                  style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                >
                  Approuver
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(payout); }}
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
    </div>
  );
}
