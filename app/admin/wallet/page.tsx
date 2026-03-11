"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";

interface WalletData {
  balance: number;
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

export default function AdminWalletPage() {
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalSpent: 0, totalBudget: 0, activeCampaigns: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [showRecharge, setShowRecharge] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setWallet({
        balance: (data.budgetTotal || 0) - (data.budgetSpent || 0),
        totalSpent: data.budgetSpent || 0,
        totalBudget: data.budgetTotal || 0,
        activeCampaigns: data.activeRythmes || 0,
      });
      setTransactions(data.campaigns || []);
    }
    setLoading(false);
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
        <button onClick={() => setShowRecharge(!showRecharge)} className="btn-primary text-sm">
          {showRecharge ? "Annuler" : "Recharger"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Solde disponible</p>
          <p className="text-xl font-bold text-primary">{formatFCFA(wallet.balance)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Total dépensé</p>
          <p className="text-xl font-bold text-accent">{formatFCFA(wallet.totalSpent)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Budget total</p>
          <p className="text-xl font-bold">{formatFCFA(wallet.totalBudget)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">Rythmes actifs</p>
          <p className="text-xl font-bold">{wallet.activeCampaigns}</p>
        </div>
      </div>

      {showRecharge && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Recharger le portefeuille</h2>
          <p className="text-sm text-white/50 mb-4">
            Sélectionnez un montant ou saisissez un montant personnalisé pour recharger votre portefeuille.
          </p>
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
          <div className="flex gap-3">
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder="Montant en FCFA"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
            <button
              disabled={!rechargeAmount || parseInt(rechargeAmount) <= 0}
              className="btn-primary disabled:opacity-40 whitespace-nowrap"
            >
              Payer {rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : ""}
            </button>
          </div>
          <p className="text-xs text-white/30 mt-3">
            Paiement via Wave ou Orange Money. Le solde sera crédité instantanément.
          </p>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold">Historique des dépenses</h2>
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
            <p className="text-white/30 text-sm">Aucune transaction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
