"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";

export default function AdminWalletWrapper() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-4xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    }>
      <AdminWalletPage />
    </Suspense>
  );
}

interface WalletData {
  balance: number;
  totalRecharged: number;
  totalSpent: number;
  totalBudget: number;
  activeCampaigns: number;
}

interface Transaction {
  id: string;
  title: string;
  budget: number;
  spent: number;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  amount: number;
  ref_command: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  completed_at: string | null;
}

const PAYMENT_METHODS = [
  { id: "Orange Money", label: "Orange Money", icon: "🟠" },
  { id: "Wave", label: "Wave", icon: "🔵" },
  { id: "Free Money", label: "Free Money", icon: "🟢" },
  { id: "Carte Bancaire", label: "Carte Bancaire", icon: "💳" },
];

function AdminWalletPage() {
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalRecharged: 0, totalSpent: 0, totalBudget: 0, activeCampaigns: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Wave");
  const [showRecharge, setShowRecharge] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadWallet();

    // Handle PayTech redirect
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setSuccessMsg("Paiement réussi ! Votre solde sera mis à jour sous peu.");
      window.history.replaceState({}, "", "/admin/wallet");
    } else if (paymentStatus === "cancelled") {
      setPayError("Paiement annulé.");
      window.history.replaceState({}, "", "/admin/wallet");
    }
  }, [searchParams]);

  async function loadWallet() {
    const [statsRes, paymentsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/payments"),
    ]);

    if (statsRes.ok) {
      const data = await statsRes.json();
      setWallet({
        balance: data.walletBalance ?? 0,
        totalRecharged: data.totalRecharged ?? 0,
        totalSpent: data.budgetSpent || 0,
        totalBudget: data.budgetTotal || 0,
        activeCampaigns: data.activeRythmes || 0,
      });
      setTransactions(data.campaigns || []);
    }

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json();
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    }

    setLoading(false);
  }

  async function handlePayment() {
    const amount = parseInt(rechargeAmount);
    if (!amount || amount < 100) {
      setPayError("Montant minimum: 100 FCFA");
      return;
    }

    setPaying(true);
    setPayError(null);

    try {
      const res = await fetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        setPayError(data.error || "Erreur lors de l'initialisation du paiement");
        setPaying(false);
      }
    } catch {
      setPayError("Erreur de connexion. Veuillez réessayer.");
      setPaying(false);
    }
  }

  const presetAmounts = [5000, 10000, 25000, 50000, 100000];

  if (loading) {
    return (
      <div className="p-6 max-w-4xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Portefeuille</h1>
        <button onClick={() => { setShowRecharge(!showRecharge); setPayError(null); setSuccessMsg(null); }} className="btn-primary text-sm">
          {showRecharge ? "Annuler" : "Recharger"}
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-accent/60 hover:text-accent ml-4">✕</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Solde disponible</p>
          <p className="text-xl font-bold text-primary">{formatFCFA(wallet.totalRecharged)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Total dépensé</p>
          <p className="text-xl font-bold text-accent">{formatFCFA(wallet.totalSpent)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Total rechargé</p>
          <p className="text-xl font-bold">{formatFCFA(wallet.totalRecharged)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Rythmes actifs</p>
          <p className="text-xl font-bold">{wallet.activeCampaigns}</p>
        </div>
      </div>

      {showRecharge && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Recharger le portefeuille</h2>

          {/* Amount selection */}
          <p className="text-xs font-semibold text-white/40 mb-2">Montant</p>
          <div className="flex flex-wrap gap-3 mb-4">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setRechargeAmount(amount.toString())}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  rechargeAmount === amount.toString()
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                {formatFCFA(amount)}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            placeholder="Ou saisissez un montant personnalisé"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition mb-6"
          />

          {/* Payment method selection */}
          <p className="text-xs font-semibold text-white/40 mb-2">Moyen de paiement</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  paymentMethod === m.id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <p className="font-semibold mt-2 text-sm">{m.label}</p>
              </button>
            ))}
          </div>

          {payError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {payError}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
            className="btn-primary w-full text-center disabled:opacity-40"
          >
            {paying
              ? "Redirection vers PayTech..."
              : `Payer ${rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : ""} via ${paymentMethod}`}
          </button>

          <p className="text-xs text-white/30 mt-3 text-center">
            Vous serez redirigé vers PayTech pour finaliser le paiement.
          </p>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="glass-card overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold">Historique des recharges</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Montant</th>
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Moyen</th>
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Statut</th>
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-bold">{formatFCFA(payment.amount)}</td>
                    <td className="px-5 py-3 text-white/60">{payment.payment_method || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={
                        payment.status === "completed"
                          ? "text-accent font-semibold"
                          : payment.status === "pending"
                          ? "text-primary-light font-semibold"
                          : payment.status === "cancelled"
                          ? "text-white/30"
                          : "text-red-400 font-semibold"
                      }>
                        {payment.status === "completed"
                          ? "Complété"
                          : payment.status === "pending"
                          ? "En attente"
                          : payment.status === "cancelled"
                          ? "Annulé"
                          : "Échoué"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">{timeAgo(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign spending history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold">Dépenses par campagne</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Rythme</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Budget</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Dépensé</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Statut</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-semibold">{tx.title}</td>
                  <td className="px-5 py-3 text-white/60">{formatFCFA(tx.budget)}</td>
                  <td className="px-5 py-3 text-accent">{formatFCFA(tx.spent)}</td>
                  <td className="px-5 py-3">
                    <span className={`badge-${tx.status}`}>
                      {tx.status === "active" ? "Actif" : tx.status === "paused" ? "Pausé" : tx.status === "completed" ? "Terminé" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/40 text-xs">
                    {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-white/30 text-sm">Aucune campagne.</p>
          </div>
        )}
      </div>
    </div>
  );
}
