"use client";

import { useEffect, useState } from "react";
import { formatFCFA, timeAgo } from "@/lib/utils";
import type { PayoutWithEcho } from "@/lib/types";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutWithEcho[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadPayouts(); }, []);

  async function loadPayouts() {
    const res = await fetch("/api/admin/payouts");
    if (res.ok) {
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data as PayoutWithEcho[] : []);
    }
    setLoading(false);
  }

  async function processPayout(payoutId: string, status: "sent" | "failed") {
    setProcessing(payoutId);
    await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payout_id: payoutId, status }),
    });
    loadPayouts();
    setProcessing(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const processedPayouts = payouts.filter((p) => p.status !== "pending");

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8">Paiements</h1>

      {pendingPayouts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-primary-light">En attente ({pendingPayouts.length})</h2>
          <div className="space-y-3">
            {pendingPayouts.map((payout) => (
              <div key={payout.id} className="glass-card p-5 border-l-4 border-l-primary-light">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold">{payout.users?.name}</p>
                    <p className="text-xs text-white/30">{payout.users?.phone}</p>
                  </div>
                  <p className="text-xl font-black">{formatFCFA(payout.amount)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span>{payout.provider === "wave" ? "Wave" : "Orange Money"}</span>
                    <span>·</span>
                    <span>{timeAgo(payout.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => processPayout(payout.id, "sent")} disabled={processing === payout.id} className="px-4 py-1.5 rounded-xl bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30 transition disabled:opacity-50">
                      Marquer envoyé
                    </button>
                    <button onClick={() => processPayout(payout.id, "failed")} disabled={processing === payout.id} className="px-4 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition disabled:opacity-50">
                      Échoué
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold mb-4">Historique</h2>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Écho</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Montant</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Via</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Statut</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {processedPayouts.map((payout) => (
                <tr key={payout.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-semibold">{payout.users?.name}</td>
                  <td className="px-5 py-4">{formatFCFA(payout.amount)}</td>
                  <td className="px-5 py-4 text-white/60">{payout.provider === "wave" ? "Wave" : "Orange Money"}</td>
                  <td className="px-5 py-4"><span className={`badge-${payout.status}`}>{payout.status === "sent" ? "Envoyé" : "Échoué"}</span></td>
                  <td className="px-5 py-4 text-white/40">{timeAgo(payout.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {processedPayouts.length === 0 && <div className="p-8 text-center"><p className="text-white/30 text-sm">Aucun paiement traité.</p></div>}
      </div>
    </div>
  );
}
