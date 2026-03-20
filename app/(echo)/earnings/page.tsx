"use client";

import { useEffect, useState } from "react";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import type { User, Payout } from "@/lib/types";
import { requestNotificationPermission, canAskNotification } from "@/lib/notifications";

export default function EarningsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [lastWithdrawn, setLastWithdrawn] = useState(0);
  const [minPayout, setMinPayout] = useState(MIN_PAYOUT_AMOUNT);
  const [showNotifCTA, setShowNotifCTA] = useState(true);
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, payoutsRes, settingsRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/payouts"),
      fetch("/api/echo/settings"),
    ]);

    if (userRes.ok) {
      const userData = await userRes.json();
      setUser(userData);
    }
    if (payoutsRes.ok) {
      const payoutsData = await payoutsRes.json();
      setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
    }
    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      if (settingsData.min_payout_fcfa) setMinPayout(settingsData.min_payout_fcfa);
    }
    setLoading(false);
  }

  function roundToFive(n: number) {
    return Math.floor(n / 5) * 5;
  }

  function validateAmount(val: string): string {
    const num = parseInt(val);
    if (!num || num <= 0) return t("echo.earnings.enterAmount");
    if (num < minPayout) return t("echo.earnings.minWithdraw") + " " + formatFCFA(minPayout);
    if (num % 5 !== 0) return t("echo.earnings.multipleOfFive");
    if (num > (user?.balance || 0)) return t("echo.earnings.insufficientBalance");
    return "";
  }

  async function requestPayout() {
    const amount = parseInt(withdrawAmount);
    const err = validateAmount(withdrawAmount);
    if (err) {
      setWithdrawError(err);
      return;
    }

    setRequesting(true);
    setWithdrawError("");

    const res = await fetch("/api/echo/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        provider: user?.mobile_money_provider,
      }),
    });

    if (res.ok) {
      setLastWithdrawn(amount);
      setWithdrawSuccess(true);
      setShowWithdrawForm(false);
      setWithdrawAmount("");
      await loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || t("echo.earnings.requestError"), "error");
    }
    setRequesting(false);
  }

  function shareWithdrawal() {
    const text = t("echo.earnings.shareText", {
      amount: formatFCFA(lastWithdrawn),
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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

  const canWithdraw = (user?.balance || 0) >= minPayout;
  const hasPendingPayout = payouts.some((p) => p.status === "pending");
  const totalEarned = user?.total_earned || 0;
  const balance = user?.balance || 0;

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      {ToastComponent}

      <h1 className="text-xl font-bold mb-5">{t("echo.earnings.title")}</h1>

      {/* Withdrawal success card */}
      {withdrawSuccess && (
        <div className="glass-card p-5 mb-5 bg-gradient-to-br from-accent/10 to-transparent border border-accent/20">
          <div className="text-center space-y-3">
            <p className="text-2xl">✅</p>
            <p className="text-sm font-bold">
              {t("echo.earnings.withdrawSent", { amount: formatFCFA(lastWithdrawn) })}
            </p>
            <p className="text-xs text-white/40">{t("echo.earnings.withdrawSentHint")}</p>
            <button
              onClick={shareWithdrawal}
              className="py-2.5 px-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-bold"
            >
              📸 {t("echo.earnings.shareGain")}
            </button>
            <button
              onClick={() => setWithdrawSuccess(false)}
              className="block mx-auto text-xs text-white/30 mt-1"
            >
              {t("common.close")}
            </button>
          </div>

          {/* Notification CTA after withdrawal */}
          {showNotifCTA && canAskNotification() && (
            <div className="bg-card rounded-xl p-4 mt-4 border border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔔</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    Tu veux savoir quand un nouveau rythme est disponible?
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Active les notifications — tu ne rateras plus aucune opportunité de gagner.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await requestNotificationPermission();
                    setShowNotifCTA(false);
                  }}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-medium shrink-0"
                >
                  Activer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Balance card */}
      <div className="glass-card p-5 mb-5 bg-gradient-to-br from-accent/10 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">{t("echo.earnings.availableBalance")}</p>
            <p className="text-3xl font-black">{formatFCFA(balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/30">{t("echo.earnings.totalEarned")}</p>
            <p className="text-sm font-bold text-accent">{formatFCFA(totalEarned)}</p>
          </div>
        </div>

        {hasPendingPayout ? (
          <div className="p-3 rounded-xl bg-primary-light/10 border border-primary-light/20 text-sm text-primary-light flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-light border-t-transparent rounded-full animate-spin shrink-0" />
            {t("echo.earnings.processing")}
          </div>
        ) : showWithdrawForm ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1.5">
                {t("echo.earnings.withdrawAmountLabel")}
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(""); }}
                placeholder={t("echo.earnings.amountPlaceholder", { max: formatFCFA(roundToFive(balance)) })}
                min={minPayout}
                max={roundToFive(balance)}
                step={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
              <p className="text-[10px] text-white/30 mt-1">
                {t("echo.earnings.multipleOfFiveHint")}
              </p>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2">
              {[
                roundToFive(balance),
                roundToFive(balance * 0.5),
                roundToFive(balance * 0.25),
              ]
                .filter((a) => a >= minPayout)
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((amt) => (
                  <button
                    key={amt}
                    onClick={() => { setWithdrawAmount(amt.toString()); setWithdrawError(""); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      withdrawAmount === amt.toString()
                        ? "bg-gradient-primary text-white"
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {formatFCFA(amt)}
                  </button>
                ))}
            </div>

            {withdrawError && (
              <p className="text-xs text-red-400">{withdrawError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={requestPayout}
                disabled={requesting || !withdrawAmount}
                className="btn-primary flex-1 text-center text-sm !py-3 disabled:opacity-40"
              >
                {requesting
                  ? t("echo.earnings.sending")
                  : t("echo.earnings.confirmWithdraw", {
                      provider: user?.mobile_money_provider === "wave" ? t("common.wave") : t("common.orangeMoney"),
                    })}
              </button>
              <button
                onClick={() => { setShowWithdrawForm(false); setWithdrawAmount(""); setWithdrawError(""); }}
                className="px-4 py-3 rounded-btn border border-white/10 text-sm text-white/50 hover:bg-white/5 transition"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowWithdrawForm(true)}
            disabled={!canWithdraw}
            className={`w-full text-center text-sm !py-3 rounded-btn font-bold transition ${
              canWithdraw
                ? "btn-primary"
                : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
            }`}
          >
            {t("echo.earnings.withdraw")}
          </button>
        )}

        {!canWithdraw && !hasPendingPayout && !showWithdrawForm && (
          <p className="text-[10px] text-white/30 mt-2.5 text-center">
            {t("echo.earnings.minWithdraw")} {formatFCFA(minPayout)}
          </p>
        )}
      </div>

      {/* Earning potential — shown when balance is low */}
      {totalEarned < 2500 && (
        <div className="glass-card p-4 mb-5 border border-accent/10">
          <p className="text-xs text-white/40 flex items-center gap-1.5">
            <span>💡</span>
            {t("echo.earnings.potentialHint")}
          </p>
          <p className="text-xs text-accent font-bold mt-1">
            {t("echo.earnings.topEchosEarn")}
          </p>
        </div>
      )}

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
