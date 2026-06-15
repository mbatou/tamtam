"use client";

import { useTranslation } from "@/lib/i18n";

interface CpaIntroModalProps {
  onDismiss: () => void;
}

export default function CpaIntroModal({ onDismiss }: CpaIntroModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="fixed inset-0 bg-black/60" onClick={onDismiss} />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#0E0E1F", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="p-5">
          <h3 className="text-base font-bold font-syne mb-3">{t("echo.rythmes.cpaIntroTitle")}</h3>
          <p className="text-sm text-white/50 leading-relaxed mb-4">
            {t("echo.rythmes.cpaIntroBody")}
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-base mt-0.5">🖱</span>
              <div>
                <span className="text-xs font-bold text-[#D35400]">CPC</span>
                <p className="text-xs text-white/40 mt-0.5">{t("echo.rythmes.cpaIntroCpc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.15)" }}>
              <span className="text-base mt-0.5">💰</span>
              <div>
                <span className="text-xs font-bold text-[#1D9E75]">CPA</span>
                <p className="text-xs text-white/40 mt-0.5">{t("echo.rythmes.cpaIntroCpa")}</p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-white/30 leading-relaxed mb-4">
            💡 {t("echo.rythmes.cpaIntroTip")}
          </p>

          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#1D9E75] hover:bg-[#178a65] text-white transition"
          >
            {t("echo.rythmes.cpaIntroGotIt")}
          </button>
        </div>
      </div>
    </div>
  );
}
