"use client";

import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Users } from "lucide-react";

interface CampaignRow {
  id: string;
  title: string;
  clicks: number;
  cpc: number;
  budget: number;
  spent: number;
  status: "active" | "completed" | "paused" | "draft" | string;
  echoCount: number;
  isBest?: boolean;
}

interface CampaignListProps {
  campaigns: CampaignRow[];
}

function statusLabel(status: string, t: (k: string) => string): { label: string; bg: string; color: string } {
  switch (status) {
    case "active":
      return { label: t("admin.dashboard.live"), bg: "rgba(211,84,0,0.15)", color: "#F0997B" };
    case "completed":
      return { label: t("admin.dashboard.finished"), bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" };
    case "paused":
      return { label: t("admin.dashboard.paused"), bg: "rgba(255,200,0,0.12)", color: "#FFD666" };
    case "draft":
      return { label: t("admin.dashboard.draft"), bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)" };
    default:
      return { label: status, bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" };
  }
}

export default function CampaignList({ campaigns }: CampaignListProps) {
  const { t } = useTranslation();

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
          {campaigns.length} {campaigns.length === 1 ? "rythme" : "rythmes"}
        </p>
      </div>

      <div className="space-y-0">
        {campaigns.map((campaign, idx) => {
          const budgetPct = campaign.budget > 0
            ? Math.min(100, Math.round((campaign.spent / campaign.budget) * 100))
            : 0;
          const barColor = campaign.isBest ? "#1D9E75" : campaign.status === "active" ? "#D35400" : "rgba(255,255,255,0.2)";
          const badge = campaign.isBest
            ? { label: t("admin.dashboard.bestCpa"), bg: "rgba(29,158,117,0.15)", color: "#5DCAA5" }
            : statusLabel(campaign.status, t);

          return (
            <div key={campaign.id}>
              {idx > 0 && <div className="h-px my-3" style={{ background: "rgba(255,255,255,0.05)" }} />}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold font-syne text-white truncate">
                    {campaign.title}
                  </p>
                  <span
                    className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Budget consumption bar */}
                <div className="h-[5px] rounded w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${Math.max(budgetPct, 2)}%`, background: barColor }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{campaign.clicks.toLocaleString()} {t("common.clicks")}</span>
                    <span>·</span>
                    <span>{formatFCFA(campaign.cpc)}/{t("admin.campaigns.perClick")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.echoCount > 0 && (
                      <>
                        <Users size={10} />
                        <span>{campaign.echoCount}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{formatFCFA(campaign.spent)} / {formatFCFA(campaign.budget)}</span>
                    <span className="text-[10px]">({budgetPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
