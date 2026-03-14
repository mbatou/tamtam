"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
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

  async function handlePayout(payoutId: string, action: "approve" | "reject", reason?: string) {
    try {
      const res = await fetch("/api/superadmin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId, action, reason }),
      });
      if (res.ok) {
        showToast(action === "approve" ? t("common.sent") : t("common.rejected"), action === "approve" ? "success" : "info");
        setSelectedPayout(null);
        setRejectReason("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
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
        <StatCard label={`Commission (${data.feePercent}%)`} value={formatFCFA(data.platformCut)} accent="teal" />
        <StatCard label="Paye aux Echos" value={formatFCFA(data.sentTotal)} accent="purple" />
        <StatCard label={t("common.pending")} value={formatFCFA(data.pendingTotal)} accent="red" />
      </div>

      {/* Reconciliation Bar */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-sm font-bold mb-4">Repartition des revenus</h3>
        <div className="flex h-6 rounded-full overflow-hidden mb-3">
          <div className="bg-gradient-primary" style={{ width: `${platformPct}%` }} />
          <div className="bg-accent" style={{ width: `${paidPct}%` }} />
          <div className="bg-white/10" style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-primary" />
            <span className="text-white/50">Plateforme ({Math.round(platformPct)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-white/50">Paye ({Math.round(paidPct)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/10" />
            <span className="text-white/50">Restant ({Math.round(remainingPct)}%)</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-white/30">
          Part Echos: {formatFCFA(echoShare)} · Deja paye: {formatFCFA(data.sentTotal)} · En attente: {formatFCFA(data.pendingTotal)}
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
              <h3 className="text-lg font-bold mb-1">Aucune demande en attente</h3>
              <p className="text-sm text-white/40">Toutes les demandes de paiement ont ete traitees.</p>
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
                        {payout.users?.phone || ""} · {payout.provider === "wave" ? "Wave" : "Orange Money"}
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
                      onClick={(e) => { e.stopPropagation(); handlePayout(payout.id, "approve"); }}
                      className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-bold hover:bg-accent/20 transition"
                    >
                      Payer
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPayout(payout); }}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      Refuser
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/30 border-b border-white/5">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Echo</th>
                <th className="pb-3 font-semibold">Montant</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Fournisseur</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {completedPayouts.map((payout) => (
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
                    {payout.provider === "wave" ? "Wave" : "Orange Money"}
                  </td>
                  <td className="py-3">
                    <Badge status={payout.status} />
                  </td>
                </tr>
              ))}
              {completedPayouts.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-white/30 text-sm">Aucun historique</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Recharges (Wave) Tab */}
      {tab === "pending_recharges" && (
        <div>
          {pendingRecharges.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-3">&#10003;</div>
              <h3 className="text-lg font-bold mb-1">Aucune recharge en attente</h3>
              <p className="text-sm text-white/40">Toutes les recharges Wave ont été traitées.</p>
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
                      Valider
                    </button>
                    <button
                      onClick={() => handleRechargeAction(payment.id, "reject")}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <p className="text-xs text-blue-300/60">
              Vérifie les paiements sur le dashboard Wave avant de valider. La validation crédite automatiquement le solde du batteur.
            </p>
          </div>
        </div>
      )}

      {/* Processed Recharges History Tab */}
      {tab === "payments" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/30 border-b border-white/5">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Batteur</th>
                <th className="pb-3 font-semibold">Montant</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Methode</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {processedRecharges.map((payment) => (
                <tr key={payment.id} className="border-b border-white/5">
                  <td className="py-3 text-xs text-white/50">
                    {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 font-semibold text-sm">{payment.users?.name || "—"}</td>
                  <td className="py-3 font-bold">{formatFCFA(payment.amount)}</td>
                  <td className="py-3 hidden md:table-cell text-xs">
                    {payment.payment_method === "admin_topup" ? (
                      <span className="text-purple-400 font-bold">Recharge admin</span>
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
                <tr><td colSpan={5} className="py-6 text-center text-white/30 text-sm">Aucune recharge</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                <div className="text-[10px] text-white/40">Montant demande</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-lg font-bold">{selectedPayout.provider === "wave" ? "Wave" : "Orange Money"}</div>
                <div className="text-[10px] text-white/40">Fournisseur</div>
              </div>
            </div>

            <div className="text-xs text-white/30">
              Demande le {new Date(selectedPayout.created_at).toLocaleDateString("fr-FR", {
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
                onClick={() => handlePayout(selectedPayout.id, "approve")}
                className="w-full py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm hover:bg-accent/20 transition"
              >
                Confirmer le paiement
              </button>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Raison du refus (optionnel)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none h-16"
              />
              <button
                onClick={() => handlePayout(selectedPayout.id, "reject", rejectReason)}
                className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 transition"
              >
                Refuser le paiement
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
