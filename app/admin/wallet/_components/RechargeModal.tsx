"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { INP } from "./types";

export default function RechargeModal({
  balance,
  rechargeAmount,
  setRechargeAmount,
  paying,
  payError,
  onClose,
  onPay,
}: {
  balance: number;
  rechargeAmount: string;
  setRechargeAmount: (value: string) => void;
  paying: boolean;
  payError: string | null;
  onClose: () => void;
  onPay: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-6"
        style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.08)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(211,84,0,0.12)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div>
            <p className="text-base font-bold font-syne text-white">{t("admin.wallet.recharge")}</p>
            <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.wallet.availableBalance")}: {formatFCFA(balance)}</p>
          </div>
        </div>

        {/* Quick amount buttons */}
        <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.quickRecharge")}</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[10000, 25000, 50000, 75000, 100000, 250000].map((amt) => (
            <button
              key={amt}
              onClick={() => setRechargeAmount(String(amt))}
              className="rounded-xl py-2.5 text-xs font-syne font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: rechargeAmount === String(amt) ? "#D35400" : "rgba(255,255,255,0.04)",
                border: rechargeAmount === String(amt) ? "1px solid #D35400" : "0.5px solid rgba(255,255,255,0.08)",
              }}
            >
              {formatFCFA(amt)}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.wallet.customAmount")}</p>
        <div className="flex items-center gap-2 mb-5">
          <input
            type="number"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            placeholder="100 000"
            className="flex-1 rounded-xl px-4 py-3 text-sm text-white font-syne font-bold focus:outline-none"
            style={INP}
          />
          <span className="text-[11px] font-dm shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>FCFA</span>
        </div>

        {/* Error in modal */}
        {payError && (
          <div className="mb-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
            {payError}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
          className="w-full rounded-xl py-3.5 text-sm font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: "#D35400" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {paying ? t("admin.wallet.openingWave") : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount) || 0) : "0 FCFA" })}
        </button>
      </div>
    </div>
  );
}
