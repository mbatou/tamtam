"use client";

import { formatFCFA } from "@/lib/utils";
import { StuckEarningsData } from "./types";

export default function FixConfirmModal({
  stuckData,
  fixingEarnings,
  onCancel,
  onConfirm,
}: {
  stuckData: StuckEarningsData | null;
  fixingEarnings: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}>
        <h3 className="font-syne font-bold text-lg text-white mb-4">Confirmer le déblocage</h3>
        <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="font-syne font-bold text-2xl text-white">{stuckData?.stuck || 0}</div>
              <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>écho(s)</div>
            </div>
            <div className="text-center">
              <div className="font-syne font-bold text-2xl" style={{ color: "#5DCAA5" }}>{formatFCFA(stuckData?.total_fcfa || 0)}</div>
              <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>à débloquer</div>
            </div>
          </div>
        </div>
        <p className="font-dm text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          Chaque écho sera notifié par email et WhatsApp.
        </p>
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
            disabled={fixingEarnings}
            className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "rgba(29,158,117,0.15)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
          >
            {fixingEarnings ? "Déblocage..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
