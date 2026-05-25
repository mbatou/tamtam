"use client";

import { useEffect, useState } from "react";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { MIN_PAYOUT_AMOUNT, ECHO_SHARE_PERCENT } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n";
import type { User, Payout } from "@/lib/types";
import { requestNotificationPermission, canAskNotification } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import BottomSheet from "@/components/echo/BottomSheet";

export default function EarningsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [lastWithdrawn, setLastWithdrawn] = useState(0);
  const [minPayout, setMinPayout] = useState(MIN_PAYOUT_AMOUNT);
  const [showNotifCTA, setShowNotifCTA] = useState(true);
  const [campaignEarnings, setCampaignEarnings] = useState<{ id: string; name: string; image_url: string | null; myClicks: number; myEarnings: number }[]>([]);
  const [avgCpc, setAvgCpc] = useState(25);
  const [topEchoEarnings, setTopEchoEarnings] = useState(0);
  const [balanceData, setBalanceData] = useState<{
    available: number; pending: number; total: number; min_withdrawal: number;
    pending_campaigns: { campaign_name: string; amount_fcfa: number; click_count: number; unlock_date: string }[];
  } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const { showToast, ToastComponent } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, payoutsRes, settingsRes, breakdownRes, balanceRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/payouts"),
      fetch("/api/echo/settings"),
      fetch("/api/echo/earnings-breakdown"),
      fetch("/api/echo/balance"),
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
    if (breakdownRes.ok) {
      const breakdownData = await breakdownRes.json();
      setCampaignEarnings(breakdownData.campaignEarnings || []);
      setAvgCpc(breakdownData.avgCpc || 25);
      setTopEchoEarnings(breakdownData.topEchoEarnings || 0);
    }
    if (balanceRes.ok) {
      const bd = await balanceRes.json();
      setBalanceData(bd);
      if (bd.min_withdrawal) setMinPayout(bd.min_withdrawal);
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

    try {
      const res = await fetch("/api/echo/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          provider: user?.mobile_money_provider || "wave",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        trackEvent.echoWithdraw(amount);
        setLastWithdrawn(data.fee ? amount - data.fee : amount);
        setWithdrawSuccess(true);
        setShowWithdrawSheet(false);
        setWithdrawAmount("");
        await loadData();
      } else {
        setWithdrawError(data.error || t("echo.earnings.requestError"));
        showToast(data.error || t("echo.earnings.requestError"), "error");
      }
    } catch {
      setWithdrawError(t("common.networkRetry"));
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
      <div className="px-4 py-5 space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-36 rounded-2xl" />
        <div className="skeleton h-6 w-40 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
    );
  }

  const availableBalance = balanceData?.available ?? user?.available_balance ?? user?.balance ?? 0;
  const pendingBalance = balanceData?.pending ?? user?.pending_balance ?? 0;
  const canWithdraw = availableBalance >= minPayout;
  const hasPendingPayout = payouts.some((p) => p.status === "pending" || p.status === "processing");
  const totalEarned = user?.total_earned || 0;
  const balance = availableBalance;

  return (
    <div className="px-4 py-5">
      {ToastComponent}

      <h1 className="text-xl font-bold font-syne mb-5">{t("echo.earnings.title")}</h1>

      {/* Withdrawal success card */}
      {withdrawSuccess && (
        <div className="rounded-2xl p-5 mb-5 echo-earnings-bg border border-[#1D9E75]/20">
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

          {showNotifCTA && canAskNotification() && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔔</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{t("echo.dashboard.notifNewRythme")}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{t("echo.dashboard.enableNotifEarnings")}</p>
                </div>
                <button
                  onClick={async () => {
                    await requestNotificationPermission();
                    setShowNotifCTA(false);
                  }}
                  className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg text-xs font-medium shrink-0"
                >
                  {t("echo.dashboard.enableNotif")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Balance cards row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Available balance */}
        <div className="echo-earnings-bg rounded-2xl p-4 border border-[#1D9E75]/20 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">{t("echo.earnings.availableBalance")}</p>
              <p className="text-3xl font-black text-[#D35400]">{formatFCFA(balance)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30">{t("echo.earnings.totalEarned")}</p>
              <p className="text-sm font-bold text-[#D35400]">{formatFCFA(totalEarned)}</p>
            </div>
          </div>

          {hasPendingPayout ? (
            <div className="mt-3 p-3 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-sm text-[#1D9E75] flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin shrink-0" />
              {t("echo.earnings.processing")}
            </div>
          ) : (
            <button
              onClick={() => { setShowWithdrawSheet(true); setWithdrawAmount(""); setWithdrawError(""); }}
              disabled={!canWithdraw}
              className={`w-full mt-3 text-center text-sm py-3 rounded-xl font-bold transition ${
                canWithdraw
                  ? "bg-[#1D9E75] hover:bg-[#178a65] text-white"
                  : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
              }`}
            >
              {t("echo.earnings.withdraw")}
            </button>
          )}

          {!canWithdraw && !hasPendingPayout && (
            <p className="text-[10px] text-white/30 mt-2 text-center">
              {t("echo.earnings.minWithdraw")} {formatFCFA(minPayout)}
            </p>
          )}
        </div>
      </div>

      {/* Pending balance card */}
      {pendingBalance > 0 && (
        <div className="rounded-2xl p-5 mb-5 bg-white/[0.03] border border-[#D35400]/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-0.5">Gains en cours</p>
              <p className="text-2xl font-black text-[#D35400]">{formatFCFA(pendingBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/30">Gains totaux</p>
              <p className="text-sm font-bold text-white/60">{formatFCFA(availableBalance + pendingBalance)}</p>
            </div>
          </div>

          {balanceData && balanceData.pending_campaigns.length > 0 && (
            <div className="space-y-2 mt-3">
              {balanceData.pending_campaigns.map((pe) => (
                <div key={pe.campaign_name} className="flex justify-between items-center text-sm py-1.5 border-t border-white/5 first:border-0">
                  <div>
                    <span className="text-white/60 text-xs">{pe.campaign_name}</span>
                    <span className="text-white/20 text-[10px] ml-1.5">{pe.click_count} clics</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-semibold text-xs">{formatFCFA(pe.amount_fcfa)}</span>
                    <p className="text-white/20 text-[10px]">
                      {new Date(pe.unlock_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingBalance > 0 && balanceData?.pending_campaigns.length === 0 && (
            <p className="text-xs text-white/30 mt-2">Acceptez une campagne pour commencer</p>
          )}
        </div>
      )}

      {/* Explanation toggle */}
      <button
        onClick={() => setShowExplanation(!showExplanation)}
        className="text-xs text-white/30 hover:text-white/50 transition w-full text-center mb-4"
      >
        {showExplanation ? "Masquer l'explication" : "Pourquoi mes gains sont en attente ?"}
      </button>

      {showExplanation && (
        <div className="rounded-xl bg-white/[0.03] border-l-4 border-[#1D9E75] p-4 mb-5 text-xs text-white/50 space-y-2">
          <p>
            Vos gains de chaque campagne sont d&eacute;bloqu&eacute;s &agrave; la fin de celle-ci.
            Cela nous permet de v&eacute;rifier que tous vos clics sont valides.
          </p>
          <p>
            Maximum 30 jours d&apos;attente. Si une campagne est longue, vos gains
            sont d&eacute;bloqu&eacute;s tous les 30 jours automatiquement.
          </p>
        </div>
      )}

      {/* Earning breakdown by source */}
      {campaignEarnings.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
          <h3 className="text-white font-bold mb-3">{t("echo.earnings.earningsDetail")}</h3>
          <div className="space-y-2">
            <div className="text-xs text-white/30 uppercase tracking-wider">Campagnes</div>
            {campaignEarnings.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  {c.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                  )}
                  <div>
                    <div className="text-white text-sm">{c.name}</div>
                    <div className="text-white/30 text-xs">{c.myClicks} clics</div>
                  </div>
                </div>
                <span className="text-[#D35400] font-bold text-sm">
                  {c.myEarnings.toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earning potential — shown when balance is low */}
      {balance < 500 && (
        <div className="bg-gradient-to-r from-[#D35400]/10 to-yellow-500/10 border border-[#D35400]/20 rounded-xl p-4 mb-5">
          <h4 className="text-white font-bold text-sm mb-2">💡 Ton potentiel ce mois</h4>
          <p className="text-gray-400 text-sm">
            Si tu partages 5 rythmes et g&eacute;n&egrave;res 50 clics, tu pourrais gagner environ{" "}
            <span className="text-[#D35400] font-bold">
              {(avgCpc * 50 * ECHO_SHARE_PERCENT / 100).toLocaleString("fr-FR")} FCFA
            </span>
          </p>
          {topEchoEarnings > 0 && (
            <p className="text-gray-500 text-xs mt-2">
              Les meilleurs &Eacute;chos gagnent {topEchoEarnings.toLocaleString("fr-FR")}+ FCFA par semaine!
            </p>
          )}
        </div>
      )}

      {/* Payout history */}
      <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">{t("echo.earnings.history")}</h2>
      <div className="space-y-2">
        {payouts.length === 0 ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
            <p className="text-xs text-white/30">{t("echo.earnings.noWithdraw")}</p>
          </div>
        ) : (
          payouts.map((payout) => (
            <div key={payout.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  payout.status === "sent" ? "bg-[#1D9E75]/10 text-[#1D9E75]" :
                  (payout.status === "pending" || payout.status === "processing") ? "bg-[#D35400]/10 text-[#D35400]" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  {payout.status === "sent" ? "✓" : (payout.status === "pending" || payout.status === "processing") ? "⏳" : "✕"}
                </div>
                <div>
                  <p className="text-sm font-bold">{formatFCFA(payout.amount)}</p>
                  <p className="text-[10px] text-white/30">
                    {payout.provider === "wave" ? t("common.wave") : t("common.orangeMoney")} · {timeAgo(payout.created_at)}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                payout.status === "sent" ? "bg-[#1D9E75]/15 text-[#1D9E75] border-[#1D9E75]/20" :
                (payout.status === "pending" || payout.status === "processing") ? "bg-[#D35400]/15 text-[#D35400] border-[#D35400]/20" :
                "bg-red-500/15 text-red-400 border-red-500/20"
              }`}>
                {(payout.status === "pending" || payout.status === "processing")
                  ? t("common.pending")
                  : payout.status === "sent"
                  ? t("common.sent")
                  : t("common.failed")}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Withdraw bottom sheet */}
      <BottomSheet
        open={showWithdrawSheet}
        onClose={() => { setShowWithdrawSheet(false); setWithdrawAmount(""); setWithdrawError(""); }}
        title={t("echo.earnings.withdraw")}
      >
        <div className="space-y-4">
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
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
                      ? "bg-[#1D9E75] text-white"
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
              className="flex-1 text-center text-sm py-3 rounded-xl font-bold bg-[#1D9E75] hover:bg-[#178a65] text-white transition disabled:opacity-40"
            >
              {requesting
                ? t("echo.earnings.sending")
                : t("echo.earnings.confirmWithdraw", {
                    provider: user?.mobile_money_provider === "wave" ? t("common.wave") : t("common.orangeMoney"),
                  })}
            </button>
            <button
              onClick={() => { setShowWithdrawSheet(false); setWithdrawAmount(""); setWithdrawError(""); }}
              className="px-4 py-3 rounded-xl border border-white/10 text-sm text-white/50 hover:bg-white/5 transition"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
