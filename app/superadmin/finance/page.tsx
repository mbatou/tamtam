"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface PayoutRow {
  id: string;
  amount: number;
  provider: string;
  status: string;
  created_at: string;
  users: { name: string; phone: string | null; status: string | null };
}

export default function FinancePage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [stats, setStats] = useState({ gross: 0, commission: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const [campaignsRes, payoutsRes, paidRes, pendingRes] = await Promise.all([
      supabase.from("campaigns").select("spent"),
      supabase
        .from("payouts")
        .select("*, users(name, phone, status)")
        .order("created_at", { ascending: false }),
      supabase.from("payouts").select("amount").eq("status", "sent"),
      supabase.from("payouts").select("amount").eq("status", "pending"),
    ]);

    const gross = (campaignsRes.data || []).reduce((sum: number, c: { spent: number }) => sum + c.spent, 0);
    const paid = (paidRes.data || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const pending = (pendingRes.data || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    setStats({
      gross,
      commission: Math.floor(gross * 0.25),
      paid,
      pending,
    });

    setPayouts((payoutsRes.data || []) as unknown as PayoutRow[]);
    setLoading(false);
  }

  async function handlePayout(id: string, action: "sent" | "failed") {
    try {
      const res = await fetch(`/api/superadmin/payouts/${id}/${action === "sent" ? "approve" : "reject"}`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(action === "sent" ? "Paiement envoyé" : "Paiement refusé", action === "sent" ? "success" : "info");
        loadData();
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Reconciliation bar
  const total = stats.commission + stats.paid + Math.max(0, stats.gross * 0.75 - stats.paid);
  const commissionPct = total > 0 ? (stats.commission / total) * 100 : 0;
  const paidPct = total > 0 ? (stats.paid / total) * 100 : 0;
  const remainingPct = 100 - commissionPct - paidPct;

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">💰 Contrôle financier</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenu brut" value={formatFCFA(stats.gross)} accent="orange" />
        <StatCard label="Commission (25%)" value={formatFCFA(stats.commission)} accent="teal" />
        <StatCard label="Payé aux Échos" value={formatFCFA(stats.paid)} accent="purple" />
        <StatCard label="En attente" value={formatFCFA(stats.pending)} accent="red" />
      </div>

      {/* Reconciliation Bar */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-sm font-bold mb-4">Répartition des revenus</h3>
        <div className="flex h-6 rounded-full overflow-hidden mb-3">
          <div className="bg-gradient-primary" style={{ width: `${commissionPct}%` }} />
          <div className="bg-accent" style={{ width: `${paidPct}%` }} />
          <div className="bg-white/10" style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-primary" />
            <span className="text-white/50">Plateforme ({Math.round(commissionPct)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-white/50">Payé ({Math.round(paidPct)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/10" />
            <span className="text-white/50">Restant ({Math.round(remainingPct)}%)</span>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <h2 className="text-lg font-bold mb-4">Paiements</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/30 border-b border-white/5">
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold">Écho</th>
              <th className="pb-3 font-semibold">Montant</th>
              <th className="pb-3 font-semibold hidden md:table-cell">Fournisseur</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-b border-white/5">
                <td className="py-3 text-xs text-white/50">
                  {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="py-3">
                  <div className="font-semibold text-sm">{payout.users?.name}</div>
                  <div className="text-xs text-white/30">{payout.users?.phone || ""}</div>
                </td>
                <td className="py-3 font-bold">{formatFCFA(payout.amount)}</td>
                <td className="py-3 hidden md:table-cell text-xs">
                  {payout.provider === "wave" ? "🌊 Wave" : "🟠 Orange Money"}
                </td>
                <td className="py-3">
                  <Badge status={payout.status} />
                </td>
                <td className="py-3">
                  {payout.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePayout(payout.id, "sent")}
                        className="text-xs font-bold text-accent hover:text-accent/80"
                      >
                        Envoyer
                      </button>
                      <span className="text-white/10">|</span>
                      <button
                        onClick={() => handlePayout(payout.id, "failed")}
                        className="text-xs font-bold text-red-400 hover:text-red-300"
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
