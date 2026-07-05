"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { ProfileStats } from "./types";

export default function StatsRow({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
        <p className="text-lg font-black">{stats.totalClicks}</p>
        <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.validClicks")}</p>
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
        <p className="text-lg font-black">{stats.activeCampaigns}</p>
        <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.rythmesJoined")}</p>
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
        <p className="text-lg font-black text-[#D35400]">{formatFCFA(stats.totalEarned)}</p>
        <p className="text-[9px] text-white/40 font-semibold">{t("common.earned")}</p>
      </div>
    </div>
  );
}
