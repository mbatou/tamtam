"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination, { paginate } from "@/components/ui/Pagination";
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
  payment_method: string | null;
  created_at: string;
  users: { name: string } | null;
}

interface FinanceData {
  grossRevenue: number;
  platformCut: number;
  feePercent: number;
  sentTotal: number;
  pendingTotal: number;
  validClicks: number;
  payouts: PayoutRow[];
  payments: PaymentRow[];
}

type FinanceTab = "payout_requests" | "payout_history" | "payments" | "pending_recharges";

export default function FinancePageWrapper() {
  return <Suspense><FinancePageContent /></Suspense>;
}

function FinancePageContent() {
  const { t } = useTranslation();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FinanceTab>("payout_requests");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ payout: PayoutRow; action: "approve" | "reject"; reason?: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const PAGE_SIZE = 30;
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const openPayoutById = useCallback((finData: FinanceData, id: string) => {
    const match = finData.payouts.find((p) => p.id === id);
    if (match) {
      setSelectedPayout(match);
      if (match.status === "pending") setTab("payout_requests");
      else setTab("payout_history");
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/finance");
      const json = await res.json();
      setData(json);
      if (highlightId) openPayoutById(json, highlightId);
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setLoading(false);
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
        showToast(confirmAction.action === "approve" ? t("common.sent") : t("common.rejected"), confirmAction.action === "approve" ? "success" : "info");
        setSelectedPayout(null);
        setRejectReason("");
        setConfirmAction(null);
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setProcessing(false);
  }

  async function handleRechargeAction(paymentId: string, action: "validate" | "reject", reason?: string) {
    try {
      const res = await fetch("/api/superadmin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, action, reason }),
      });
      if (res.ok) {
        showToast(action === "validate" ? t("common.valid") : t("common.rejected"), action === "validate" ? "success" : "info");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
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

  const pendingPayouts = data.payouts.filter((p) => p.status === "pending");
  const completedPayouts = data.payouts.filter((p) => p.status !== "pending");
  const pendingRecharges = data.payments.filter((p) => p.status === "pending");
  const processedRecharges = data.payments.filter((p) => p.status !== "pending");
  const echoShare = data.grossRevenue - data.platformCut;
  const total = data.grossRevenue || 1;
  const platformPct = (data.platformCut / total) * 100;
  const paidPct = (data.sentTotal / total) * 100;
  const remainingPct = Math.max(0, 100 - platformPct - paidPct);

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">{t("superadmin.finance.title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("superadmin.dashboard.grossRevenue")} value={formatFCFA(data.grossRevenue)} accent="orange" />
        <StatCard label={t("superadmin.finance.commissionDetail", { percent: String(data.feePercent), clicks: formatNumber(data.validClicks) })} value={formatFCFA(data.platformCut)} accent="teal" />
        <StatCard label={t("superadmin.dashboard.paidToEchos")} value={formatFCFA(data.sentTotal)} accent="purple" />
        <StatCard label={t("common.pending")} value={formatFCFA(data.pendingTotal)} accent="red" />
      </div>

      {/* Reconciliation Bar */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-sm font-bold mb-4">{t("superadmin.finance.revenueDistribution")}</h3>
        <div className="flex h-6 rounded-full overflow-hidden mb-3">
          <div className="bg-gradient-primary" style={{ width: `${platformPct}%` }} />
          <div className="bg-accent" style={{ width: `${paidPct}%` }} />
          <div className="bg-white/10" style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-primary" />
            <span className="text-white/50">{t("superadmin.finance.platform")} ({Math.round(platformPct)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-white/50">{t("superadmin.finance.paid")} ({Math.round(paidPct)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/10" />
            <span className="text-white/50">{t("common.remaining")} ({Math.round(remainingPct)}%)</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-white/30">
          {t("superadmin.finance.echoShare")}: {formatFCFA(echoShare)} · {t("superadmin.finance.alreadyPaid")}: {formatFCFA(data.sentTotal)} · {t("common.pending")}: {formatFCFA(data.pendingTotal)}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setTab("payout_requests")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${
            tab === "payout_requests" ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
          }`}
        >
          {t("superadmin.finance.payoutRequests")}
          {pendingPayouts.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingPayouts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("payout_history")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${
            tab === "payout_history" ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
          }`}
        >
          {t("superadmin.finance.payoutHistory")} ({completedPayouts.length})
        </button>
        <button
          onClick={() => setTab("pending_recharges")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${
            tab === "pending_recharges" ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
          }`}
        >
          {t("superadmin.finance.pendingRecharges")}
          {pendingRecharges.length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingRecharges.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${
            tab === "payments" ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
          }`}
        >
          {t("superadmin.finance.payments")} ({processedRecharges.length})
        </button>
      </div>

      {/* Payout Requests Tab */}
      {tab === "payout_requests" && (
        <div>
          {pendingPayouts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-3">&#10003;</div>
              <h3 className="text-lg font-bold mb-1">{t("superadmin.finance.noPayoutRequests")}</h3>
              <p className="text-sm text-white/40">{t("superadmin.finance.allPayoutsProcessed")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="glass-card p-4 flex items-center justify-between hover:bg-white/5 transition cursor-pointer"
                  onClick={() => setSelectedPayout(payout)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white">
                      {payout.users?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-bold">{payout.users?.name || "—"}</div>
                      <div className="text-xs text-white/40">
                        {payout.users?.phone || ""} · {payout.provider === "wave" ? t("common.wave") : t("common.orangeMoney")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatFCFA(payout.amount)}</div>
                    <div className="text-xs text-white/30">
                      {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); requestPayoutAction(payout, "approve"); }}
                      className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition"
                    >
                      {t("common.confirm")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPayout(payout); }}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      {t("common.rejected")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payout History Tab */}
      {tab === "payout_history" && (
        <>
        {completedPayouts.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <div className="glass-card px-4 py-3">
              <span className="text-white/40 text-xs">{t("superadmin.finance.withdrawalCount")}</span>
              <div className="font-bold">{completedPayouts.length}</div>
            </div>
            <div className="glass-card px-4 py-3">
              <span className="text-white/40 text-xs">{t("superadmin.finance.avgWithdrawal")}</span>
              <div className="font-bold">{formatFCFA(Math.round(completedPayouts.reduce((s, p) => s + p.amount, 0) / completedPayouts.length))}</div>
            </div>
            <div className="glass-card px-4 py-3">
              <span className="text-white/40 text-xs">{t("superadmin.finance.totalWithdrawals")}</span>
              <div className="font-bold">{formatFCFA(completedPayouts.reduce((s, p) => s + p.amount, 0))}</div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/30 border-b border-white/5">
                <th className="pb-3 font-semibold">{t("common.date")}</th>
                <th className="pb-3 font-semibold">{t("superadmin.finance.echo")}</th>
                <th className="pb-3 font-semibold">{t("common.amount")}</th>
                <th className="pb-3 font-semibold hidden md:table-cell">{t("superadmin.finance.provider")}</th>
                <th className="pb-3 font-semibold">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {paginate(completedPayouts, historyPage, PAGE_SIZE).map((payout) => (
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
                    {payout.provider === "wave" ? t("common.wave") : t("common.orangeMoney")}
                  </td>
                  <td className="py-3">
                    <Badge status={payout.status} />
                  </td>
                </tr>
              ))}
              {completedPayouts.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-white/30 text-sm">{t("superadmin.finance.noHistory")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={historyPage} totalItems={completedPayouts.length} pageSize={PAGE_SIZE} onPageChange={setHistoryPage} />
        </>
      )}

      {/* Pending Recharges (Wave) Tab */}
      {tab === "pending_recharges" && (
        <div>
          {pendingRecharges.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-3">&#10003;</div>
              <h3 className="text-lg font-bold mb-1">{t("superadmin.finance.noRechargesPending")}</h3>
              <p className="text-sm text-white/40">{t("superadmin.finance.allRechargesProcessed")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRecharges.map((payment) => (
                <div key={payment.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                      W
                    </div>
                    <div>
                      <div className="font-bold">{payment.users?.name || "—"}</div>
                      <div className="text-xs text-white/40">
                        {payment.payment_method || "Wave"} · Ref: {payment.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatFCFA(payment.amount)}</div>
                    <div className="text-xs text-white/30">
                      {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleRechargeAction(payment.id, "validate")}
                      className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition"
                    >
                      {t("common.confirm")}
                    </button>
                    <button
                      onClick={() => handleRechargeAction(payment.id, "reject")}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      {t("common.rejected")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <p className="text-xs text-blue-300/60">
              {t("superadmin.finance.waveVerifyNotice")}
            </p>
          </div>
        </div>
      )}

      {/* Processed Recharges History Tab */}
      {tab === "payments" && (
        <>
        {processedRecharges.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <div className="glass-card px-4 py-3">
              <span className="text-white/40 text-xs">{t("superadmin.finance.paymentCount")}</span>
              <div className="font-bold">{processedRecharges.length}</div>
            </div>
            <div className="glass-card px-4 py-3">
              <span className="text-white/40 text-xs">{t("superadmin.finance.avgPayment")}</span>
              <div className="font-bold">{formatFCFA(Math.round(processedRecharges.reduce((s, p) => s + p.amount, 0) / processedRecharges.length))}</div>
            </div>
            <div className="glass-card px-4 py-3">
              <span className="text-white/40 text-xs">{t("superadmin.finance.totalPayments")}</span>
              <div className="font-bold">{formatFCFA(processedRecharges.reduce((s, p) => s + p.amount, 0))}</div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/30 border-b border-white/5">
                <th className="pb-3 font-semibold">{t("common.date")}</th>
                <th className="pb-3 font-semibold">{t("superadmin.finance.batteur")}</th>
                <th className="pb-3 font-semibold">{t("common.amount")}</th>
                <th className="pb-3 font-semibold hidden md:table-cell">{t("superadmin.finance.method")}</th>
                <th className="pb-3 font-semibold">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {paginate(processedRecharges, paymentsPage, PAGE_SIZE).map((payment) => (
                <tr key={payment.id} className="border-b border-white/5">
                  <td className="py-3 text-xs text-white/50">
                    {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 font-semibold text-sm">{payment.users?.name || "—"}</td>
                  <td className="py-3 font-bold">{formatFCFA(payment.amount)}</td>
                  <td className="py-3 hidden md:table-cell text-xs">
                    {payment.payment_method === "admin_topup" ? (
                      <span className="text-purple-400 font-bold">{t("superadmin.finance.adminTopup")}</span>
                    ) : (
                      payment.payment_method || payment.provider || "—"
                    )}
                  </td>
                  <td className="py-3">
                    <Badge status={payment.status} />
                  </td>
                </tr>
              ))}
              {processedRecharges.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-white/30 text-sm">{t("superadmin.finance.noRecharges")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={paymentsPage} totalItems={processedRecharges.length} pageSize={PAGE_SIZE} onPageChange={setPaymentsPage} />
        </>
      )}

      {/* Payout Detail / Reject Modal */}
      <Modal
        open={!!selectedPayout}
        onClose={() => { setSelectedPayout(null); setRejectReason(""); }}
        title={t("superadmin.finance.payoutRequests")}
      >
        {selectedPayout && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-bold text-white">
                {selectedPayout.users?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedPayout.users?.name || "—"}</h3>
                <p className="text-xs text-white/40">{selectedPayout.users?.phone || ""}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 text-center">
                <div className="text-2xl font-bold">{formatFCFA(selectedPayout.amount)}</div>
                <div className="text-[10px] text-white/40">{t("superadmin.finance.requestedAmount")}</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-lg font-bold">{selectedPayout.provider === "wave" ? t("common.wave") : t("common.orangeMoney")}</div>
                <div className="text-[10px] text-white/40">{t("superadmin.finance.provider")}</div>
              </div>
            </div>

            <div className="text-xs text-white/30">
              {t("superadmin.finance.requestedOn")} {new Date(selectedPayout.created_at).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <button
                onClick={() => requestPayoutAction(selectedPayout, "approve")}
                className="w-full py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm hover:bg-accent/20 transition"
              >
                {t("common.confirm")}
              </button>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("superadmin.finance.rejectReasonPlaceholder")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none h-16"
              />
              <button
                onClick={() => requestPayoutAction(selectedPayout, "reject", rejectReason)}
                className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition"
              >
                {t("common.rejected")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal (2nd step) */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={t("superadmin.finance.confirmActionTitle")}
      >
        {confirmAction && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${
              confirmAction.action === "approve"
                ? "bg-accent/5 border-accent/20"
                : "bg-red-500/5 border-red-500/20"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  confirmAction.action === "approve"
                    ? "bg-accent/20 text-accent"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {confirmAction.action === "approve" ? "✓" : "✕"}
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {confirmAction.action === "approve"
                      ? t("superadmin.finance.confirmApproveTitle")
                      : t("superadmin.finance.confirmRejectTitle")}
                  </div>
                  <div className="text-xs text-white/40">{t("superadmin.finance.confirmActionDesc")}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">{t("superadmin.finance.echo")}</span>
                  <span className="font-bold">{confirmAction.payout.users?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">{t("common.amount")}</span>
                  <span className="font-bold">{formatFCFA(confirmAction.payout.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">{t("superadmin.finance.provider")}</span>
                  <span className="font-bold">{confirmAction.payout.provider === "wave" ? t("common.wave") : t("common.orangeMoney")}</span>
                </div>
                {confirmAction.reason && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-white/40 text-xs">{t("superadmin.finance.rejectionReason")}</span>
                    <p className="text-sm mt-1">{confirmAction.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {confirmAction.action === "reject" && (
              <p className="text-xs text-red-400/70">
                {t("superadmin.finance.rejectWarning")}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={executePayoutAction}
                disabled={processing}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 ${
                  confirmAction.action === "approve"
                    ? "bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20"
                    : "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                }`}
              >
                {processing
                  ? t("common.loading")
                  : confirmAction.action === "approve"
                    ? t("superadmin.finance.confirmApproveButton")
                    : t("superadmin.finance.confirmRejectButton")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
