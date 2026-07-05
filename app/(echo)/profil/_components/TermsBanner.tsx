"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function TermsBanner({
  acceptingTerms,
  onAccept,
}: {
  acceptingTerms: boolean;
  onAccept: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0">&#9888;&#65039;</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-400 mb-1">{t("echo.profile.termsRequired")}</p>
          <p className="text-xs text-white/40 mb-3">
            {t("echo.profile.termsRequiredDesc")}{" "}
            <Link href="/terms" target="_blank" className="text-[#1D9E75] font-semibold hover:underline">
              {t("echo.profile.readTerms")}
            </Link>
          </p>
          <button
            onClick={onAccept}
            disabled={acceptingTerms}
            className="px-4 py-2 rounded-xl bg-[#1D9E75] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {acceptingTerms ? "..." : t("echo.profile.acceptTerms")}
          </button>
        </div>
      </div>
    </div>
  );
}
