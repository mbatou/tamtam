"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from "recharts";

export default function AdminWalletWrapper() {
  return (
    <Suspense fallback={<WalletSkeleton />}>
      <AdminWalletPage />
    </Suspense>
  );
}

function WalletSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-4" style={{ maxWidth: "100%" }}>
      <div className="h-7 w-36 rounded-lg animate-pulse mb-1" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-3 w-48 rounded animate-pulse mb-4" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-2xl h-48 animate-pulse" style={SKEL_CARD} />
        <div className="lg:col-span-5 rounded-2xl h-48 animate-pulse" style={SKEL_CARD} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="rounded-2xl h-20 animate-pulse" style={SKEL_CARD} />)}
      </div>
      <div className="rounded-2xl h-64 animate-pulse" style={SKEL_CARD} />
    </div>
  );
}

const SKEL_CARD = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const CARD = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const INPUT_S = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };
const DIM = "rgba(255,255,255,0.4)";
const DIM2 = "rgba(255,255,255,0.35)";

interface WalletData { balance: number; totalSpent: number; totalBudget: number; activeCampaigns: number }
interface Campaign { id: string; title: string; budget: number; spent: number; status: string; created_at: string }
interface Payment { id: string; amount: number; ref_command: string; status: string; payment_method: string | null; created_at: string; completed_at: string | null }
interface WalletTransaction { id: string; user_id: string; amount: number; type: string; type_label: string; description: string | null; status: string; source_id: string | null; source_type: string | null; created_at: string }
interface Invoice { id: string; invoice_number: string; period_start: string; period_end: string; total_recharges_fcfa: number; total_spend_fcfa: number; total_refunds_fcfa: number; net_amount_fcfa: number; campaign_count: number; click_count: number; status: string; created_at: string; line_items: InvoiceLineItem[] }
interface InvoiceLineItem { id: string; campaign_name: string; objective: string | null; clicks: number; leads: number; cpc_fcfa: number | null; cpl_fcfa: number | null; total_spend_fcfa: number }

type Tab = "transactions" | "spending" | "invoices";

function AdminWalletPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("transactions");
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalSpent: 0, totalBudget: 0, activeCampaigns: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txFilter, setTxFilter] = useState("");
  const [txFrom, setTxFrom] = useState("");
  const [txTo, setTxTo] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [spendingData, setSpendingData] = useState<{ date: string; amount: number }[]>([]);

  const totalRecharged = useMemo(
    () => payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  function getStatusStyle(status: string) {
    switch (status) {
      case "active": return { dot: "#D35400", color: "#D35400", bg: "rgba(211,84,0,0.1)" };
      case "paused": return { dot: "#EAB308", color: "#EAB308", bg: "rgba(234,179,8,0.1)" };
      case "completed": return { dot: "#1D9E75", color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
      case "rejected": return { dot: "#EF4444", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
      default: return { dot: "rgba(255,255,255,0.15)", color: DIM, bg: "rgba(255,255,255,0.04)" };
    }
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = { active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected") };
    return map[status] || status;
  }

  const loadWallet = useCallback(async () => {
    const [statsRes, paymentsRes] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/payments")]);
    if (statsRes.ok) {
      const data = await statsRes.json();
      setWallet({ balance: data.walletBalance ?? 0, totalSpent: data.budgetSpent || 0, totalBudget: data.budgetTotal || 0, activeCampaigns: data.activeRythmes || 0 });
      setCampaigns(data.campaigns || []);
    }
    if (paymentsRes.ok) {
      const d = await paymentsRes.json();
      setPayments(Array.isArray(d) ? d : []);
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
    if (res.ok) { const d = await res.json(); setTxs(d.transactions || []); setTxPage(d.page); setTxPages(d.pages); setTxTotal(d.total); }
    setTxLoading(false);
  }, [txFilter, txFrom, txTo]);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    const res = await fetch("/api/brand/wallet/invoices");
    if (res.ok) { const d = await res.json(); setInvoices(Array.isArray(d) ? d : []); }
    setInvoicesLoading(false);
  }, []);

  useEffect(() => {
    loadWallet();
    const ps = searchParams.get("payment");
    if (ps === "success") {
      setSuccessMsg(t("admin.wallet.paymentRegistered"));
      window.history.replaceState({}, "", "/admin/wallet");
      const interval = setInterval(() => loadWallet(), 5000);
      setTimeout(() => clearInterval(interval), 60000);
    } else if (ps === "cancelled" || ps === "error") {
      setPayError(t("admin.wallet.paymentCancelled"));
      window.history.replaceState({}, "", "/admin/wallet");
    }
    function hvc() { if (document.visibilityState === "visible") loadWallet(); }
    document.addEventListener("visibilitychange", hvc);
    return () => document.removeEventListener("visibilitychange", hvc);
  }, [searchParams, loadWallet, t]);

  useEffect(() => { if (tab === "transactions") loadTransactions(1); }, [tab, txFilter, txFrom, txTo, loadTransactions]);
  useEffect(() => { if (tab === "invoices") loadInvoices(); }, [tab, loadInvoices]);

  useEffect(() => {
    if (!payments.length && !campaigns.length) return;
    const last30 = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); last30.set(d.toISOString().slice(0, 10), 0); }
    for (const c of campaigns) { const day = c.created_at?.slice(0, 10); if (day && last30.has(day)) last30.set(day, (last30.get(day) || 0) + c.spent); }
    setSpendingData(Array.from(last30, ([date, amount]) => ({ date, amount })));
  }, [payments, campaigns]);

  async function handlePayment() {
    const amount = parseInt(rechargeAmount);
    if (!amount || amount < 100) { setPayError(t("admin.wallet.minAmount")); return; }
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

  if (loading) return <WalletSkeleton />;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "transactions",
      label: t("admin.wallet.rechargeHistory"),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
    },
    {
      key: "spending",
      label: t("admin.wallet.spendByCampaign"),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      key: "invoices",
      label: t("admin.wallet.invoiceNumber").replace(/N°\s?/, ""),
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    },
  ];

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold font-syne text-white">{t("admin.wallet.title")}</h1>
        <p className="text-xs font-dm mt-0.5" style={{ color: DIM2 }}>{t("admin.wallet.availableBalance")}</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold font-dm flex items-center justify-between" style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)", color: "#1D9E75" }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-4 hover:opacity-70 transition" style={{ color: "#1D9E75" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* ====== FINPAY-STYLE TWO-COLUMN: Balance (left) + Recharge (right) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
        {/* Left: Balance hero card */}
        <div className="lg:col-span-7 rounded-2xl p-6" style={CARD}>
          <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-3" style={{ color: DIM }}>{t("admin.wallet.availableBalance")}</p>
          <p className="text-4xl lg:text-5xl font-black font-syne leading-none mb-5" style={{ color: "#D35400" }}>
            {formatFCFA(wallet.balance)}
          </p>

          {/* Mini KPIs row inside the balance card */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px] font-dm mb-0.5" style={{ color: DIM2 }}>{t("admin.wallet.totalRecharged")}</p>
              <p className="text-sm font-bold font-syne" style={{ color: "#1D9E75" }}>{formatFCFA(totalRecharged)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px] font-dm mb-0.5" style={{ color: DIM2 }}>{t("admin.wallet.totalSpent")}</p>
              <p className="text-sm font-bold font-syne text-white">{formatFCFA(wallet.totalSpent)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[9px] font-dm mb-0.5" style={{ color: DIM2 }}>{t("admin.wallet.campaignsFunded")}</p>
              <p className="text-sm font-bold font-syne text-white">{campaigns.length}</p>
            </div>
          </div>

          {/* Sparkline under balance */}
          {spendingData.length > 1 && (
            <div className="mt-4 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingData.slice(-14)}>
                  <Line type="monotone" dataKey="amount" stroke="#D35400" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Recharge card — always visible like Finpay "Quick Transfer" */}
        <div className="lg:col-span-5 rounded-2xl p-5" style={CARD}>
          <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-4" style={{ color: DIM }}>{t("admin.wallet.rechargeTitle")}</p>

          {/* Preset amounts */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[10000, 25000, 50000, 100000].map((amount) => {
              const sel = rechargeAmount === amount.toString();
              return (
                <button
                  key={amount}
                  onClick={() => setRechargeAmount(amount.toString())}
                  className="rounded-xl py-3 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: sel ? "rgba(211,84,0,0.1)" : "rgba(255,255,255,0.03)",
                    border: sel ? "1px solid rgba(211,84,0,0.35)" : "0.5px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="font-bold font-syne text-white text-sm">{amount.toLocaleString("fr-FR")}</span>
                  <span className="text-[9px] font-dm ml-1" style={{ color: DIM2 }}>FCFA</span>
                </button>
              );
            })}
          </div>

          {/* Custom amount input */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-dm font-semibold" style={{ color: DIM }}>FCFA</span>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder={t("admin.wallet.customAmount")}
              className="w-full rounded-xl pl-12 pr-4 py-3 text-sm text-white font-syne font-bold focus:outline-none transition placeholder:font-dm placeholder:font-normal placeholder:text-[11px]"
              style={INPUT_S}
            />
          </div>

          {/* Error */}
          {payError && (
            <div className="mb-3 px-3 py-2 rounded-xl text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
              {payError}
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePayment}
            disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30"
            style={{ background: "#D35400" }}
          >
            {paying
              ? t("admin.wallet.openingWave")
              : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : "..." })}
          </button>
          <p className="text-[9px] font-dm mt-2.5 text-center" style={{ color: DIM2 }}>
            {t("admin.wallet.waveRedirect")}
          </p>
        </div>
      </div>

      {/* ====== TAB PILLS — Finpay style ====== */}
      <div className="flex items-center gap-1 mb-5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold font-dm transition-all"
            style={{
              background: tab === tb.key ? "#D35400" : "rgba(255,255,255,0.03)",
              color: tab === tb.key ? "#fff" : DIM,
            }}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {/* ====== TAB CONTENT ====== */}

      {tab === "transactions" && (
        <>
          {/* Filters row */}
          <div className="flex flex-wrap gap-2 mb-3">
            <select value={txFilter} onChange={(e) => { setTxFilter(e.target.value); setTxPage(1); }} className="rounded-xl px-3 py-2 text-[11px] text-white font-dm focus:outline-none cursor-pointer" style={INPUT_S}>
              <option value="" style={{ background: "#111128" }}>{t("admin.wallet.allTransactions")}</option>
              <option value="wallet_recharge" style={{ background: "#111128" }}>{t("admin.wallet.recharges")}</option>
              <option value="campaign_budget_debit" style={{ background: "#111128" }}>{t("admin.wallet.campaignSpending")}</option>
              <option value="campaign_budget_refund" style={{ background: "#111128" }}>{t("admin.wallet.refunds")}</option>
              <option value="manual_credit" style={{ background: "#111128" }}>{t("admin.wallet.manualCredits")}</option>
              <option value="manual_debit" style={{ background: "#111128" }}>{t("admin.wallet.manualDebits")}</option>
            </select>
            <input type="date" value={txFrom} onChange={(e) => { setTxFrom(e.target.value); setTxPage(1); }} className="rounded-xl px-3 py-2 text-[11px] text-white font-dm focus:outline-none" style={INPUT_S} />
            <input type="date" value={txTo} onChange={(e) => { setTxTo(e.target.value); setTxPage(1); }} className="rounded-xl px-3 py-2 text-[11px] text-white font-dm focus:outline-none" style={INPUT_S} />
            <button
              onClick={() => { const p = new URLSearchParams(); if (txFilter) p.set("type", txFilter); if (txFrom) p.set("from", txFrom); if (txTo) p.set("to", txTo); window.open(`/api/brand/wallet/transactions/export?${p}`, "_blank"); }}
              className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold font-dm transition-all hover:opacity-80 active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
          </div>

          <p className="text-[10px] font-dm mb-3" style={{ color: DIM2 }}>{txTotal} transaction{txTotal !== 1 ? "s" : ""}</p>

          {/* Finpay-style transaction list */}
          <div className="rounded-2xl overflow-hidden mb-4" style={CARD}>
            {txLoading ? (
              <div className="p-10 text-center space-y-3">
                <div className="h-5 w-32 rounded-lg animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
              </div>
            ) : txs.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xs font-dm" style={{ color: DIM2 }}>{t("admin.wallet.noTransactions")}</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {txs.map((tx) => (
                  <TxItem key={tx.id} tx={tx} expanded={expandedTx === tx.id} onToggle={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)} />
                ))}
              </div>
            )}
          </div>

          {txPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setTxPage(txPage - 1); loadTransactions(txPage - 1); }} disabled={txPage <= 1} className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>←</button>
              <span className="text-[11px] font-dm" style={{ color: DIM }}>Page {txPage} / {txPages}</span>
              <button onClick={() => { setTxPage(txPage + 1); loadTransactions(txPage + 1); }} disabled={txPage >= txPages} className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>→</button>
            </div>
          )}

          {/* Recent payments (below transactions) */}
          {payments.length > 0 && (
            <div className="rounded-2xl overflow-hidden mt-5" style={CARD}>
              <div className="px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-sm font-bold font-syne text-white">{t("admin.wallet.rechargeHistory")}</h3>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                    <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: payment.status === "completed" ? "rgba(29,158,117,0.12)" : "rgba(234,179,8,0.12)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={payment.status === "completed" ? "#1D9E75" : "#EAB308"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white font-dm">{t("admin.wallet.recharge")} — {payment.payment_method || "Wave"}</p>
                      <p className="text-[10px] font-dm" style={{ color: DIM2 }}>{timeAgo(payment.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-syne" style={{ color: "#1D9E75" }}>+{formatFCFA(payment.amount)}</p>
                      <PaymentDot status={payment.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "spending" && (
        <>
          {/* Spending chart */}
          {spendingData.length > 0 && spendingData.some(d => d.amount > 0) && (
            <div className="rounded-2xl p-5 mb-5" style={CARD}>
              <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.wallet.spendingLast30")}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={spendingData} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D35400" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#D35400" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ background: "#0A0A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11, fontFamily: "DM Sans", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} formatter={(value) => [formatFCFA(Number(value)), t("admin.wallet.totalSpent")]} labelFormatter={(v) => String(v)} />
                  <Bar dataKey="amount" fill="url(#spendGrad)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Campaign spending table */}
          <div className="rounded-2xl overflow-hidden" style={CARD}>
            <div className="px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-bold font-syne text-white">{t("admin.wallet.spendByCampaign")}</h3>
            </div>
            {campaigns.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xs font-dm" style={{ color: DIM2 }}>{t("admin.wallet.noCampaign")}</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {campaigns.map((c) => {
                  const ss = getStatusStyle(c.status);
                  const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                      <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: ss.bg }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: ss.dot }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white font-dm truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                            <span className="w-1 h-1 rounded-full" style={{ background: ss.dot }} />
                            {getStatusLabel(c.status)}
                          </span>
                          <span className="text-[9px] font-dm" style={{ color: DIM2 }}>{new Date(c.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-syne" style={{ color: pct >= 100 ? "#1D9E75" : "rgba(255,255,255,0.8)" }}>{formatFCFA(Math.min(c.spent, c.budget))}</p>
                        <div className="flex items-center gap-1.5 justify-end mt-1">
                          <div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#1D9E75" : "#D35400" }} />
                          </div>
                          <span className="text-[9px] font-dm" style={{ color: DIM2 }}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "invoices" && <InvoicesTab invoices={invoices} invoicesLoading={invoicesLoading} />}
    </div>
  );
}

/* ============================================================
   FINPAY-STYLE TRANSACTION ITEM (list row, not table)
   ============================================================ */
function TxItem({ tx, expanded, onToggle }: { tx: WalletTransaction; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const isCredit = tx.amount >= 0;

  const txStatusMap: Record<string, { dot: string; color: string; label: string }> = {
    completed: { dot: "#1D9E75", color: "#1D9E75", label: t("admin.wallet.completed") },
    pending: { dot: "#EAB308", color: "#EAB308", label: t("admin.wallet.pending") },
    failed: { dot: "#EF4444", color: "#EF4444", label: t("admin.wallet.failed") },
    refunded: { dot: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)", label: t("admin.wallet.refunded") },
  };
  const sc = txStatusMap[tx.status] || txStatusMap.completed;

  return (
    <div>
      <div
        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
        onClick={onToggle}
      >
        {/* +/- circle icon like Finpay */}
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: isCredit ? "rgba(29,158,117,0.12)" : "rgba(211,84,0,0.12)",
            color: isCredit ? "#1D9E75" : "#D35400",
          }}
        >
          {isCredit ? "+" : "−"}
        </div>

        {/* Description + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white font-dm truncate">
            {tx.description || tx.type_label}
          </p>
          <p className="text-[10px] font-dm mt-0.5" style={{ color: DIM2 }}>
            {tx.type_label} · {new Date(tx.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* Amount + status */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold font-syne" style={{ color: isCredit ? "#1D9E75" : "#D35400" }}>
            {isCredit ? "+" : ""}{formatFCFA(tx.amount)}
          </p>
          <span className="inline-flex items-center gap-1 text-[9px] font-dm mt-0.5">
            <span className="w-1 h-1 rounded-full" style={{ background: sc.dot }} />
            <span style={{ color: sc.color }}>{sc.label}</span>
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 pt-1 ml-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-dm p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div>
              <span style={{ color: DIM2 }}>{t("admin.wallet.transactionId")}</span>
              <p className="font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{tx.id.slice(0, 12)}...</p>
            </div>
            {tx.source_id && (
              <div>
                <span style={{ color: DIM2 }}>{t("admin.wallet.reference")}</span>
                <p className="font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{tx.source_id.slice(0, 12)}...</p>
              </div>
            )}
            <div>
              <span style={{ color: DIM2 }}>{t("admin.wallet.exactDate")}</span>
              <p className="mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{new Date(tx.created_at).toLocaleString()}</p>
            </div>
          </div>
          {(tx.type === "wallet_recharge" || tx.status === "completed") && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`/api/brand/wallet/transactions/${tx.id}/receipt`, "_blank"); }}
              className="flex items-center gap-1.5 mt-2 text-[10px] font-dm font-semibold transition hover:opacity-70"
              style={{ color: DIM }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {t("admin.wallet.downloadReceipt")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   INVOICES TAB
   ============================================================ */
function InvoicesTab({ invoices, invoicesLoading }: { invoices: Invoice[]; invoicesLoading: boolean }) {
  const { t } = useTranslation();

  if (invoicesLoading) {
    return (
      <div className="rounded-2xl p-10 text-center" style={CARD}>
        <div className="h-5 w-32 rounded-lg animate-pulse mx-auto mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl p-14 text-center" style={CARD}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(211,84,0,0.1)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <p className="text-xs font-dm" style={{ color: DIM2 }}>{t("admin.wallet.noInvoices")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {invoices.map((inv) => {
          const isFinal = inv.status === "final";
          return (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
              <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: isFinal ? "rgba(29,158,117,0.12)" : "rgba(211,84,0,0.12)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isFinal ? "#1D9E75" : "#D35400"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold font-dm" style={{ color: "#D35400" }}>{inv.invoice_number}</p>
                <p className="text-[10px] font-dm mt-0.5" style={{ color: DIM2 }}>
                  {new Date(inv.period_start).toLocaleDateString(undefined, { day: "numeric", month: "short" })} — {new Date(inv.period_end).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  <span className="mx-1.5">·</span>
                  {inv.campaign_count} {t("admin.wallet.campaigns").toLowerCase()}
                </p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-3">
                <div>
                  <p className="text-xs font-bold font-syne text-white">{formatFCFA(inv.total_spend_fcfa)}</p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-dm mt-0.5">
                    <span className="w-1 h-1 rounded-full" style={{ background: isFinal ? "#1D9E75" : "#D35400" }} />
                    <span style={{ color: isFinal ? "#1D9E75" : "#D35400" }}>{isFinal ? t("admin.wallet.finalized") : t("admin.wallet.draftInvoice")}</span>
                  </span>
                </div>
                <button
                  onClick={() => window.open(`/api/brand/wallet/invoices/${inv.id}/pdf`, "_blank")}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.04)", color: DIM }}
                  title={t("admin.wallet.downloadInvoice")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PAYMENT DOT
   ============================================================ */
function PaymentDot({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { dot: string; color: string; label: string }> = {
    completed: { dot: "#1D9E75", color: "#1D9E75", label: t("admin.wallet.validated") },
    pending: { dot: "#EAB308", color: "#EAB308", label: t("admin.wallet.pendingValidation") },
    cancelled: { dot: "rgba(255,255,255,0.2)", color: DIM, label: t("admin.wallet.cancelled") },
    failed: { dot: "#EF4444", color: "#EF4444", label: t("admin.wallet.refused") },
  };
  const s = map[status] || map.completed;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-dm mt-0.5">
      <span className="w-1 h-1 rounded-full" style={{ background: s.dot }} />
      <span style={{ color: s.color }}>{s.label}</span>
    </span>
  );
}
