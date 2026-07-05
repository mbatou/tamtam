"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { useBrandContext } from "@/lib/brand-context-client";
import PermissionDenied from "@/components/dashboard/PermissionDenied";

import BalanceOverview from "./_components/BalanceOverview";
import CustomRechargeRow from "./_components/CustomRechargeRow";
import InvoicesTab from "./_components/InvoicesTab";
import RechargeModal from "./_components/RechargeModal";
import SpendingTab from "./_components/SpendingTab";
import TransactionsTab from "./_components/TransactionsTab";
import WalletSkeleton from "./_components/WalletSkeleton";
import WalletTabsBar from "./_components/WalletTabsBar";
import type {
  Campaign, Invoice, Payment, SpendingPoint, Tab, WalletData, WalletTransaction,
} from "./_components/types";

export default function AdminWalletWrapper() {
  return (
    <Suspense fallback={<WalletSkeleton />}>
      <AdminWalletGate />
    </Suspense>
  );
}

function AdminWalletGate() {
  const brandCtx = useBrandContext();
  if (!brandCtx.can("VIEW_WALLET")) {
    return <PermissionDeniedWithI18n />;
  }
  return <AdminWalletPage />;
}

function PermissionDeniedWithI18n() {
  const { t } = useTranslation();
  return <PermissionDenied message={t("workspace.walletDenied")} />;
}

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
  const [spendingData, setSpendingData] = useState<SpendingPoint[]>([]);

  const totalRecharged = useMemo(() => payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0), [payments]);

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
      <BalanceOverview
        wallet={wallet}
        totalRecharged={totalRecharged}
        spendingData={spendingData}
        paying={paying}
        onQuickRecharge={handlePayment}
        onOpenRechargeModal={() => setShowRechargeModal(true)}
      />

      {/* Custom recharge row */}
      <CustomRechargeRow
        rechargeAmount={rechargeAmount}
        setRechargeAmount={setRechargeAmount}
        showRechargeInput={showRechargeInput}
        setShowRechargeInput={setShowRechargeInput}
        paying={paying}
        onPay={() => handlePayment()}
      />

      {/* ====== TABS — Onpay-style with "Recent transactions" + "Sort by" ====== */}
      <WalletTabsBar
        tab={tab}
        setTab={setTab}
        txFilter={txFilter}
        onTxFilterChange={(value) => { setTxFilter(value); setTxPage(1); }}
        txFrom={txFrom}
        txTo={txTo}
      />

      {/* ====== TAB: RECENT TRANSACTIONS ====== */}
      {tab === "recent" && (
        <TransactionsTab
          txs={txs}
          payments={payments}
          txLoading={txLoading}
          expandedTx={expandedTx}
          setExpandedTx={setExpandedTx}
          txPage={txPage}
          txPages={txPages}
          onPageChange={(page) => { setTxPage(page); loadTransactions(page); }}
        />
      )}

      {/* ====== TAB: SPENDING ANALYSIS ====== */}
      {tab === "spending" && <SpendingTab spendingData={spendingData} campaigns={campaigns} />}

      {/* ====== TAB: INVOICES ====== */}
      {tab === "invoices" && <InvoicesTab invoices={invoices} invoicesLoading={invoicesLoading} />}

      {/* ====== RECHARGE MODAL ====== */}
      {showRechargeModal && (
        <RechargeModal
          balance={wallet.balance}
          rechargeAmount={rechargeAmount}
          setRechargeAmount={setRechargeAmount}
          paying={paying}
          payError={payError}
          onClose={() => { setShowRechargeModal(false); setRechargeAmount(""); setPayError(null); }}
          onPay={() => { handlePayment(parseInt(rechargeAmount)); setShowRechargeModal(false); }}
        />
      )}
    </div>
  );
}
