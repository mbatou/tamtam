"use client";

import { formatFCFA } from "@/lib/utils";
import { BrandUser } from "./types";

export default function TopupModal({
  user,
  amount,
  onAmountChange,
  toppingUp,
  onConfirm,
  onCancel,
  onClose,
}: {
  user: BrandUser;
  amount: string;
  onAmountChange: (value: string) => void;
  toppingUp: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <h3 className="font-syne font-bold text-white mb-1">Recharger le compte</h3>
        <p className="font-dm text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{user.company_name || user.name}</p>
        <div className="rounded-lg p-3 mb-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
          <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Solde actuel</span>
          <span className="font-syne font-bold text-white">{formatFCFA(user.balance || 0)}</span>
        </div>
        <input type="number" value={amount} onChange={e => onAmountChange(e.target.value)}
          placeholder="Montant (FCFA)" min="0"
          className="w-full rounded-xl px-4 py-3 font-dm text-sm mb-3 focus:outline-none transition"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        <div className="flex gap-2 mb-4">
          {[5000, 10000, 25000, 50000].map(amt => (
            <button key={amt} onClick={() => onAmountChange(String(amt))}
              className="flex-1 py-2 rounded-lg font-dm text-xs font-bold transition"
              style={{ background: amount === String(amt) ? "#D35400" : "rgba(255,255,255,0.04)", color: amount === String(amt) ? "#fff" : "rgba(255,255,255,0.4)" }}>
              {amt / 1000}k
            </button>
          ))}
        </div>
        {amount && parseInt(amount) > 0 && (
          <div className="rounded-lg p-3 mb-4 flex items-center justify-between" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
            <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nouveau solde</span>
            <span className="font-syne font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA((user.balance || 0) + parseInt(amount))}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
          <button onClick={onConfirm} disabled={toppingUp || !amount || parseInt(amount) <= 0}
            className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "#D35400", color: "#fff" }}>
            {toppingUp ? "Rechargement..." : `Recharger ${amount ? formatFCFA(parseInt(amount)) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
