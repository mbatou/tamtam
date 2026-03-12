"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface PayoutRow {
  id: string;
  echo_id: string;
  amount: number;
  provider: string;
  status: string;
  created_at: string;
  users: { name: string; phone: string | null } | null;
}

interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  provider: string;
  created_at: string;
  users: { name: string } | null;
}

interface FinanceData {
  grossRevenue: number;
  platformCut: number;
  feePercent: number;
  sentTotal: number;
  pendingTotal: number;
  payouts: PayoutRow[];
  payments: PaymentRow[];
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"payouts" | "payments">("payouts");
  const { showToast, ToastComponent } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/finance");
      const json = await res.json();
      setData(json);
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

  async function handlePayout(payoutId: string, action: "approve" | "reject", reason?: string) {
    try {
      const res = await fetch("/api/superadmin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId, action, reason }),
      });
      if (res.ok) {
        showToast(action === "approve" ? "Paiement envoyé" : "Paiement refusé", action === "approve" ? "success" : "info");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const echoShare = data.grossRevenue - data.platformCut;
  const total = data.grossRevenue || 1;
  const platformPct = (data.platformCut / total) * 100;
  const paidPct = (data.sentTotal / total) * 100;
  const remainingPct = Math.max(0, 100 - platformPct - paidPct);

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">Contrôle financier</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenu brut" value={formatFCFA(data.grossRevenue)} accent="orange" />
        <StatCard label={`Commission (${data.feePercent}%)`} value={formatFCFA(data.platformCut)} accent="teal" />
        <StatCard label="Payé aux Échos" value={formatFCFA(data.sentTotal)} accent="purple" />
        <StatCard label="En attente" value={formatFCFA(data.pendingTotal)} accent="red" />
      </div>

      {/* Reconciliation Bar */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-sm font-bold mb-4">Répartition des revenus</h3>
        <div className="flex h-6 rounded-full overflow-hidden mb-3">
          <div className="bg-gradient-primary" style={{ width: `${platformPct}%` }} />
          <div className="bg-accent" style={{ width: `${paidPct}%` }} />
          <div className="bg-white/10" style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-primary" />
            <span className="text-white/50">Plateforme ({Math.round(platformPct)}%)</span>
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
        <div className="mt-3 text-xs text-white/30">
          Part Échos: {formatFCFA(echoShare)} · Déjà payé: {formatFCFA(data.sentTotal)} · En attente: {formatFCFA(data.pendingTotal)}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("payouts")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            tab === "payouts" ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
          }`}
        >
          Paiements Échos ({data.payouts.length})
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            tab === "payments" ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
          }`}
        >
          Recharges Batteurs ({data.payments.length})
        </button>
      </div>

      {tab === "payouts" && (
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
              {data.payouts.map((payout) => (
                <tr key={payout.id} className="border-b border-white/5">
                  <td className="py-3 text-xs text-white/50">
                    {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-sm">{payout.users?.name || "—"}</div>
                    <div className="text-xs text-white/30">{payout.users?.phone || ""}</div>
                  </td>
                  <td className="py-3 font-bold">{formatFCFA(payout.amount)}</td>
                  <td className="py-3 hidden md:table-cell text-xs">
                    {payout.provider === "wave" ? "Wave" : "Orange Money"}
                  </td>
                  <td className="py-3">
                    <Badge status={payout.status} />
                  </td>
                  <td className="py-3">
                    {payout.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePayout(payout.id, "approve")}
                          className="text-xs font-bold text-accent hover:text-accent/80"
                        >
                          Envoyer
                        </button>
                        <span className="text-white/10">|</span>
                        <button
                          onClick={() => handlePayout(payout.id, "reject")}
                          className="text-xs font-bold text-red-400 hover:text-red-300"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {data.payouts.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-white/30 text-sm">Aucun paiement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payments" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/30 border-b border-white/5">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Batteur</th>
                <th className="pb-3 font-semibold">Montant</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Méthode</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id} className="border-b border-white/5">
                  <td className="py-3 text-xs text-white/50">
                    {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 font-semibold text-sm">{payment.users?.name || "—"}</td>
                  <td className="py-3 font-bold">{formatFCFA(payment.amount)}</td>
                  <td className="py-3 hidden md:table-cell text-xs">{payment.provider || "—"}</td>
                  <td className="py-3">
                    <Badge status={payment.status} />
                  </td>
                </tr>
              ))}
              {data.payments.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-white/30 text-sm">Aucune recharge</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
