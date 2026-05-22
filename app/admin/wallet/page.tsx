"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import {
  AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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
      <div className="h-7 w-36 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-2xl h-52 animate-pulse" style={SK} />
        <div className="lg:col-span-3 space-y-3">
          <div className="rounded-2xl h-24 animate-pulse" style={SK} />
          <div className="rounded-2xl h-24 animate-pulse" style={SK} />
        </div>
        <div className="lg:col-span-4 rounded-2xl h-52 animate-pulse" style={SK} />
      </div>
      <div className="rounded-2xl h-80 animate-pulse" style={SK} />
    </div>
  );
}

const SK = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const C = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const INP = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };

interface WalletData { balance: number; totalSpent: number; totalBudget: number; activeCampaigns: number }
interface Campaign { id: string; title: string; budget: number; spent: number; status: string; created_at: string }
interface Payment { id: string; amount: number; ref_command: string; status: string; payment_method: string | null; created_at: string; completed_at: string | null }
interface WalletTransaction { id: string; user_id: string; amount: number; type: string; type_label: string; description: string | null; status: string; source_id: string | null; source_type: string | null; created_at: string }
interface Invoice { id: string; invoice_number: string; period_start: string; period_end: string; total_recharges_fcfa: number; total_spend_fcfa: number; total_refunds_fcfa: number; net_amount_fcfa: number; campaign_count: number; click_count: number; status: string; created_at: string; line_items: InvoiceLineItem[] }
interface InvoiceLineItem { id: string; campaign_name: string; objective: string | null; clicks: number; leads: number; cpc_fcfa: number | null; cpl_fcfa: number | null; total_spend_fcfa: number }

type Tab = "recent" | "spending" | "invoices";

function AdminWalletPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("recent");
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, totalSpent: 0, totalBudget: 0, activeCampaigns: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [showRechargeInput, setShowRechargeInput] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [, setTxTotal] = useState(0);
  const [txFilter, setTxFilter] = useState("");
  const [txFrom] = useState("");
  const [txTo] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [spendingData, setSpendingData] = useState<{ date: string; amount: number }[]>([]);

  const totalRecharged = useMemo(() => payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0), [payments]);

  function getStatusStyle(status: string) {
    switch (status) {
      case "active": return { dot: "#D35400", color: "#D35400", bg: "rgba(211,84,0,0.1)" };
      case "paused": return { dot: "#EAB308", color: "#EAB308", bg: "rgba(234,179,8,0.1)" };
      case "completed": return { dot: "#1D9E75", color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
      case "rejected": return { dot: "#EF4444", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
      default: return { dot: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
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
    if (paymentsRes.ok) { const d = await paymentsRes.json(); setPayments(Array.isArray(d) ? d : []); }
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

  useEffect(() => { if (tab === "recent") loadTransactions(1); }, [tab, txFilter, txFrom, txTo, loadTransactions]);
  useEffect(() => { if (tab === "invoices") loadInvoices(); }, [tab, loadInvoices]);

  useEffect(() => {
    if (!payments.length && !campaigns.length) return;
    const last30 = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); last30.set(d.toISOString().slice(0, 10), 0); }
    for (const c of campaigns) { const day = c.created_at?.slice(0, 10); if (day && last30.has(day)) last30.set(day, (last30.get(day) || 0) + c.spent); }
    setSpendingData(Array.from(last30, ([date, amount]) => ({ date, amount })));
  }, [payments, campaigns]);

  async function handlePayment(amount?: number) {
    const val = amount || parseInt(rechargeAmount);
    if (!val || val < 100) { setPayError(t("admin.wallet.minAmount")); return; }
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: val, payment_method: "Wave" }),
      });
      const data = await res.json();
      if (data.success && data.redirect_url) {
        trackEvent.brandRecharge(val, "Wave");
        window.open(data.redirect_url, "_blank");
        setSuccessMsg(t("admin.wallet.finalizeWave"));
        setPaying(false);
        setRechargeAmount("");
        setShowRechargeInput(false);
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

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold font-syne text-white">{t("admin.wallet.title")}</h1>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold font-dm flex items-center justify-between" style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)", color: "#1D9E75" }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-4 hover:opacity-70 transition" style={{ color: "#1D9E75" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      {payError && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-dm flex items-center justify-between" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
          <span>{payError}</span>
          <button onClick={() => setPayError(null)} className="ml-4 hover:opacity-70 transition" style={{ color: "#EF4444" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* ====== ONPAY-STYLE THREE-ZONE TOP ROW ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">

        {/* LEFT: Balance card (matches overview WalletCard) */}
        <div
          className="lg:col-span-5 rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D35400 0%, #B84700 50%, #8B3500 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
              </div>
              <span className="text-[11px] font-medium font-dm text-white/60">{t("admin.wallet.availableBalance")}</span>
            </div>

            <p className="text-2xl font-bold font-syne text-white mb-4">{formatFCFA(wallet.balance)}</p>

            <div className="grid grid-cols-2 gap-3 pt-3 mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <div>
                <p className="text-[10px] text-white/40 font-dm">{t("admin.wallet.totalSpent")}</p>
                <p className="text-sm font-semibold font-syne text-white mt-0.5">{formatFCFA(wallet.totalSpent)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 font-dm">{t("admin.wallet.totalRecharged")}</p>
                <p className="text-sm font-semibold font-syne text-white mt-0.5">{formatFCFA(totalRecharged)}</p>
              </div>
            </div>

            <button
              onClick={() => setShowRechargeModal(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold font-dm text-white/90 transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.15)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t("admin.wallet.addFunds")}
            </button>
          </div>
        </div>

        {/* CENTER: Recharge quick-actions (like Onpay's "Upcoming payments") */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Quick recharge card 1 */}
          <button
            onClick={() => handlePayment(25000)}
            disabled={paying}
            className="flex-1 rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 text-left"
            style={C}
          >
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(211,84,0,0.1)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.recharge")}</p>
              <p className="text-lg font-bold font-syne text-white">25 000 <span className="text-[10px] font-dm font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>FCFA</span></p>
            </div>
          </button>

          {/* Quick recharge card 2 */}
          <button
            onClick={() => handlePayment(50000)}
            disabled={paying}
            className="flex-1 rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 text-left"
            style={C}
          >
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(29,158,117,0.1)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.recharge")}</p>
              <p className="text-lg font-bold font-syne text-white">50 000 <span className="text-[10px] font-dm font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>FCFA</span></p>
            </div>
          </button>
        </div>

        {/* RIGHT: Spending chart (like Onpay's "Spent this day" chart) */}
        <div className="lg:col-span-4 rounded-2xl p-5" style={C}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.spendingLast30")}</p>
              <p className="text-2xl font-black font-syne text-white mt-0.5">{formatFCFA(wallet.totalSpent)}</p>
            </div>
          </div>

          <div className="mt-3" style={{ height: 100 }}>
            {spendingData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingData}>
                  <defs>
                    <linearGradient id="spArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D35400" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#D35400" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="amount" stroke="#D35400" strokeWidth={1.5} fill="url(#spArea)" dot={false} />
                  <Tooltip
                    contentStyle={{ background: "#0A0A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 10, fontFamily: "DM Sans" }}
                    formatter={(value) => [formatFCFA(Number(value))]}
                    labelFormatter={(v) => String(v)}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.2)" }}>—</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom recharge row */}
      <div className="rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-3" style={C}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(211,84,0,0.1)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            {!showRechargeInput ? (
              <button
                onClick={() => setShowRechargeInput(true)}
                className="text-xs font-dm font-semibold text-white hover:opacity-80 transition"
              >
                {t("admin.wallet.customAmount")} →
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="100 000"
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-white font-syne font-bold focus:outline-none min-w-0"
                  style={INP}
                  autoFocus
                />
                <span className="text-[10px] font-dm shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>FCFA</span>
              </div>
            )}
          </div>
        </div>
        {showRechargeInput && (
          <button
            onClick={() => handlePayment()}
            disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
            className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-30"
            style={{ background: "#D35400" }}
          >
            {paying ? t("admin.wallet.openingWave") : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : "..." })}
          </button>
        )}
        <p className="w-full text-[9px] font-dm mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
          {t("admin.wallet.waveRedirect")}
        </p>
      </div>

      {/* ====== TABS — Onpay-style with "Recent transactions" + "Sort by" ====== */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {([
            { key: "recent" as Tab, label: t("admin.wallet.rechargeHistory") },
            { key: "spending" as Tab, label: t("admin.wallet.spendByCampaign") },
            { key: "invoices" as Tab, label: t("admin.wallet.invoiceNumber").replace(/N°\s?/, "") },
          ]).map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="px-4 py-2 rounded-xl text-[11px] font-bold font-dm transition-all"
              style={{
                background: tab === tb.key ? "#D35400" : "transparent",
                color: tab === tb.key ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Sort / filter (visible on transactions tab) */}
        {tab === "recent" && (
          <div className="flex items-center gap-2">
            <select value={txFilter} onChange={(e) => { setTxFilter(e.target.value); setTxPage(1); }} className="rounded-lg px-2.5 py-1.5 text-[10px] text-white font-dm focus:outline-none cursor-pointer" style={INP}>
              <option value="" style={{ background: "#111128" }}>{t("admin.wallet.allTransactions")}</option>
              <option value="wallet_recharge" style={{ background: "#111128" }}>{t("admin.wallet.recharges")}</option>
              <option value="campaign_budget_debit" style={{ background: "#111128" }}>{t("admin.wallet.campaignSpending")}</option>
              <option value="campaign_budget_refund" style={{ background: "#111128" }}>{t("admin.wallet.refunds")}</option>
            </select>
            <button
              onClick={() => { const p = new URLSearchParams(); if (txFilter) p.set("type", txFilter); if (txFrom) p.set("from", txFrom); if (txTo) p.set("to", txTo); window.open(`/api/brand/wallet/transactions/export?${p}`, "_blank"); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-dm transition hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
          </div>
        )}
      </div>

      {/* ====== TAB: RECENT TRANSACTIONS ====== */}
      {tab === "recent" && (
        <div className="rounded-2xl overflow-hidden" style={C}>
          {txLoading ? (
            <div className="p-10 text-center space-y-3">
              <div className="h-5 w-32 rounded-lg animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          ) : txs.length === 0 && payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(211,84,0,0.1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              </div>
              <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.noTransactions")}</p>
            </div>
          ) : (
            <>
              {/* Wallet transactions */}
              {txs.map((tx) => {
                const isCredit = tx.amount >= 0;
                const txIcon = getTxIcon(tx.type);
                return (
                  <div key={tx.id}>
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                    >
                      {/* Category icon */}
                      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isCredit ? "rgba(29,158,117,0.08)" : "rgba(211,84,0,0.08)" }}>
                        {txIcon}
                      </div>

                      {/* Title + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white font-dm truncate">
                          {tx.description || tx.type_label}
                        </p>
                        <p className="text-[10px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {new Date(tx.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}, {new Date(tx.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      {/* Amount */}
                      <p className="text-sm font-bold font-syne shrink-0" style={{ color: isCredit ? "#1D9E75" : "rgba(255,255,255,0.8)" }}>
                        {isCredit ? "+" : ""}{formatFCFA(tx.amount)}
                      </p>

                      {/* Expand chevron */}
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="shrink-0 transition-transform"
                        style={{ transform: expandedTx === tx.id ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>

                    {expandedTx === tx.id && (
                      <div className="px-5 pb-4 pt-2 ml-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-dm">
                          <div>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.type")}</span>
                            <p className="text-white/60 mt-0.5">{tx.type_label}</p>
                          </div>
                          <div>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.status")}</span>
                            <p className="mt-0.5" style={{ color: tx.status === "completed" ? "#1D9E75" : tx.status === "failed" ? "#EF4444" : "#EAB308" }}>{t(`admin.wallet.${tx.status}`)}</p>
                          </div>
                          <div>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.transactionId")}</span>
                            <p className="font-mono text-white/50 mt-0.5">{tx.id.slice(0, 12)}...</p>
                          </div>
                          {tx.source_id && (
                            <div>
                              <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.reference")}</span>
                              <p className="font-mono text-white/50 mt-0.5">{tx.source_id.slice(0, 12)}...</p>
                            </div>
                          )}
                        </div>
                        {(tx.type === "wallet_recharge" || tx.status === "completed") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(`/api/brand/wallet/transactions/${tx.id}/receipt`, "_blank"); }}
                            className="flex items-center gap-1.5 mt-3 text-[10px] font-dm font-semibold transition hover:opacity-70"
                            style={{ color: "#D35400" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {t("admin.wallet.downloadReceipt")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Payment recharges */}
              {txs.length === 0 && payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(29,158,117,0.08)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white font-dm">{t("admin.wallet.recharge")} — {p.payment_method || "Wave"}</p>
                    <p className="text-[10px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(p.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-syne" style={{ color: "#1D9E75" }}>+{formatFCFA(p.amount)}</p>
                    <PaymentDot status={p.status} />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Pagination */}
          {txPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={() => { setTxPage(txPage - 1); loadTransactions(txPage - 1); }} disabled={txPage <= 1} className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>←</button>
              <span className="text-[11px] font-dm" style={{ color: "rgba(255,255,255,0.4)" }}>Page {txPage} / {txPages}</span>
              <button onClick={() => { setTxPage(txPage + 1); loadTransactions(txPage + 1); }} disabled={txPage >= txPages} className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>→</button>
            </div>
          )}
        </div>
      )}

      {/* ====== TAB: SPENDING ANALYSIS ====== */}
      {tab === "spending" && (
        <>
          {spendingData.some(d => d.amount > 0) && (
            <div className="rounded-2xl p-5 mb-5" style={C}>
              <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.wallet.spendingLast30")}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={spendingData} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D35400" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#D35400" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ background: "#0A0A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11 }} formatter={(value) => [formatFCFA(Number(value))]} labelFormatter={(v) => String(v)} />
                  <Bar dataKey="amount" fill="url(#sg)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden" style={C}>
            <div className="px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-bold font-syne text-white">{t("admin.wallet.spendByCampaign")}</h3>
            </div>
            {campaigns.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.noCampaign")}</p>
              </div>
            ) : campaigns.map((c) => {
              const ss = getStatusStyle(c.status);
              const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ss.bg }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ss.dot }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white font-dm truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                        {getStatusLabel(c.status)}
                      </span>
                      <span className="text-[9px] font-dm" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {new Date(c.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-syne" style={{ color: pct >= 100 ? "#1D9E75" : "rgba(255,255,255,0.8)" }}>
                      {formatFCFA(Math.min(c.spent, c.budget))}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#1D9E75" : "#D35400" }} />
                      </div>
                      <span className="text-[9px] font-dm" style={{ color: "rgba(255,255,255,0.3)" }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ====== TAB: INVOICES ====== */}
      {tab === "invoices" && (
        <div className="rounded-2xl overflow-hidden" style={C}>
          {invoicesLoading ? (
            <div className="p-10 text-center space-y-3">
              <div className="h-5 w-32 rounded-lg animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(211,84,0,0.1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-xs font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.noInvoices")}</p>
            </div>
          ) : invoices.map((inv) => {
            const isFinal = inv.status === "final";
            return (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isFinal ? "rgba(29,158,117,0.08)" : "rgba(211,84,0,0.08)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFinal ? "#1D9E75" : "#D35400"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold font-dm" style={{ color: "#D35400" }}>{inv.invoice_number}</p>
                  <p className="text-[10px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {new Date(inv.period_start).toLocaleDateString(undefined, { day: "numeric", month: "short" })} — {new Date(inv.period_end).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    <span className="mx-1">·</span>{inv.campaign_count} {t("admin.wallet.campaigns").toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold font-syne text-white">{formatFCFA(inv.total_spend_fcfa)}</p>
                    <span className="inline-flex items-center gap-1 text-[9px] font-dm mt-0.5">
                      <span className="w-1 h-1 rounded-full" style={{ background: isFinal ? "#1D9E75" : "#D35400" }} />
                      <span style={{ color: isFinal ? "#1D9E75" : "#D35400" }}>{isFinal ? t("admin.wallet.finalized") : t("admin.wallet.draftInvoice")}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => window.open(`/api/brand/wallet/invoices/${inv.id}/pdf`, "_blank")}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
                    style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                    title={t("admin.wallet.downloadInvoice")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== RECHARGE MODAL ====== */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.08)" }}
          >
            {/* Close button */}
            <button
              onClick={() => { setShowRechargeModal(false); setRechargeAmount(""); setPayError(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(211,84,0,0.12)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div>
                <p className="text-base font-bold font-syne text-white">{t("admin.wallet.recharge")}</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.availableBalance")}: {formatFCFA(wallet.balance)}</p>
              </div>
            </div>

            {/* Quick amount buttons */}
            <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.quickRecharge")}</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[10000, 25000, 50000, 75000, 100000, 250000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setRechargeAmount(String(amt))}
                  className="rounded-xl py-2.5 text-xs font-syne font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: rechargeAmount === String(amt) ? "#D35400" : "rgba(255,255,255,0.04)",
                    border: rechargeAmount === String(amt) ? "1px solid #D35400" : "0.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {formatFCFA(amt)}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.customAmount")}</p>
            <div className="flex items-center gap-2 mb-5">
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="100 000"
                className="flex-1 rounded-xl px-4 py-3 text-sm text-white font-syne font-bold focus:outline-none"
                style={INP}
              />
              <span className="text-[11px] font-dm shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>FCFA</span>
            </div>

            {/* Error in modal */}
            {payError && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
                {payError}
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={() => { handlePayment(parseInt(rechargeAmount)); setShowRechargeModal(false); }}
              disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
              className="w-full rounded-xl py-3.5 text-sm font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "#D35400" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {paying ? t("admin.wallet.openingWave") : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount) || 0) : "0 FCFA" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function getTxIcon(type: string) {
  const s = { strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (type) {
    case "wallet_recharge":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#1D9E75"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "campaign_budget_debit":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#D35400"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>;
    case "campaign_budget_refund":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#3B82F6"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case "manual_credit":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#1D9E75"><polyline points="20 6 9 17 4 12"/></svg>;
    case "manual_debit":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="#EF4444"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    default:
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s} stroke="rgba(255,255,255,0.4)"><circle cx="12" cy="12" r="10"/></svg>;
  }
}

function PaymentDot({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { dot: string; color: string; label: string }> = {
    completed: { dot: "#1D9E75", color: "#1D9E75", label: t("admin.wallet.validated") },
    pending: { dot: "#EAB308", color: "#EAB308", label: t("admin.wallet.pendingValidation") },
    cancelled: { dot: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)", label: t("admin.wallet.cancelled") },
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
