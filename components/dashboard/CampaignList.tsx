"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface CampaignRow {
  id: string;
  title: string;
  clicks: number;
  cpc: number;
  budget: number;
  status: "active" | "completed" | "paused" | "draft" | string;
  isBest?: boolean;
}

interface CampaignListProps {
  campaigns: CampaignRow[];
}

export default function CampaignList({ campaigns }: CampaignListProps) {
  const { t } = useTranslation();
  const maxClicks = Math.max(...campaigns.map(c => c.clicks), 1);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("admin.dashboard.campaignResults")}
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {t("admin.dashboard.last30days")}
        </p>
      </div>

      <div className="space-y-0">
        {campaigns.map((campaign, idx) => {
          const barWidth = Math.max((campaign.clicks / maxClicks) * 100, 4);
          const barColor = campaign.isBest ? "#1D9E75" : "#D35400";

          return (
            <div key={campaign.id}>
              {idx > 0 && <div className="h-px my-3" style={{ background: "rgba(255,255,255,0.05)" }} />}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold font-syne text-white truncate">
                    {campaign.title}
                  </p>
                  {campaign.isBest ? (
                    <span
                      className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(29,158,117,0.15)", color: "#5DCAA5" }}
                    >
                      {t("admin.dashboard.bestCpa")}
                    </span>
                  ) : campaign.status === "active" ? (
                    <span
                      className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(211,84,0,0.15)", color: "#F0997B" }}
                    >
                      {t("admin.dashboard.live")}
                    </span>
                  ) : (
                    <span
                      className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
                    >
                      {t("admin.dashboard.finished")}
                    </span>
                  )}
                </div>

                <div className="h-[5px] rounded w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${barWidth}%`, background: barColor }}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="text-white font-medium">{campaign.clicks.toLocaleString()} {t("common.clicks")}</span>
                  <span>·</span>
                  <span>{formatFCFA(campaign.cpc)}/{t("admin.campaigns.perClick")}</span>
                  <span>·</span>
                  <span>{formatFCFA(campaign.budget)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
