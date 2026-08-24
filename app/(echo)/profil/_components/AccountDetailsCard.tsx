"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { User } from "@/lib/types";

export default function AccountDetailsCard({ user }: { user: User | null }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/5 mb-5">
      <div className="flex justify-between px-4 py-3">
        <span className="text-xs text-white/40">{t("echo.profile.balance")}</span>
        {/* available_balance, not the legacy `balance` column — that one is
            stale for Échos, so the profile was showing a different (lower)
            figure than the earnings page for the same person. */}
        <span className="text-xs font-bold text-[#D35400]">
          {formatFCFA(user?.available_balance ?? user?.balance ?? 0)}
        </span>
      </div>
      <div className="flex justify-between px-4 py-3">
        <span className="text-xs text-white/40">{t("echo.profile.totalEarned")}</span>
        <span className="text-xs font-bold text-[#D35400]">{formatFCFA(user?.total_earned || 0)}</span>
      </div>
      <div className="flex justify-between px-4 py-3">
        <span className="text-xs text-white/40">{t("echo.profile.paymentMethod")}</span>
        <span className="text-xs font-semibold">
          {user?.mobile_money_provider === "wave" ? t("common.wave") : t("common.orangeMoney")}
        </span>
      </div>
      <div className="flex justify-between px-4 py-3">
        <span className="text-xs text-white/40">{t("common.city")}</span>
        <span className="text-xs font-semibold">{user?.city || "—"}</span>
      </div>
    </div>
  );
}
