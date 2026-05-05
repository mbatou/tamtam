"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

export default function AdminWalletWrapper() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-5xl space-y-4">
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

interface Campaign {
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

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  type_label: string;
  description: string | null;
  status: string;
  source_id: string | null;
  source_type: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_recharges_fcfa: number;
  total_spend_fcfa: number;
  total_refunds_fcfa: number;
  net_amount_fcfa: number;
  campaign_count: number;
  click_count: number;
  status: string;
  created_at: string;
  line_items: InvoiceLineItem[];
}

interface InvoiceLineItem {
  id: string;
  campaign_name: string;
  objective: string | null;
  clicks: number;
  leads: number;
  cpc_fcfa: number | null;
  cpl_fcfa: number | null;
  total_spend_fcfa: number;
}

type Tab = "overview" | "transactions" | "invoices";

function AdminWalletPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalSpent: 0, totalBudget: 0, activeCampaigns: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [showRecharge, setShowRecharge] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transactions tab state
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txFilter, setTxFilter] = useState("");
  const [txFrom, setTxFrom] = useState("");
  const [txTo, setTxTo] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  // Invoices tab state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Spending data for mini chart
  const [spendingData, setSpendingData] = useState<{ date: string; amount: number }[]>([]);

  const loadWallet = useCallback(async () => {
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
      setCampaigns(data.campaigns || []);
    }

    if (paymentsRes.ok) {
      const paymentsData = await paymentsRes.json();
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    }

    setLoading(false);
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (txFilter) params.set("type", txFilter);
    if (txFrom) params.set("from", txFrom);
    if (txTo) params.set("to", txTo);

    const res = await fetch(`/api/brand/wallet/transactions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTxs(data.transactions || []);
      setTxPage(data.page);
      setTxPages(data.pages);
      setTxTotal(data.total);
    }
    setTxLoading(false);
  }, [txFilter, txFrom, txTo]);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    const res = await fetch("/api/brand/wallet/invoices");
    if (res.ok) {
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    }
    setInvoicesLoading(false);
  }, []);

  useEffect(() => {
    loadWallet();

    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setSuccessMsg(t("admin.wallet.paymentRegistered"));
      window.history.replaceState({}, "", "/admin/wallet");
      const interval = setInterval(() => loadWallet(), 5000);
      setTimeout(() => clearInterval(interval), 60000);
    } else if (paymentStatus === "cancelled" || paymentStatus === "error") {
      setPayError(t("admin.wallet.paymentCancelled"));
      window.history.replaceState({}, "", "/admin/wallet");
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") loadWallet();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [searchParams, loadWallet, t]);

  useEffect(() => {
    if (tab === "transactions") loadTransactions(1);
  }, [tab, txFilter, txFrom, txTo, loadTransactions]);

  useEffect(() => {
    if (tab === "invoices") loadInvoices();
  }, [tab, loadInvoices]);

  // Build spending chart data from payments + campaigns
  useEffect(() => {
    if (!payments.length && !campaigns.length) return;
    const last30 = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last30.set(d.toISOString().slice(0, 10), 0);
    }
    for (const c of campaigns) {
      const day = c.created_at?.slice(0, 10);
      if (day && last30.has(day)) {
        last30.set(day, (last30.get(day) || 0) + c.spent);
      }
    }
    setSpendingData(Array.from(last30, ([date, amount]) => ({ date, amount })));
  }, [payments, campaigns]);

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
        body: JSON.stringify({ amount, payment_method: "Wave" }),
      });
      const data = await res.json();
      if (data.success && data.redirect_url) {
        trackEvent.brandRecharge(amount, "Wave");
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
      <div className="p-6 max-w-5xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("admin.wallet.title")}</h1>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-accent/60 hover:text-accent ml-4">✕</button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 glass-card p-1 w-fit">
        {([
          { key: "overview", label: "Vue d'ensemble" },
          { key: "transactions", label: "Transactions" },
          { key: "invoices", label: "Factures" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.key
                ? "bg-gradient-secondary text-white shadow-lg"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === TAB 1: OVERVIEW === */}
      {tab === "overview" && (
        <>
          {/* Hero balance */}
          <div className="glass-card p-8 mb-6 text-center">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Solde disponible</p>
            <p className="text-5xl font-black text-primary">{formatFCFA(wallet.balance)}</p>
            <button
              onClick={() => setShowRecharge(true)}
              className="mt-4 px-8 py-3 rounded-btn font-bold text-white bg-gradient-secondary hover:opacity-90 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Recharger
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-5">
              <p className="text-xs text-white/40 font-semibold mb-1">Total rechargé</p>
              <p className="text-2xl font-bold text-accent">
                {formatFCFA(payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0))}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-white/40 font-semibold mb-1">Total dépensé</p>
              <p className="text-2xl font-bold text-primary">{formatFCFA(wallet.totalSpent)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-white/40 font-semibold mb-1">Campagnes financées</p>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
          </div>

          {/* Mini spending chart */}
          {spendingData.length > 0 && spendingData.some(d => d.amount > 0) && (
            <div className="glass-card p-5 mb-6">
              <p className="text-xs text-white/40 font-semibold mb-3">Dépenses — 30 derniers jours</p>
              <SpendingChart data={spendingData} />
            </div>
          )}

          {/* Recharge section */}
          <div className="glass-card p-6 mb-6">
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
            <div className="glass-card overflow-hidden mb-6">
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
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-5 py-3 text-white/40 text-xs">{timeAgo(payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaign spending */}
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
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-semibold">{c.title}</td>
                      <td className="px-5 py-3 text-white/60">{formatFCFA(c.budget)}</td>
                      <td className={`px-5 py-3 font-semibold ${c.spent >= c.budget ? "text-emerald-400" : "text-white/70"}`}>
                        {formatFCFA(Math.min(c.spent, c.budget))}
                        {c.spent >= c.budget && " ✓"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge-${c.status}`}>
                          {c.status === "active" ? t("common.active") : c.status === "paused" ? t("common.paused") : c.status === "completed" ? t("common.finished") : t("admin.campaigns.draft")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white/40 text-xs">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {campaigns.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-white/30 text-sm">{t("admin.wallet.noCampaign")}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* === TAB 2: TRANSACTIONS === */}
      {tab === "transactions" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={txFilter}
              onChange={(e) => { setTxFilter(e.target.value); setTxPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition"
            >
              <option value="">Toutes les transactions</option>
              <option value="wallet_recharge">Recharges</option>
              <option value="campaign_budget_debit">Dépenses campagne</option>
              <option value="campaign_budget_refund">Remboursements</option>
              <option value="manual_credit">Crédits manuels</option>
              <option value="manual_debit">Débits manuels</option>
            </select>
            <input
              type="date"
              value={txFrom}
              onChange={(e) => { setTxFrom(e.target.value); setTxPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition"
              placeholder="Du"
            />
            <input
              type="date"
              value={txTo}
              onChange={(e) => { setTxTo(e.target.value); setTxPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition"
              placeholder="Au"
            />
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (txFilter) params.set("type", txFilter);
                if (txFrom) params.set("from", txFrom);
                if (txTo) params.set("to", txTo);
                window.open(`/api/brand/wallet/transactions/export?${params}`, "_blank");
              }}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:border-white/20 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              CSV
            </button>
          </div>

          {/* Transaction count */}
          <p className="text-xs text-white/30 mb-3">{txTotal} transaction{txTotal !== 1 ? "s" : ""}</p>

          {/* Transaction table */}
          <div className="glass-card overflow-hidden mb-4">
            {txLoading ? (
              <div className="p-8 text-center">
                <div className="skeleton h-6 w-32 rounded-xl mx-auto mb-3" />
                <div className="skeleton h-4 w-48 rounded-xl mx-auto" />
              </div>
            ) : txs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/30 text-sm">Aucune transaction trouvée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5" style={{ background: "rgba(26,26,46,0.8)" }}>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Date</th>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Description</th>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Type</th>
                      <th className="text-right px-5 py-3 font-semibold text-white/40 text-xs uppercase">Montant</th>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Statut</th>
                      <th className="text-center px-5 py-3 font-semibold text-white/40 text-xs uppercase">Reçu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx) => (
                      <>
                        <tr
                          key={tx.id}
                          className="border-b border-white/[0.06] hover:bg-white/[0.03] cursor-pointer transition"
                          onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                        >
                          <td className="px-5 py-3 text-white/50 text-xs whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-5 py-3 text-white/80">
                            {tx.description || tx.type_label}
                          </td>
                          <td className="px-5 py-3">
                            <TxTypeBadge type={tx.type} label={tx.type_label} />
                          </td>
                          <td className="px-5 py-3 text-right font-bold whitespace-nowrap">
                            <span className={tx.amount >= 0 ? "text-emerald-400" : "text-primary"}>
                              {tx.amount >= 0 ? "+" : ""}{formatFCFA(tx.amount)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <TxStatusBadge status={tx.status} />
                          </td>
                          <td className="px-5 py-3 text-center">
                            {(tx.type === "wallet_recharge" || tx.status === "completed") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/api/brand/wallet/transactions/${tx.id}/receipt`, "_blank");
                                }}
                                className="text-white/30 hover:text-white/60 transition"
                                title="Télécharger le reçu"
                              >
                                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedTx === tx.id && (
                          <tr key={`${tx.id}-detail`} className="border-b border-white/[0.06]">
                            <td colSpan={6} className="px-5 py-4 bg-white/[0.02]">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-white/30">ID Transaction</span>
                                  <p className="text-white/60 font-mono mt-0.5">{tx.id.slice(0, 12)}...</p>
                                </div>
                                {tx.source_id && (
                                  <div>
                                    <span className="text-white/30">Référence</span>
                                    <p className="text-white/60 font-mono mt-0.5">{tx.source_id.slice(0, 12)}...</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-white/30">Date exacte</span>
                                  <p className="text-white/60 mt-0.5">
                                    {new Date(tx.created_at).toLocaleString("fr-FR")}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {txPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { setTxPage(txPage - 1); loadTransactions(txPage - 1); }}
                disabled={txPage <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-white/60 disabled:opacity-30 hover:bg-white/10 transition"
              >
                ←
              </button>
              <span className="text-sm text-white/40">
                Page {txPage} / {txPages}
              </span>
              <button
                onClick={() => { setTxPage(txPage + 1); loadTransactions(txPage + 1); }}
                disabled={txPage >= txPages}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-white/60 disabled:opacity-30 hover:bg-white/10 transition"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* === TAB 3: INVOICES === */}
      {tab === "invoices" && (
        <>
          {invoicesLoading ? (
            <div className="glass-card p-8 text-center">
              <div className="skeleton h-6 w-32 rounded-xl mx-auto mb-3" />
              <div className="skeleton h-4 w-48 rounded-xl mx-auto" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-4 opacity-30">📄</div>
              <p className="text-white/40 text-sm">
                Vos factures apparaîtront ici après votre première campagne.
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5" style={{ background: "rgba(26,26,46,0.8)" }}>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">N° Facture</th>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Période</th>
                      <th className="text-right px-5 py-3 font-semibold text-white/40 text-xs uppercase">Total dépensé</th>
                      <th className="text-center px-5 py-3 font-semibold text-white/40 text-xs uppercase">Campagnes</th>
                      <th className="text-left px-5 py-3 font-semibold text-white/40 text-xs uppercase">Statut</th>
                      <th className="text-center px-5 py-3 font-semibold text-white/40 text-xs uppercase">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-white/[0.06] hover:bg-white/[0.03]">
                        <td className="px-5 py-3 font-mono font-semibold text-primary">{inv.invoice_number}</td>
                        <td className="px-5 py-3 text-white/60 text-xs">
                          {new Date(inv.period_start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — {new Date(inv.period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 text-right font-bold">{formatFCFA(inv.total_spend_fcfa)}</td>
                        <td className="px-5 py-3 text-center text-white/60">{inv.campaign_count}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            inv.status === "final" ? "bg-accent/10 text-accent" : "bg-orange-500/10 text-orange-400"
                          }`}>
                            {inv.status === "final" ? "Finalisée" : "Brouillon"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => window.open(`/api/brand/wallet/invoices/${inv.id}/pdf`, "_blank")}
                            className="text-white/30 hover:text-white/60 transition"
                            title="Télécharger la facture PDF"
                          >
                            <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// === Sub-components ===

function TxTypeBadge({ type, label }: { type: string; label: string }) {
  const colors: Record<string, string> = {
    wallet_recharge: "bg-emerald-500/10 text-emerald-400",
    campaign_budget_debit: "bg-primary/10 text-primary",
    campaign_budget_refund: "bg-blue-500/10 text-blue-400",
    manual_credit: "bg-emerald-500/10 text-emerald-400",
    manual_debit: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[type] || "bg-white/5 text-white/40"}`}>
      {label}
    </span>
  );
}

function TxStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    completed: { bg: "bg-accent/10 text-accent", label: "Complété" },
    pending: { bg: "bg-orange-500/10 text-orange-400", label: "En attente" },
    failed: { bg: "bg-red-500/10 text-red-400", label: "Échoué" },
    refunded: { bg: "bg-white/10 text-white/60", label: "Remboursé" },
  };
  const s = map[status] || map.completed;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
      {s.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "completed") return <span className="text-emerald-400 font-semibold text-xs">✓ Validé</span>;
  if (status === "pending") return <span className="text-orange-400 font-semibold text-xs">⏳ En attente</span>;
  if (status === "cancelled") return <span className="text-white/30 font-semibold text-xs">Annulé</span>;
  return <span className="text-red-400 font-semibold text-xs">✕ Échoué</span>;
}

function SpendingChart({ data }: { data: { date: string; amount: number }[] }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="flex items-end gap-[2px] h-20">
      {data.map((d, i) => {
        const h = Math.max((d.amount / max) * 100, d.amount > 0 ? 4 : 1);
        return (
          <div
            key={i}
            className="flex-1 rounded-t transition-all group relative"
            style={{ height: `${h}%`, background: d.amount > 0 ? "linear-gradient(to top, #D35400, #E67E22)" : "rgba(255,255,255,0.05)" }}
            title={`${d.date}: ${d.amount.toLocaleString("fr-FR")} FCFA`}
          >
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              {d.date.slice(5)}: {d.amount.toLocaleString("fr-FR")} F
            </div>
          </div>
        );
      })}
    </div>
  );
}
