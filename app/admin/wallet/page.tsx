"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

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

// PayTech payment methods (commented out - using Wave link for now)
// const PAYMENT_METHODS = [
//   { id: "Orange Money", label: "Orange Money", icon: "🟠" },
//   { id: "Wave", label: "Wave", icon: "🔵" },
//   { id: "Free Money", label: "Free Money", icon: "🟢" },
//   { id: "Carte Bancaire", label: "Carte Bancaire", icon: "💳" },
// ];

function AdminWalletPage() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalSpent: 0, totalBudget: 0, activeCampaigns: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [paymentMethod] = useState("Wave");
  const [showRecharge, setShowRecharge] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadWallet();

    // Handle redirect params (legacy PayTech / future use)
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setSuccessMsg(t("admin.wallet.paymentRegistered"));
      window.history.replaceState({}, "", "/admin/wallet");
    } else if (paymentStatus === "cancelled") {
      setPayError(t("admin.wallet.paymentCancelled"));
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
      setPayError(t("admin.wallet.minAmount"));
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
        trackEvent.brandRecharge(amount, paymentMethod);
        // Open Wave payment link in new tab
        window.open(data.redirect_url, "_blank");
        setSuccessMsg(t("admin.wallet.finalizeWave"));
        setShowRecharge(false);
        setPaying(false);
        setRechargeAmount("");
        loadWallet();
      } else {
        setPayError(data.error || t("common.error"));
        setPaying(false);
      }
    } catch {
      setPayError(t("common.networkRetry"));
      setPaying(false);
    }
  }

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
        <h1 className="text-2xl font-bold">{t("admin.wallet.title")}</h1>
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
          <p className="text-xs text-white/40 font-semibold mb-1">{t("admin.wallet.availableBalance")}</p>
          <p className="text-xl font-bold text-primary">{formatFCFA(wallet.balance)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">{t("admin.wallet.totalSpent")}</p>
          <p className="text-xl font-bold text-accent">{formatFCFA(wallet.totalSpent)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">{t("admin.wallet.totalBudget")}</p>
          <p className="text-xl font-bold">{formatFCFA(wallet.totalBudget)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 font-semibold mb-1">{t("admin.wallet.activeRythmes")}</p>
          <p className="text-xl font-bold">{wallet.activeCampaigns}</p>
        </div>
      </div>

      {/* Quick recharge card — always visible */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">{t("admin.wallet.rechargeTitle")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[10000, 25000, 50000, 100000].map((amount) => (
            <button
              key={amount}
              onClick={() => { setRechargeAmount(amount.toString()); setShowRecharge(true); }}
              className={`border rounded-xl p-4 text-center transition-all ${
                rechargeAmount === amount.toString() && showRecharge
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="text-white font-bold text-lg">{amount.toLocaleString("fr-FR")}</div>
              <div className="text-white/30 text-xs">FCFA</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowRecharge(!showRecharge); setPayError(null); }}
          className="text-white/40 text-sm hover:text-white/60 transition"
        >
          {t("admin.wallet.customAmount")} &rarr;
        </button>

        {showRecharge && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder={t("admin.wallet.customAmount")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition mb-4"
            />

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
                ? t("admin.wallet.openingWave")
                : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : "" })}
            </button>

            <p className="text-xs text-white/30 mt-3 text-center">
              {t("admin.wallet.waveRedirect")}
            </p>
          </div>
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="glass-card overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold">{t("admin.wallet.rechargeHistory")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.amount")}</th>
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("admin.wallet.method")}</th>
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.status")}</th>
                  <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-bold">{formatFCFA(payment.amount)}</td>
                    <td className="px-5 py-3 text-white/60">{payment.payment_method || "—"}</td>
                    <td className="px-5 py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={
                            payment.status === "completed"
                              ? "text-emerald-400 font-semibold"
                              : payment.status === "pending"
                              ? "text-orange-400 font-semibold"
                              : payment.status === "cancelled"
                              ? "text-white/30"
                              : "text-red-400 font-semibold"
                          }>
                            {payment.status === "completed" && "✓ "}
                            {payment.status === "pending" && "⏳ "}
                            {payment.status === "failed" && "✕ "}
                            {payment.status === "completed"
                              ? t("admin.wallet.validated")
                              : payment.status === "pending"
                              ? t("admin.wallet.pendingValidation")
                              : payment.status === "cancelled"
                              ? t("admin.wallet.cancelled")
                              : t("admin.wallet.refused")}
                          </span>
                        </div>
                        {payment.status === "pending" && (
                          <p className="text-[10px] text-white/25 mt-0.5">{t("admin.wallet.pendingExplain")}</p>
                        )}
                        {payment.status === "failed" && (
                          <div>
                            <p className="text-[10px] text-white/25 mt-0.5">{t("admin.wallet.refusedExplain")}</p>
                            <button
                              onClick={() => { setRechargeAmount(payment.amount.toString()); setShowRecharge(true); }}
                              className="text-xs text-primary font-semibold mt-1 hover:underline"
                            >
                              {t("admin.wallet.retry")} &rarr;
                            </button>
                          </div>
                        )}
                        {payment.status === "cancelled" && (
                          <p className="text-[10px] text-white/25 mt-0.5">{t("admin.wallet.cancelledExplain")}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">
                      {timeAgo(payment.created_at)}
                    </td>
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
          <h2 className="text-lg font-bold">{t("admin.wallet.spendByCampaign")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("admin.wallet.rythme")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.budget")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("admin.dashboard.spent")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.status")}</th>
                <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">{t("common.date")}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-semibold">{tx.title}</td>
                  <td className="px-5 py-3 text-white/60">{formatFCFA(tx.budget)}</td>
                  <td className={`px-5 py-3 font-semibold ${tx.spent >= tx.budget ? "text-emerald-400" : "text-white/70"}`}>
                    {formatFCFA(Math.min(tx.spent, tx.budget))}
                    {tx.spent >= tx.budget && " ✓"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge-${tx.status}`}>
                      {tx.status === "active" ? t("common.active") : tx.status === "paused" ? t("common.paused") : tx.status === "completed" ? t("common.finished") : t("admin.campaigns.draft")}
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
            <p className="text-white/30 text-sm">{t("admin.wallet.noCampaign")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
