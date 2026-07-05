"use client";

import { useTranslation } from "@/lib/i18n";

export default function InterestOnboardingBanner({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 p-4 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20">
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0">&#128221;</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1D9E75] mb-1">
            {t("echo.profile.completeInterests")}
          </p>
          <p className="text-xs text-white/40 mb-3">
            {new Date() <= new Date("2026-04-30T23:59:59Z")
              ? t("echo.profile.interestRewardText")
              : t("echo.profile.interestDefaultText")}
          </p>
          <button
            onClick={onStart}
            className="px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:opacity-90 transition"
          >
            {t("echo.profile.startButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
