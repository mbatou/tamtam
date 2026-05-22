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
    <div className="p-4 lg:p-6 space-y-5" style={{ maxWidth: "100%" }}>
      <div className="flex justify-between items-center">
        <div>
          <div className="h-7 w-36 rounded-lg animate-pulse mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
        <div className="h-10 w-28 rounded-xl animate-pulse" style={{ background: "rgba(211,84,0,0.15)" }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <div className="h-3 w-20 rounded mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-7 w-28 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl h-64 animate-pulse" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }} />
    </div>
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

const CARD_STYLE = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const INPUT_STYLE = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };
const MUTED = "rgba(255,255,255,0.4)";
const MUTED_LIGHT = "rgba(255,255,255,0.35)";

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
      default: return { dot: "rgba(255,255,255,0.15)", color: MUTED, bg: "rgba(255,255,255,0.04)" };
    }
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected"),
    };
    return map[status] || status;
  }

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

  if (loading) return <WalletSkeleton />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("admin.wallet.title") },
    { key: "transactions", label: "Transactions" },
    { key: "invoices", label: t("admin.wallet.invoiceNumber").replace("N° ", "") || "Factures" },
  ];

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">{t("admin.wallet.title")}</h1>
          <p className="text-xs font-dm mt-0.5" style={{ color: MUTED_LIGHT }}>
            {t("admin.wallet.availableBalance")}
          </p>
        </div>
        <button
          onClick={() => setShowRecharge(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: "#D35400" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("admin.wallet.recharge")}
        </button>
      </div>

      {/* Success/Error banners */}
      {successMsg && (
        <div
          className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold font-dm flex items-center justify-between"
          style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)", color: "#1D9E75" }}
        >
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-4 hover:opacity-70 transition" style={{ color: "#1D9E75" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* KPI cards row — Drivery-inspired: hero balance card + 3 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* Hero balance card */}
        <div
          className="col-span-2 lg:col-span-1 rounded-2xl p-5 flex items-start justify-between"
          style={CARD_STYLE}
        >
          <div>
            <p className="text-[10px] font-dm font-medium mb-1.5" style={{ color: MUTED }}>{t("admin.wallet.availableBalance")}</p>
            <p className="text-2xl lg:text-3xl font-black font-syne" style={{ color: "#D35400" }}>{formatFCFA(wallet.balance)}</p>
          </div>
          {spendingData.length > 1 && (
            <div className="shrink-0 w-20 h-10 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingData.slice(-7)}>
                  <Line type="monotone" dataKey="amount" stroke="#D35400" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Total recharged */}
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(29,158,117,0.12)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-dm font-medium mb-1" style={{ color: MUTED }}>{t("admin.wallet.totalRecharged")}</p>
              <p className="text-lg font-bold font-syne text-white">{formatFCFA(totalRecharged)}</p>
            </div>
          </div>
        </div>

        {/* Total spent */}
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-dm font-medium mb-1" style={{ color: MUTED }}>{t("admin.wallet.totalSpent")}</p>
              <p className="text-lg font-bold font-syne text-white">{formatFCFA(wallet.totalSpent)}</p>
            </div>
          </div>
        </div>

        {/* Campaigns funded */}
        <div className="rounded-2xl p-5" style={CARD_STYLE}>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-dm font-medium mb-1" style={{ color: MUTED }}>{t("admin.wallet.campaignsFunded")}</p>
              <p className="text-lg font-bold font-syne text-white">{campaigns.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation — Drivery pill style */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-[11px] font-bold font-dm transition-all"
            style={{
              background: tab === t.key ? "#D35400" : "transparent",
              color: tab === t.key ? "#fff" : "rgba(255,255,255,0.35)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === TAB 1: OVERVIEW === */}
      {tab === "overview" && (
        <OverviewTab
          campaigns={campaigns}
          payments={payments}
          spendingData={spendingData}
          showRecharge={showRecharge}
          setShowRecharge={setShowRecharge}
          rechargeAmount={rechargeAmount}
          setRechargeAmount={setRechargeAmount}
          paying={paying}
          payError={payError}
          setPayError={setPayError}
          handlePayment={handlePayment}
          getStatusStyle={getStatusStyle}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* === TAB 2: TRANSACTIONS === */}
      {tab === "transactions" && (
        <TransactionsTab
          txs={txs}
          txPage={txPage}
          txPages={txPages}
          txTotal={txTotal}
          txFilter={txFilter}
          setTxFilter={setTxFilter}
          txFrom={txFrom}
          setTxFrom={setTxFrom}
          txTo={txTo}
          setTxTo={setTxTo}
          txLoading={txLoading}
          expandedTx={expandedTx}
          setExpandedTx={setExpandedTx}
          setTxPage={setTxPage}
          loadTransactions={loadTransactions}
        />
      )}

      {/* === TAB 3: INVOICES === */}
      {tab === "invoices" && (
        <InvoicesTab invoices={invoices} invoicesLoading={invoicesLoading} />
      )}
    </div>
  );
}

/* ============================================================
   OVERVIEW TAB
   ============================================================ */
function OverviewTab({
  campaigns, payments, spendingData,
  showRecharge, setShowRecharge, rechargeAmount, setRechargeAmount,
  paying, payError, setPayError, handlePayment,
  getStatusStyle, getStatusLabel,
}: {
  campaigns: Campaign[];
  payments: Payment[];
  spendingData: { date: string; amount: number }[];
  showRecharge: boolean;
  setShowRecharge: (v: boolean) => void;
  rechargeAmount: string;
  setRechargeAmount: (v: string) => void;
  paying: boolean;
  payError: string | null;
  setPayError: (v: string | null) => void;
  handlePayment: () => void;
  getStatusStyle: (s: string) => { dot: string; color: string; bg: string };
  getStatusLabel: (s: string) => string;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Spending chart */}
      {spendingData.length > 0 && spendingData.some(d => d.amount > 0) && (
        <div className="rounded-2xl p-5 mb-5" style={CARD_STYLE}>
          <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.wallet.spendingLast30")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendingData} barCategoryGap="15%">
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D35400" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#D35400" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.02)" }}
                contentStyle={{
                  background: "#0A0A1A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 11,
                  fontFamily: "DM Sans",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
                formatter={(value) => [formatFCFA(Number(value)), t("admin.wallet.totalSpent")]}
                labelFormatter={(v) => String(v)}
              />
              <Bar dataKey="amount" fill="url(#spendGrad)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recharge section */}
      <div className="rounded-2xl p-5 mb-5" style={CARD_STYLE}>
        <h3 className="text-sm font-bold font-syne text-white mb-4">{t("admin.wallet.rechargeTitle")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[10000, 25000, 50000, 100000].map((amount) => {
            const isSelected = rechargeAmount === amount.toString() && showRecharge;
            return (
              <button
                key={amount}
                onClick={() => { setRechargeAmount(amount.toString()); setShowRecharge(true); }}
                className="rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: isSelected ? "rgba(211,84,0,0.08)" : "rgba(255,255,255,0.03)",
                  border: isSelected ? "1px solid rgba(211,84,0,0.3)" : "0.5px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="font-bold font-syne text-lg text-white">{amount.toLocaleString("fr-FR")}</div>
                <div className="text-[10px] font-dm" style={{ color: MUTED_LIGHT }}>FCFA</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { setShowRecharge(!showRecharge); setPayError(null); }}
          className="text-[11px] font-dm transition hover:opacity-70"
          style={{ color: MUTED }}
        >
          {t("admin.wallet.customAmount")} →
        </button>

        {showRecharge && (
          <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder={t("admin.wallet.customAmount")}
              className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none transition mb-4"
              style={INPUT_STYLE}
            />
            {payError && (
              <div
                className="mb-4 px-4 py-3 rounded-xl text-sm font-dm"
                style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}
              >
                {payError}
              </div>
            )}
            <button
              onClick={handlePayment}
              disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30"
              style={{ background: "#D35400" }}
            >
              {paying
                ? t("admin.wallet.openingWave")
                : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : "" })}
            </button>
            <p className="text-[10px] font-dm mt-3 text-center" style={{ color: MUTED_LIGHT }}>
              {t("admin.wallet.waveRedirect")}
            </p>
          </div>
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-5" style={CARD_STYLE}>
          <div className="px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-bold font-syne text-white">{t("admin.wallet.rechargeHistory")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.amount")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.method")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.status")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.date")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition-colors"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-5 py-3 font-bold font-syne text-white">{formatFCFA(payment.amount)}</td>
                    <td className="px-5 py-3 font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>{payment.payment_method || "—"}</td>
                    <td className="px-5 py-3"><PaymentDot status={payment.status} /></td>
                    <td className="px-5 py-3 font-dm" style={{ color: MUTED }}>{timeAgo(payment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign spending — Drivery-inspired clean list */}
      <div className="rounded-2xl overflow-hidden" style={CARD_STYLE}>
        <div className="px-5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-bold font-syne text-white">{t("admin.wallet.spendByCampaign")}</h3>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-xs font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.noCampaign")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.rythme")}</th>
                  <th className="text-right px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("common.budget")}</th>
                  <th className="text-right px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.totalSpent")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.status")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.date")}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const ss = getStatusStyle(c.status);
                  const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-5 py-3 font-semibold text-white font-dm">{c.title}</td>
                      <td className="px-5 py-3 text-right font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>{formatFCFA(c.budget)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold font-dm" style={{ color: pct >= 100 ? "#1D9E75" : "rgba(255,255,255,0.7)" }}>
                            {formatFCFA(Math.min(c.spent, c.budget))}
                          </span>
                          <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? "#1D9E75" : "#D35400" }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                          {getStatusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-dm" style={{ color: MUTED }}>
                        {new Date(c.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
   TRANSACTIONS TAB
   ============================================================ */
function TransactionsTab({
  txs, txPage, txPages, txTotal,
  txFilter, setTxFilter, txFrom, setTxFrom, txTo, setTxTo,
  txLoading, expandedTx, setExpandedTx, setTxPage, loadTransactions,
}: {
  txs: WalletTransaction[];
  txPage: number;
  txPages: number;
  txTotal: number;
  txFilter: string;
  setTxFilter: (v: string) => void;
  txFrom: string;
  setTxFrom: (v: string) => void;
  txTo: string;
  setTxTo: (v: string) => void;
  txLoading: boolean;
  expandedTx: string | null;
  setExpandedTx: (v: string | null) => void;
  setTxPage: (v: number) => void;
  loadTransactions: (page: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={txFilter}
          onChange={(e) => { setTxFilter(e.target.value); setTxPage(1); }}
          className="rounded-xl px-3 py-2 text-[11px] text-white font-dm focus:outline-none transition cursor-pointer"
          style={INPUT_STYLE}
        >
          <option value="" style={{ background: "#111128" }}>{t("admin.wallet.allTransactions")}</option>
          <option value="wallet_recharge" style={{ background: "#111128" }}>{t("admin.wallet.recharges")}</option>
          <option value="campaign_budget_debit" style={{ background: "#111128" }}>{t("admin.wallet.campaignSpending")}</option>
          <option value="campaign_budget_refund" style={{ background: "#111128" }}>{t("admin.wallet.refunds")}</option>
          <option value="manual_credit" style={{ background: "#111128" }}>{t("admin.wallet.manualCredits")}</option>
          <option value="manual_debit" style={{ background: "#111128" }}>{t("admin.wallet.manualDebits")}</option>
        </select>
        <input
          type="date"
          value={txFrom}
          onChange={(e) => { setTxFrom(e.target.value); setTxPage(1); }}
          className="rounded-xl px-3 py-2 text-[11px] text-white font-dm focus:outline-none transition"
          style={INPUT_STYLE}
          placeholder={t("admin.wallet.from")}
        />
        <input
          type="date"
          value={txTo}
          onChange={(e) => { setTxTo(e.target.value); setTxPage(1); }}
          className="rounded-xl px-3 py-2 text-[11px] text-white font-dm focus:outline-none transition"
          style={INPUT_STYLE}
          placeholder={t("admin.wallet.to")}
        />
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (txFilter) params.set("type", txFilter);
            if (txFrom) params.set("from", txFrom);
            if (txTo) params.set("to", txTo);
            window.open(`/api/brand/wallet/transactions/export?${params}`, "_blank");
          }}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold font-dm transition-all hover:opacity-80 active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>

      {/* Transaction count */}
      <p className="text-[10px] font-dm mb-3" style={{ color: MUTED_LIGHT }}>
        {txTotal} transaction{txTotal !== 1 ? "s" : ""}
      </p>

      {/* Transaction table */}
      <div className="rounded-2xl overflow-hidden mb-4" style={CARD_STYLE}>
        {txLoading ? (
          <div className="p-10 text-center space-y-3">
            <div className="h-5 w-32 rounded-lg animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
          </div>
        ) : txs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-xs font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.noTransactions")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.date")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.description")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.type")}</th>
                  <th className="text-right px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.amount")}</th>
                  <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.status")}</th>
                  <th className="text-center px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <TxRow key={tx.id} tx={tx} expanded={expandedTx === tx.id} onToggle={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {txPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setTxPage(txPage - 1); loadTransactions(txPage - 1); }}
            disabled={txPage <= 1}
            className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}
          >
            ←
          </button>
          <span className="text-[11px] font-dm" style={{ color: MUTED }}>
            Page {txPage} / {txPages}
          </span>
          <button
            onClick={() => { setTxPage(txPage + 1); loadTransactions(txPage + 1); }}
            disabled={txPage >= txPages}
            className="px-3 py-1.5 rounded-lg text-[11px] font-dm font-semibold transition disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}

function TxRow({ tx, expanded, onToggle }: { tx: WalletTransaction; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();

  const txTypeColor: Record<string, { bg: string; color: string }> = {
    wallet_recharge: { bg: "rgba(29,158,117,0.1)", color: "#1D9E75" },
    campaign_budget_debit: { bg: "rgba(211,84,0,0.1)", color: "#D35400" },
    campaign_budget_refund: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    manual_credit: { bg: "rgba(29,158,117,0.1)", color: "#1D9E75" },
    manual_debit: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
  };

  const txStatusMap: Record<string, { dot: string; color: string; label: string }> = {
    completed: { dot: "#1D9E75", color: "#1D9E75", label: t("admin.wallet.completed") },
    pending: { dot: "#EAB308", color: "#EAB308", label: t("admin.wallet.pending") },
    failed: { dot: "#EF4444", color: "#EF4444", label: t("admin.wallet.failed") },
    refunded: { dot: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)", label: t("admin.wallet.refunded") },
  };

  const tc = txTypeColor[tx.type] || { bg: "rgba(255,255,255,0.04)", color: MUTED };
  const sc = txStatusMap[tx.status] || txStatusMap.completed;

  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        onClick={onToggle}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <td className="px-5 py-3 font-dm whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>
          {new Date(tx.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </td>
        <td className="px-5 py-3 font-dm" style={{ color: "rgba(255,255,255,0.7)" }}>
          {tx.description || tx.type_label}
        </td>
        <td className="px-5 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-dm" style={{ background: tc.bg, color: tc.color }}>
            {tx.type_label}
          </span>
        </td>
        <td className="px-5 py-3 text-right font-bold font-syne whitespace-nowrap">
          <span style={{ color: tx.amount >= 0 ? "#1D9E75" : "#D35400" }}>
            {tx.amount >= 0 ? "+" : ""}{formatFCFA(tx.amount)}
          </span>
        </td>
        <td className="px-5 py-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium font-dm">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
            <span style={{ color: sc.color }}>{sc.label}</span>
          </span>
        </td>
        <td className="px-5 py-3 text-center">
          {(tx.type === "wallet_recharge" || tx.status === "completed") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/brand/wallet/transactions/${tx.id}/receipt`, "_blank");
              }}
              className="transition hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.3)" }}
              title={t("admin.wallet.downloadReceipt")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <td colSpan={6} className="px-5 py-4" style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[10px] font-dm">
              <div>
                <span style={{ color: MUTED_LIGHT }}>{t("admin.wallet.transactionId")}</span>
                <p className="font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{tx.id.slice(0, 12)}...</p>
              </div>
              {tx.source_id && (
                <div>
                  <span style={{ color: MUTED_LIGHT }}>{t("admin.wallet.reference")}</span>
                  <p className="font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{tx.source_id.slice(0, 12)}...</p>
                </div>
              )}
              <div>
                <span style={{ color: MUTED_LIGHT }}>{t("admin.wallet.exactDate")}</span>
                <p className="mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {new Date(tx.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ============================================================
   INVOICES TAB
   ============================================================ */
function InvoicesTab({ invoices, invoicesLoading }: { invoices: Invoice[]; invoicesLoading: boolean }) {
  const { t } = useTranslation();

  if (invoicesLoading) {
    return (
      <div className="rounded-2xl p-10 text-center" style={CARD_STYLE}>
        <div className="h-5 w-32 rounded-lg animate-pulse mx-auto mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-3 w-48 rounded animate-pulse mx-auto" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl p-14 text-center" style={CARD_STYLE}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(211,84,0,0.1)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <p className="text-xs font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.noInvoices")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD_STYLE}>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.invoiceNumber")}</th>
              <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.period")}</th>
              <th className="text-right px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.totalSpentInvoice")}</th>
              <th className="text-center px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.campaigns")}</th>
              <th className="text-left px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>{t("admin.wallet.status")}</th>
              <th className="text-center px-5 py-3 font-medium font-dm" style={{ color: MUTED_LIGHT }}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const isFinal = inv.status === "final";
              return (
                <tr
                  key={inv.id}
                  className="transition-colors"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td className="px-5 py-3 font-mono font-semibold" style={{ color: "#D35400" }}>{inv.invoice_number}</td>
                  <td className="px-5 py-3 font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {new Date(inv.period_start).toLocaleDateString(undefined, { day: "numeric", month: "short" })} — {new Date(inv.period_end).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-right font-bold font-syne text-white">{formatFCFA(inv.total_spend_fcfa)}</td>
                  <td className="px-5 py-3 text-center font-dm" style={{ color: "rgba(255,255,255,0.5)" }}>{inv.campaign_count}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full"
                      style={{
                        background: isFinal ? "rgba(29,158,117,0.1)" : "rgba(211,84,0,0.1)",
                        color: isFinal ? "#1D9E75" : "#D35400",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isFinal ? "#1D9E75" : "#D35400" }} />
                      {isFinal ? t("admin.wallet.finalized") : t("admin.wallet.draftInvoice")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => window.open(`/api/brand/wallet/invoices/${inv.id}/pdf`, "_blank")}
                      className="transition hover:opacity-70"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                      title={t("admin.wallet.downloadInvoice")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */
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
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium font-dm">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      <span style={{ color: s.color }}>{s.label}</span>
    </span>
  );
}
