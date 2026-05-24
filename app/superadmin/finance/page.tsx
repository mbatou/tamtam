"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatFCFA, formatNumber } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";
import Pagination, { paginate } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import DateRangeSelector, { type DateRange } from "@/components/ui/DateRangeSelector";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import {
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  ExternalLink,
} from "lucide-react";

interface StuckCampaign {
  id: string;
  title: string;
  status: string;
  echos: number;
  total_fcfa: number;
}

interface StuckEarningsData {
  stuck: number;
  total_fcfa: number;
  campaigns: StuckCampaign[];
}

interface FixResult {
  dry_run: boolean;
  fixed: number;
  total_fcfa: number;
  campaigns: { campaign_id: string; title: string; echos_unlocked: number }[];
}

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

interface DailyRevenue {
  date: string;
  revenue: number;
  clicks: number;
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
  dailyRevenue?: DailyRevenue[];
}

type FinanceTab = "payout_requests" | "payout_history" | "payments" | "pending_recharges";

const tooltipStyle = {
  background: "#111128",
  border: "0.5px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
  color: "#fff",
};

export default function FinancePageWrapper() {
  return <Suspense><FinancePageContent /></Suspense>;
}

function FinancePageContent() {
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

  useEffect(() => { loadData(); }, [dateRange]);

  async function loadData() {
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
      if (highlightId) openPayoutById(json, highlightId);
      if (stuckRes.ok) {
        const stuckJson = await stuckRes.json();
        setStuckData(stuckJson);
      }
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

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
  const echoShare = data.grossRevenue - data.platformCut;
  const total = data.grossRevenue || 1;
  const platformPct = (data.platformCut / total) * 100;
  const paidPct = (data.sentTotal / total) * 100;
  const remainingPct = Math.max(0, 100 - platformPct - paidPct);

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          label="Revenu brut"
          value={formatFCFA(data.grossRevenue)}
          icon={<Wallet size={16} />}
          sub={`${formatNumber(data.validClicks)} clics valides`}
        />
        <AdminStatCard
          label="Commission plateforme"
          value={formatFCFA(data.platformCut)}
          icon={<TrendingUp size={16} />}
          accent="teal"
          sub={`${data.feePercent}% de commission`}
        />
        <AdminStatCard
          label="Versé aux Échos"
          value={formatFCFA(data.sentTotal)}
          icon={<ArrowDownToLine size={16} />}
          accent="white"
        />
        <AdminStatCard
          label="En attente"
          value={formatFCFA(data.pendingTotal)}
          icon={<Clock size={16} />}
          accent={data.pendingTotal > 0 ? "orange" : "white"}
        />
      </div>

      {/* Stuck Earnings Alert */}
      {stuckData && stuckData.stuck > 0 && !fixResult && (
        <div className="mb-6 rounded-xl overflow-hidden" style={{ background: "rgba(226,75,74,0.05)", border: "0.5px solid rgba(226,75,74,0.2)" }}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(226,75,74,0.1)" }}>
                  <AlertTriangle size={18} style={{ color: "#F09595" }} />
                </div>
                <div>
                  <h3 className="font-syne font-bold" style={{ color: "#F09595" }}>Gains échos bloqués</h3>
                  <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {stuckData.stuck} écho(s) n&apos;ont pas reçu leurs gains
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-syne font-extrabold text-xl" style={{ color: "#F09595" }}>{formatFCFA(stuckData.total_fcfa)}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>à débloquer</div>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {stuckData.campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <AdminBadge status={c.status === "active" ? "active" : c.status === "completed" ? "finished" : "pending"}>{c.status}</AdminBadge>
                    <span className="font-dm text-sm font-semibold truncate text-white">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{c.echos} écho(s)</span>
                    <span className="font-syne font-bold text-sm" style={{ color: "#F09595" }}>{formatFCFA(c.total_fcfa)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setShowFixConfirm(true)}
                className="px-5 py-2.5 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(29,158,117,0.15)", color: "#5DCAA5", border: "0.5px solid rgba(29,158,117,0.3)" }}
              >
                Débloquer tous les gains
              </button>
              <p className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                Transfère vers le solde disponible et notifie chaque écho.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fix Result */}
      {fixResult && fixResult.fixed > 0 && (
        <div className="mb-6 rounded-xl p-5" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.2)" }}>
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 size={18} style={{ color: "#5DCAA5" }} />
            <div>
              <h3 className="font-syne font-bold" style={{ color: "#5DCAA5" }}>Gains débloqués</h3>
              <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{fixResult.fixed} écho(s) — {formatFCFA(fixResult.total_fcfa)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {fixResult.campaigns.map((c) => (
              <div key={c.campaign_id} className="flex items-center justify-between font-dm text-sm py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{c.title}</span>
                <span className="font-semibold" style={{ color: "#5DCAA5" }}>{c.echos_unlocked} débloqué(s)</span>
              </div>
            ))}
          </div>
          <button onClick={() => setFixResult(null)} className="mt-3 font-dm text-xs transition" style={{ color: "rgba(255,255,255,0.25)" }}>
            Masquer
          </button>
        </div>
      )}

      {/* Fix Confirmation Overlay */}
      {showFixConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}>
            <h3 className="font-syne font-bold text-lg text-white mb-4">Confirmer le déblocage</h3>
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="font-syne font-bold text-2xl text-white">{stuckData?.stuck || 0}</div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>écho(s)</div>
                </div>
                <div className="text-center">
                  <div className="font-syne font-bold text-2xl" style={{ color: "#5DCAA5" }}>{formatFCFA(stuckData?.total_fcfa || 0)}</div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>à débloquer</div>
                </div>
              </div>
            </div>
            <p className="font-dm text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Chaque écho sera notifié par email et WhatsApp.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFixConfirm(false)}
                className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                Annuler
              </button>
              <button
                onClick={executeFixStuckEarnings}
                disabled={fixingEarnings}
                className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                style={{ background: "rgba(29,158,117,0.15)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
              >
                {fixingEarnings ? "Déblocage..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Distribution Bar */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
        <h3 className="font-dm text-sm font-semibold text-white/60 mb-4">Répartition du revenu</h3>
        <div className="flex h-5 rounded-full overflow-hidden mb-3">
          <div style={{ width: `${platformPct}%`, background: "#D35400" }} />
          <div style={{ width: `${paidPct}%`, background: "#1D9E75" }} />
          <div style={{ width: `${remainingPct}%`, background: "rgba(255,255,255,0.08)" }} />
        </div>
        <div className="flex gap-5 font-dm text-xs">
          {[
            { color: "#D35400", label: `Plateforme (${Math.round(platformPct)}%)` },
            { color: "#1D9E75", label: `Versé (${Math.round(paidPct)}%)` },
            { color: "rgba(255,255,255,0.15)", label: `Restant (${Math.round(remainingPct)}%)` },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Part Échos : {formatFCFA(echoShare)} · Versé : {formatFCFA(data.sentTotal)} · En attente : {formatFCFA(data.pendingTotal)}
        </div>
      </div>

      {/* Net Position */}
      {(() => {
        const MONTHLY_FIXED_COSTS = 18450;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        const proRatedCosts = Math.round((MONTHLY_FIXED_COSTS / daysInMonth) * dayOfMonth);
        const netPosition = data.platformCut - proRatedCosts;

        return (
          <div className="rounded-xl p-5 mb-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <h3 className="font-dm text-sm font-semibold text-white/60 mb-4">Position nette</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="font-dm text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Commission gagnée</div>
                <div className="font-syne font-bold text-xl" style={{ color: "#5DCAA5" }}>{formatFCFA(data.platformCut)}</div>
              </div>
              <div>
                <div className="font-dm text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Coûts fixes estimés</div>
                <div className="font-syne font-bold text-xl" style={{ color: "#F09595" }}>{formatFCFA(proRatedCosts)}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>~{formatFCFA(MONTHLY_FIXED_COSTS)}/mois</div>
              </div>
              <div>
                <div className="font-dm text-[10px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Position nette</div>
                <div className="font-syne font-bold text-xl" style={{ color: netPosition >= 0 ? "#5DCAA5" : "#F09595" }}>
                  {netPosition >= 0 ? "+" : ""}{formatFCFA(netPosition)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Daily Revenue Chart */}
      {data.dailyRevenue && data.dailyRevenue.length > 0 && (
        <div className="rounded-xl p-5 mb-6" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <h3 className="font-dm text-sm font-semibold text-white/60 mb-4">Revenu quotidien</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => new Date(String(v)).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                formatter={(value) => [formatFCFA(Number(value)), "Commission"]}
              />
              <Bar dataKey="revenue" name="Commission" fill="#D35400" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.03)" }}>
        {([
          { key: "payout_requests" as FinanceTab, label: "Demandes de retrait", count: pendingPayouts.length, alert: pendingPayouts.length > 0 },
          { key: "payout_history" as FinanceTab, label: "Historique retraits", count: completedPayouts.length },
          { key: "pending_recharges" as FinanceTab, label: "Recharges en attente", count: pendingRecharges.length, alert: pendingRecharges.length > 0 },
          { key: "payments" as FinanceTab, label: "Recharges traitées", count: processedRecharges.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-dm text-xs font-medium transition-all whitespace-nowrap"
            style={{
              background: tab === t.key ? "rgba(211,84,0,0.12)" : "transparent",
              color: tab === t.key ? "#D35400" : "rgba(255,255,255,0.4)",
            }}
          >
            {t.label}
            {t.alert && t.count > 0 && (
              <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(226,75,74,0.15)", color: "#F09595" }}>
                {t.count}
              </span>
            )}
            {!t.alert && t.count > 0 && (
              <span style={{ color: "rgba(255,255,255,0.25)" }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Payout Requests */}
      {tab === "payout_requests" && (
        <div>
          {pendingPayouts.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "rgba(29,158,117,0.5)" }} />
              <h3 className="font-syne font-bold text-lg text-white mb-1">Aucune demande</h3>
              <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Toutes les demandes ont été traitées</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="rounded-xl p-4 flex items-center justify-between cursor-pointer transition"
                  style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}
                  onClick={() => setSelectedPayout(payout)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#141420"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#111128"; }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-dm text-sm font-bold text-white" style={{ background: "#D35400" }}>
                      {payout.users?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-dm text-sm font-semibold text-white">{payout.users?.name || "—"}</div>
                      <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {payout.users?.phone || ""} · {payout.provider === "wave" ? "Wave" : "Orange Money"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-syne font-bold text-lg text-white">{formatFCFA(payout.amount)}</div>
                    <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); requestPayoutAction(payout, "approve"); }}
                      className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                      style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                    >
                      Approuver
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPayout(payout); }}
                      className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                      style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payout History */}
      {tab === "payout_history" && (
        <>
          {completedPayouts.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { label: "Nombre de retraits", value: String(completedPayouts.length) },
                { label: "Retrait moyen", value: formatFCFA(Math.round(completedPayouts.reduce((s, p) => s + p.amount, 0) / completedPayouts.length)) },
                { label: "Total retraits", value: formatFCFA(completedPayouts.reduce((s, p) => s + p.amount, 0)) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <span className="font-dm text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
                  <div className="font-syne font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#111128" }}>
                  {["Date", "Écho", "Montant", "Fournisseur", "Statut"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${i === 3 ? "hidden md:table-cell" : ""}`}
                      style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginate(completedPayouts, historyPage, PAGE_SIZE).map((payout) => (
                  <tr key={payout.id} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-3 font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-dm text-sm font-semibold text-white">{payout.users?.name || "—"}</div>
                      <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{payout.users?.phone || ""}</div>
                    </td>
                    <td className="px-4 py-3 font-syne font-bold text-white">{formatFCFA(payout.amount)}</td>
                    <td className="px-4 py-3 hidden md:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {payout.provider === "wave" ? "Wave" : "Orange Money"}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge status={payout.status === "sent" ? "active" : payout.status === "rejected" ? "rejected" : "pending"}>
                        {payout.status === "sent" ? "Envoyé" : payout.status === "rejected" ? "Rejeté" : payout.status}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
                {completedPayouts.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Aucun historique</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination currentPage={historyPage} totalItems={completedPayouts.length} pageSize={PAGE_SIZE} onPageChange={setHistoryPage} />
          </div>
        </>
      )}

      {/* Pending Recharges */}
      {tab === "pending_recharges" && (
        <div>
          {pendingRecharges.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
              <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "rgba(29,158,117,0.5)" }} />
              <h3 className="font-syne font-bold text-lg text-white mb-1">Aucune recharge en attente</h3>
              <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Toutes les recharges ont été traitées</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRecharges.map((payment) => (
                <div key={payment.id} className="rounded-xl p-4 flex items-center justify-between transition"
                  style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-dm text-sm font-bold" style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}>
                      W
                    </div>
                    <div>
                      <div className="font-dm text-sm font-semibold text-white">{payment.users ? getBrandDisplayName(payment.users) : "—"}</div>
                      <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {payment.payment_method || "Wave"} · Ref: {payment.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-syne font-bold text-lg text-white">{formatFCFA(payment.amount)}</div>
                    <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleRechargeAction(payment.id, "validate")}
                      className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                      style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => handleRechargeAction(payment.id, "reject")}
                      className="px-4 py-2 rounded-xl font-dm text-xs font-bold transition"
                      style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "rgba(96,165,250,0.04)", border: "0.5px solid rgba(96,165,250,0.1)" }}>
            <p className="font-dm text-xs" style={{ color: "rgba(96,165,250,0.5)" }}>
              Vérifiez les transactions Wave manuellement avant validation.
            </p>
          </div>
        </div>
      )}

      {/* Processed Recharges */}
      {tab === "payments" && (
        <>
          {processedRecharges.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { label: "Total paiements", value: String(processedRecharges.length) },
                { label: "Paiement moyen", value: formatFCFA(Math.round(processedRecharges.reduce((s, p) => s + p.amount, 0) / processedRecharges.length)) },
                { label: "Total encaissé", value: formatFCFA(processedRecharges.reduce((s, p) => s + p.amount, 0)) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <span className="font-dm text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
                  <div className="font-syne font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#111128" }}>
                  {["Date", "Marque", "Montant", "Méthode", "Statut"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${i === 3 ? "hidden md:table-cell" : ""}`}
                      style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginate(processedRecharges, paymentsPage, PAGE_SIZE).map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-3 font-dm text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 font-dm text-sm font-semibold text-white">
                      {payment.users ? getBrandDisplayName(payment.users) : "—"}
                    </td>
                    <td className="px-4 py-3 font-syne font-bold text-white">{formatFCFA(payment.amount)}</td>
                    <td className="px-4 py-3 hidden md:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {payment.payment_method === "admin_topup" ? (
                        <span style={{ color: "#C084FC" }} className="font-bold">Admin Topup</span>
                      ) : (
                        payment.payment_method || payment.provider || "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge status={payment.status === "completed" ? "active" : payment.status === "rejected" ? "rejected" : "pending"}>
                        {payment.status === "completed" ? "Validé" : payment.status === "rejected" ? "Rejeté" : payment.status}
                      </AdminBadge>
                    </td>
                  </tr>
                ))}
                {processedRecharges.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Aucune recharge</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination currentPage={paymentsPage} totalItems={processedRecharges.length} pageSize={PAGE_SIZE} onPageChange={setPaymentsPage} />
          </div>
        </>
      )}

      {/* Payout Detail Drawer */}
      <AdminDrawer
        open={!!selectedPayout}
        onClose={() => { setSelectedPayout(null); setRejectReason(""); }}
        title="Demande de retrait"
        subtitle={selectedPayout?.users?.name || undefined}
      >
        {selectedPayout && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-dm text-xl font-bold text-white" style={{ background: "#D35400" }}>
                {selectedPayout.users?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="font-syne font-bold text-lg text-white">{selectedPayout.users?.name || "—"}</h3>
                <p className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{selectedPayout.users?.phone || ""}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="font-syne font-bold text-2xl text-white">{formatFCFA(selectedPayout.amount)}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Montant demandé</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="font-syne font-bold text-lg text-white">{selectedPayout.provider === "wave" ? "Wave" : "Orange Money"}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Fournisseur</div>
              </div>
            </div>

            <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              Demandé le {new Date(selectedPayout.created_at).toLocaleString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="space-y-3 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => requestPayoutAction(selectedPayout, "approve")}
                className="w-full py-3 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(29,158,117,0.12)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}
              >
                Approuver le retrait
              </button>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Raison du rejet (optionnel)..."
                className="w-full rounded-xl px-4 py-3 font-dm text-sm resize-none h-16 focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
              <button
                onClick={() => requestPayoutAction(selectedPayout, "reject", rejectReason)}
                className="w-full py-2.5 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#F09595" }}
              >
                Rejeter
              </button>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Confirmation Overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }}>
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: confirmAction.action === "approve" ? "rgba(29,158,117,0.05)" : "rgba(226,75,74,0.05)",
                border: `0.5px solid ${confirmAction.action === "approve" ? "rgba(29,158,117,0.15)" : "rgba(226,75,74,0.15)"}`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                {confirmAction.action === "approve" ? (
                  <CheckCircle2 size={20} style={{ color: "#5DCAA5" }} />
                ) : (
                  <XCircle size={20} style={{ color: "#F09595" }} />
                )}
                <div>
                  <div className="font-syne font-bold text-sm text-white">
                    {confirmAction.action === "approve" ? "Confirmer l'approbation" : "Confirmer le rejet"}
                  </div>
                  <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Cette action est irréversible</div>
                </div>
              </div>

              <div className="space-y-2 font-dm text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Écho</span>
                  <span className="font-semibold text-white">{confirmAction.payout.users?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Montant</span>
                  <span className="font-semibold text-white">{formatFCFA(confirmAction.payout.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Fournisseur</span>
                  <span className="font-semibold text-white">{confirmAction.payout.provider === "wave" ? "Wave" : "Orange Money"}</span>
                </div>
                {confirmAction.reason && (
                  <div className="pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
                    <span className="font-dm text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Raison du rejet</span>
                    <p className="font-dm text-sm mt-1 text-white">{confirmAction.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {confirmAction.action === "reject" && (
              <p className="font-dm text-xs mb-4" style={{ color: "#F09595" }}>
                Le montant sera recrédité sur le solde de l&apos;écho.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                Annuler
              </button>
              <button
                onClick={executePayoutAction}
                disabled={processing}
                className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                style={{
                  background: confirmAction.action === "approve" ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.1)",
                  border: `0.5px solid ${confirmAction.action === "approve" ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`,
                  color: confirmAction.action === "approve" ? "#5DCAA5" : "#F09595",
                }}
              >
                {processing ? "Traitement..." : confirmAction.action === "approve" ? "Confirmer l'envoi" : "Confirmer le rejet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
