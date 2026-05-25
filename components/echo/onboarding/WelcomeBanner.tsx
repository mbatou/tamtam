"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  if (dismissed) return null;

  return (
    <div className="mb-5 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🎉</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[#1D9E75] mb-1">
            {t("echo.onboarding.welcomeTitle")}
          </h3>
          <p className="text-xs text-white/50 mb-3">
            {t("echo.onboarding.welcomeDesc")}
          </p>
          <div className="flex gap-2">
            <a
              href="/rythmes"
              className="px-3 py-1.5 rounded-lg bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#178a65] transition"
            >
              {t("echo.onboarding.welcomeCta")}
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:bg-white/10 transition"
            >
              {t("echo.onboarding.welcomeDismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
