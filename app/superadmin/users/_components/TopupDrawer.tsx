"use client";

import { formatFCFA } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import FormField from "./FormField";
import type { UserRow } from "./types";

export default function TopupDrawer({
  open,
  onClose,
  user,
  amount,
  onAmountChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  user: UserRow | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Recharger le solde"
      subtitle={user ? getBrandDisplayName(user) : undefined}
    >
      {user && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-dm text-sm font-bold text-white" style={{ background: "#D35400" }}>
                {getBrandDisplayName(user).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-dm text-sm font-semibold text-white">{getBrandDisplayName(user)}</div>
                <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{user.phone || user.city || "marque"}</div>
              </div>
            </div>
            <div className="flex justify-between font-dm text-sm">
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Solde actuel</span>
              <span className="font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA(user.balance || 0)}</span>
            </div>
          </div>

          <FormField label="Montant (FCFA)">
            <input type="number" value={amount} onChange={(e) => onAmountChange(e.target.value)}
              placeholder="Ex : 50 000" min="100"
              className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </FormField>

          {amount && parseInt(amount) > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
              <div className="flex justify-between font-dm text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Nouveau solde</span>
                <span className="font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA((user.balance || 0) + parseInt(amount))}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {[5000, 10000, 25000, 50000, 100000].map((amt) => (
              <button
                key={amt}
                onClick={() => onAmountChange(amt.toString())}
                className="flex-1 py-2 rounded-lg font-dm text-xs font-bold transition"
                style={{
                  background: amount === amt.toString() ? "#D35400" : "rgba(255,255,255,0.04)",
                  color: amount === amt.toString() ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                {amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
          </div>

          <button onClick={onSubmit} disabled={submitting || !amount || parseInt(amount) <= 0}
            className="w-full py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "#D35400", color: "#fff" }}>
            {submitting ? "Rechargement..." : `Recharger ${amount ? formatFCFA(parseInt(amount)) : ""}`}
          </button>
        </div>
      )}
    </AdminDrawer>
  );
}
