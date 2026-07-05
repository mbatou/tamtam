"use client";

import { useTranslation } from "@/lib/i18n";

export default function FoundingEchoBadge() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-[#FDEF42]/20 p-4 mb-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">&#129351;</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[#FDEF42]">{t("echo.profile.foundingEchoTitle")}</h3>
          <p className="text-[10px] text-white/40">{t("echo.profile.foundingEchoDesc")}</p>
        </div>
      </div>
    </div>
  );
}
