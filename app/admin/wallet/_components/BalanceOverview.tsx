"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { C, type SpendingPoint, type WalletData } from "./types";

export default function BalanceOverview({
  wallet,
  totalRecharged,
  spendingData,
  paying,
  onQuickRecharge,
  onOpenRechargeModal,
}: {
  wallet: WalletData;
  totalRecharged: number;
  spendingData: SpendingPoint[];
  paying: boolean;
  onQuickRecharge: (amount: number) => void;
  onOpenRechargeModal: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">

      {/* LEFT: Balance card (matches overview WalletCard) */}
      <div
        data-tour="wallet-balance"
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
            onClick={onOpenRechargeModal}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold font-dm text-white/90 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.12)", border: "0.5px solid rgba(255,255,255,0.15)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t("admin.wallet.addFunds")}
          </button>
        </div>
      </div>

      {/* CENTER: Recharge quick-actions (like Onpay's "Upcoming payments") */}
      <div data-tour="recharge-btn" className="lg:col-span-3 flex flex-col gap-3">
        {/* Quick recharge card 1 */}
        <button
          onClick={() => onQuickRecharge(25000)}
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
          onClick={() => onQuickRecharge(50000)}
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
  );
}
