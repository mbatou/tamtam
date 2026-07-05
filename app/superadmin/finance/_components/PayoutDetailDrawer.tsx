"use client";

import { formatFCFA } from "@/lib/utils";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { PayoutRow } from "./types";

export default function PayoutDetailDrawer({
  selectedPayout,
  rejectReason,
  onRejectReasonChange,
  onClose,
  onRequestAction,
}: {
  selectedPayout: PayoutRow | null;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onClose: () => void;
  onRequestAction: (payout: PayoutRow, action: "approve" | "reject", reason?: string) => void;
}) {
  return (
    <AdminDrawer
      open={!!selectedPayout}
      onClose={onClose}
      title="Demande de retrait"
      subtitle={selectedPayout?.users?.name || undefined}
    >
      {selectedPayout && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-dm text-xl font-bold text-white" style={{ background: "#D35400" }}>
              {selectedPayout.users?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <h3 className="font-syne font-bold text-lg text-white">{selectedPayout.users?.name || "—"}</h3>
              <p className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{selectedPayout.users?.phone || ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="font-syne font-bold text-2xl text-white">{formatFCFA(selectedPayout.amount)}</div>
              <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Montant demandé</div>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="font-syne font-bold text-lg text-white">{selectedPayout.provider === "wave" ? "Wave" : "Orange Money"}</div>
              <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Fournisseur</div>
            </div>
          </div>

          <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Demandé le {new Date(selectedPayout.created_at).toLocaleString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div className="space-y-3 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => onRequestAction(selectedPayout, "approve")}
              className="w-full py-3 rounded-xl font-dm text-sm font-bold transition"
              style={{ background: "rgba(29,158,117,0.12)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
            >
              Approuver le retrait
            </button>

            <textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              placeholder="Raison du rejet (optionnel)..."
              className="w-full rounded-xl px-4 py-3 font-dm text-sm resize-none h-16 focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
            <button
              onClick={() => onRequestAction(selectedPayout, "reject", rejectReason)}
              className="w-full py-2.5 rounded-xl font-dm text-sm font-bold transition"
              style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
            >
              Rejeter
            </button>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}
