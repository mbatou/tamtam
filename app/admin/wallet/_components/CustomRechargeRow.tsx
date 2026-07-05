"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { C, INP } from "./types";

export default function CustomRechargeRow({
  rechargeAmount,
  setRechargeAmount,
  showRechargeInput,
  setShowRechargeInput,
  paying,
  onPay,
}: {
  rechargeAmount: string;
  setRechargeAmount: (value: string) => void;
  showRechargeInput: boolean;
  setShowRechargeInput: (value: boolean) => void;
  paying: boolean;
  onPay: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-3" style={C}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(211,84,0,0.1)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          {!showRechargeInput ? (
            <button
              onClick={() => setShowRechargeInput(true)}
              className="text-xs font-dm font-semibold text-white hover:opacity-80 transition"
            >
              {t("admin.wallet.customAmount")} →
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="100 000"
                className="flex-1 rounded-lg px-3 py-2 text-sm text-white font-syne font-bold focus:outline-none min-w-0"
                style={INP}
                autoFocus
              />
              <span className="text-[10px] font-dm shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>FCFA</span>
            </div>
          )}
        </div>
      </div>
      {showRechargeInput && (
        <button
          onClick={onPay}
          disabled={paying || !rechargeAmount || parseInt(rechargeAmount) < 100}
          className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-30"
          style={{ background: "#D35400" }}
        >
          {paying ? t("admin.wallet.openingWave") : t("admin.wallet.payViaWave", { amount: rechargeAmount ? formatFCFA(parseInt(rechargeAmount)) : "..." })}
        </button>
      )}
      <p className="w-full text-[9px] font-dm mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
        {t("admin.wallet.waveRedirect")}
      </p>
    </div>
  );
}
