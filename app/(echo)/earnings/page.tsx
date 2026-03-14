"use client";

import { useEffect, useState } from "react";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import type { User, Payout } from "@/lib/types";

export default function EarningsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, payoutsRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/payouts"),
    ]);

    if (userRes.ok) {
      const userData = await userRes.json();
      setUser(userData);
    }
    if (payoutsRes.ok) {
      const payoutsData = await payoutsRes.json();
      setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
    }
    setLoading(false);
  }

  async function requestPayout() {
    if (!user || user.balance < MIN_PAYOUT_AMOUNT) return;
    setRequesting(true);

    const res = await fetch("/api/echo/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: user.balance,
        provider: user.mobile_money_provider,
      }),
    });

    if (res.ok) {
      showToast(t("echo.earnings.requestSent"), "success");
      await loadData();
    } else {
      showToast(t("echo.earnings.requestError"), "error");
    }
    setRequesting(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-36 rounded-2xl" />
        <div className="skeleton h-6 w-40 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
    );
  }

  const canWithdraw = (user?.balance || 0) >= MIN_PAYOUT_AMOUNT;
  const hasPendingPayout = payouts.some((p) => p.status === "pending");

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {ToastComponent}

      <h1 className="text-xl font-bold mb-5">{t("echo.earnings.title")}</h1>

      {/* Balance card */}
      <div className="glass-card p-5 mb-5 bg-gradient-to-br from-accent/10 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">{t("echo.earnings.availableBalance")}</p>
            <p className="text-3xl font-black">{formatFCFA(user?.balance || 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/30">{t("echo.earnings.totalEarned")}</p>
            <p className="text-sm font-bold text-accent">{formatFCFA(user?.total_earned || 0)}</p>
          </div>
        </div>

        {hasPendingPayout ? (
          <div className="p-3 rounded-xl bg-primary-light/10 border border-primary-light/20 text-sm text-primary-light flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-light border-t-transparent rounded-full animate-spin shrink-0" />
            {t("echo.earnings.processing")}
          </div>
        ) : (
          <button
            onClick={requestPayout}
            disabled={!canWithdraw || requesting}
            className="btn-primary w-full text-center text-sm !py-3 disabled:opacity-40"
          >
            {requesting
              ? t("echo.earnings.sending")
              : t("echo.earnings.withdrawVia", { amount: formatFCFA(user?.balance || 0), provider: user?.mobile_money_provider === "wave" ? t("common.wave") : t("common.orangeMoney") })}
          </button>
        )}

        {!canWithdraw && !hasPendingPayout && (
          <p className="text-[10px] text-white/30 mt-2.5 text-center">
            {t("echo.earnings.minWithdraw")} {formatFCFA(MIN_PAYOUT_AMOUNT)}
          </p>
        )}
      </div>

      {/* Payout history */}
      <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">{t("echo.earnings.history")}</h2>
      <div className="space-y-2">
        {payouts.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-xs text-white/30">{t("echo.earnings.noWithdraw")}</p>
          </div>
        ) : (
          payouts.map((payout) => (
            <div key={payout.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  payout.status === "sent" ? "bg-accent/10 text-accent" :
                  payout.status === "pending" ? "bg-primary-light/10 text-primary-light" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  {payout.status === "sent" ? "✓" : payout.status === "pending" ? "⏳" : "✕"}
                </div>
                <div>
                  <p className="text-sm font-bold">{formatFCFA(payout.amount)}</p>
                  <p className="text-[10px] text-white/30">
                    {payout.provider === "wave" ? t("common.wave") : t("common.orangeMoney")} · {timeAgo(payout.created_at)}
                  </p>
                </div>
              </div>
              <span className={`badge-${payout.status} text-[10px]`}>
                {payout.status === "pending"
                  ? t("common.pending")
                  : payout.status === "sent"
                  ? t("common.sent")
                  : t("common.failed")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
