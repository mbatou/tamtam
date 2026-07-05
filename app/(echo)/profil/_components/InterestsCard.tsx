"use client";

import { useTranslation } from "@/lib/i18n";
import type { InterestItem } from "./types";

export default function InterestsCard({
  userInterests,
  userSignals,
  onEdit,
}: {
  userInterests: InterestItem[];
  userSignals: InterestItem[];
  onEdit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">{t("echo.profile.myInterests")}</h3>
        <button
          onClick={onEdit}
          className="text-xs text-[#1D9E75] font-semibold hover:underline"
        >
          {t("echo.profile.modify")}
        </button>
      </div>
      {userInterests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {userInterests.map((cat) => (
            <span key={cat.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-xs">
              <span>{cat.emoji}</span>
              <span className="font-semibold">{cat.name_fr}</span>
            </span>
          ))}
        </div>
      )}
      {userSignals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {userSignals.map((sig) => (
            <span key={sig.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
              <span>{sig.emoji}</span>
              <span className="font-semibold">{sig.name_fr}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
