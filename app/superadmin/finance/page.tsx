"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import DateRangeSelector, { type DateRange } from "@/components/ui/DateRangeSelector";
import { Scale, ExternalLink } from "lucide-react";
import {
  FinanceData,
  FinanceTab,
  PayoutRow,
  StuckEarningsData,
  FixResult,
  ConfirmPayoutAction,
} from "./_components/types";
import FinanceKpiCards from "./_components/FinanceKpiCards";
import StuckEarningsAlert from "./_components/StuckEarningsAlert";
import FixResultCard from "./_components/FixResultCard";
import FixConfirmModal from "./_components/FixConfirmModal";
import RevenueDistributionBar from "./_components/RevenueDistributionBar";
import NetPositionCard from "./_components/NetPositionCard";
import DailyRevenueChart from "./_components/DailyRevenueChart";
import FinanceTabs from "./_components/FinanceTabs";
import PayoutRequestsList from "./_components/PayoutRequestsList";
import PayoutHistoryTable from "./_components/PayoutHistoryTable";
import PendingRechargesList from "./_components/PendingRechargesList";
import ProcessedRechargesTable from "./_components/ProcessedRechargesTable";
import PayoutDetailDrawer from "./_components/PayoutDetailDrawer";
import PayoutConfirmModal from "./_components/PayoutConfirmModal";

export default function FinancePageWrapper() {
  return <Suspense><FinancePageContent /></Suspense>;
}

function FinancePageContent() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FinanceTab>("payout_requests");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmPayoutAction | null>(null);
  const [processing, setProcessing] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [dateRange, setDateRange] = useState<DateRange>({ key: "all", from: null, to: null });
  const [stuckData, setStuckData] = useState<StuckEarningsData | null>(null);
  const [fixingEarnings, setFixingEarnings] = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [showFixConfirm, setShowFixConfirm] = useState(false);

  const openPayoutById = useCallback((finData: FinanceData, id: string) => {
    const match = finData.payouts.find((p) => p.id === id);
    if (match) {
      setSelectedPayout(match);
      if (match.status === "pending") setTab("payout_requests");
      else setTab("payout_history");
    }
  }, []);

  // Refs so loadData can read the latest values without re-running the fetch
  // effect when they change.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const highlightIdRef = useRef(highlightId);
  highlightIdRef.current = highlightId;

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);
      const qs = params.toString();
      const [res, stuckRes] = await Promise.all([
        fetch(`/api/superadmin/finance${qs ? `?${qs}` : ""}`),
        fetch("/api/superadmin/fix-stuck-earnings"),
      ]);
      const json = await res.json();
      setData(json);
      if (highlightIdRef.current) openPayoutById(json, highlightIdRef.current);
      if (stuckRes.ok) {
        const stuckJson = await stuckRes.json();
        setStuckData(stuckJson);
      }
    } catch {
      showToastRef.current("Erreur de chargement", "error");
    }
    setLoading(false);
  }, [dateRange, openPayoutById]);

  useEffect(() => { loadData(); }, [loadData]);

  async function executeFixStuckEarnings() {
    setFixingEarnings(true);
    try {
      const res = await fetch("/api/superadmin/fix-stuck-earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: false }),
      });
      if (res.ok) {
        const result = await res.json();
        setFixResult(result);
        setShowFixConfirm(false);
        setStuckData({ stuck: 0, total_fcfa: 0, campaigns: [] });
        showToast(`${result.fixed} écho(s) crédité(s) — ${result.total_fcfa.toLocaleString("fr-FR")} FCFA débloqués`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setFixingEarnings(false);
  }

  function requestPayoutAction(payout: PayoutRow, action: "approve" | "reject", reason?: string) {
    setConfirmAction({ payout, action, reason });
  }

  async function executePayoutAction() {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/superadmin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: confirmAction.payout.id, action: confirmAction.action, reason: confirmAction.reason }),
      });
      if (res.ok) {
        showToast(confirmAction.action === "approve" ? "Paiement envoyé" : "Demande rejetée", confirmAction.action === "approve" ? "success" : "info");
        setSelectedPayout(null);
        setRejectReason("");
        setConfirmAction(null);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setProcessing(false);
  }

  async function handleRechargeAction(paymentId: string, action: "validate" | "reject") {
    try {
      const res = await fetch("/api/superadmin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, action }),
      });
      if (res.ok) {
        showToast(action === "validate" ? "Recharge validée" : "Recharge rejetée", action === "validate" ? "success" : "info");
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
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const pendingPayouts = data.payouts.filter((p) => p.status === "pending");
  const completedPayouts = data.payouts.filter((p) => p.status !== "pending");
  const pendingRecharges = data.payments.filter((p) => p.status === "pending");
  const processedRecharges = data.payments.filter((p) => p.status !== "pending");

  return (
    <div className="p-6 max-w-[1400px]">
      {ToastComponent}

      {/* Header with date range */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange.key} onChange={setDateRange} />
        </div>
        <Link
          href="/superadmin/wave-reconciliation"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm font-medium transition"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
        >
          <Scale size={14} />
          Réconciliation
          <ExternalLink size={12} />
        </Link>
      </div>

      <FinanceKpiCards
        grossRevenue={data.grossRevenue}
        platformCut={data.platformCut}
        feePercent={data.feePercent}
        sentTotal={data.sentTotal}
        pendingTotal={data.pendingTotal}
        validClicks={data.validClicks}
      />

      {stuckData && stuckData.stuck > 0 && !fixResult && (
        <StuckEarningsAlert stuckData={stuckData} onRequestFix={() => setShowFixConfirm(true)} />
      )}

      {fixResult && fixResult.fixed > 0 && (
        <FixResultCard fixResult={fixResult} onDismiss={() => setFixResult(null)} />
      )}

      {showFixConfirm && (
        <FixConfirmModal
          stuckData={stuckData}
          fixingEarnings={fixingEarnings}
          onCancel={() => setShowFixConfirm(false)}
          onConfirm={executeFixStuckEarnings}
        />
      )}

      <RevenueDistributionBar
        grossRevenue={data.grossRevenue}
        platformCut={data.platformCut}
        sentTotal={data.sentTotal}
        pendingTotal={data.pendingTotal}
      />

      <NetPositionCard platformCut={data.platformCut} />

      {data.dailyRevenue && data.dailyRevenue.length > 0 && (
        <DailyRevenueChart dailyRevenue={data.dailyRevenue} />
      )}

      <FinanceTabs
        tab={tab}
        onTabChange={setTab}
        pendingPayoutsCount={pendingPayouts.length}
        completedPayoutsCount={completedPayouts.length}
        pendingRechargesCount={pendingRecharges.length}
        processedRechargesCount={processedRecharges.length}
      />

      {tab === "payout_requests" && (
        <PayoutRequestsList
          pendingPayouts={pendingPayouts}
          onSelect={setSelectedPayout}
          onRequestAction={requestPayoutAction}
        />
      )}

      {tab === "payout_history" && (
        <PayoutHistoryTable
          completedPayouts={completedPayouts}
          historyPage={historyPage}
          onPageChange={setHistoryPage}
        />
      )}

      {tab === "pending_recharges" && (
        <PendingRechargesList pendingRecharges={pendingRecharges} onAction={handleRechargeAction} />
      )}

      {tab === "payments" && (
        <ProcessedRechargesTable
          processedRecharges={processedRecharges}
          paymentsPage={paymentsPage}
          onPageChange={setPaymentsPage}
        />
      )}

      <PayoutDetailDrawer
        selectedPayout={selectedPayout}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onClose={() => { setSelectedPayout(null); setRejectReason(""); }}
        onRequestAction={requestPayoutAction}
      />

      {confirmAction && (
        <PayoutConfirmModal
          confirmAction={confirmAction}
          processing={processing}
          onCancel={() => setConfirmAction(null)}
          onConfirm={executePayoutAction}
        />
      )}
    </div>
  );
}
