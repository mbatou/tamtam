"use client";

import { useState } from "react";
import Link from "next/link";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Target, Users, ChevronDown, ChevronUp } from "lucide-react";

interface CampaignRow {
  id: string;
  title: string;
  clicks: number;
  cpc: number;
  budget: number;
  spent: number;
  status: string;
  echoCount: number;
  isBest?: boolean;
  created_at?: string;
}

interface CampaignListProps {
  campaigns: CampaignRow[];
  defaultVisible?: number;
}

function statusBadge(status: string, isBest: boolean, t: (k: string) => string) {
  if (isBest) return { label: t("admin.dashboard.bestCpa"), dotColor: "#1D9E75", textColor: "#5DCAA5" };
  switch (status) {
    case "active":    return { label: t("admin.dashboard.live"), dotColor: "#D35400", textColor: "#F0997B" };
    case "completed": return { label: t("admin.dashboard.finished"), dotColor: "rgba(255,255,255,0.2)", textColor: "rgba(255,255,255,0.4)" };
    case "paused":    return { label: t("admin.dashboard.paused"), dotColor: "#EAB308", textColor: "#FFD666" };
    case "draft":     return { label: t("admin.dashboard.draft"), dotColor: "rgba(255,255,255,0.15)", textColor: "rgba(255,255,255,0.25)" };
    default:          return { label: status, dotColor: "rgba(255,255,255,0.2)", textColor: "rgba(255,255,255,0.4)" };
  }
}

export default function CampaignList({ campaigns, defaultVisible = 3 }: CampaignListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? campaigns : campaigns.slice(0, defaultVisible);
  const hasMore = campaigns.length > defaultVisible;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#111128",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold font-syne text-white">{t("admin.dashboard.campaignResults")}</h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
            {campaigns.length}
          </span>
        </div>
        <Link href="/admin/campaigns" className="text-[11px] font-medium transition-colors" style={{ color: "#D35400" }}>
          {t("admin.dashboard.viewAll")}
        </Link>
      </div>

      {/* Table header — hidden on mobile */}
      <div className="hidden sm:grid grid-cols-12 px-5 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
        <div className="col-span-5">{t("admin.dashboard.campaign")}</div>
        <div className="col-span-2 text-right">{t("common.clicks")}</div>
        <div className="col-span-2 text-right">CPC</div>
        <div className="col-span-3 text-right">{t("admin.dashboard.budgetUsed")}</div>
      </div>

      {/* Rows */}
      <div>
        {visible.map((c, idx) => {
          const badge = statusBadge(c.status, !!c.isBest, t);
          const budgetPct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;

          return (
            <div
              key={c.id}
              className="sm:grid sm:grid-cols-12 items-center px-5 py-3 transition-colors"
              style={{
                borderBottom: idx < visible.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Campaign name + status */}
              <div className="sm:col-span-5 flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(211,84,0,0.08)" }}>
                  <Target size={14} style={{ color: "#D35400" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{c.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: badge.dotColor }} />
                    <span className="text-[10px]" style={{ color: badge.textColor }}>{badge.label}</span>
                    {c.echoCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] ml-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                        <Users size={9} /> {c.echoCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile: inline stats row */}
              <div className="sm:hidden flex items-center gap-3 mt-2 ml-11 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span className="text-white font-medium">{c.clicks.toLocaleString()} {t("common.clicks")}</span>
                <span>·</span>
                <span>{formatFCFA(c.cpc)}/clic</span>
                <span>·</span>
                <span>{budgetPct}%</span>
              </div>

              {/* Desktop columns */}
              <div className="hidden sm:block col-span-2 text-right">
                <span className="text-[13px] font-semibold text-white">{c.clicks.toLocaleString()}</span>
              </div>
              <div className="hidden sm:block col-span-2 text-right">
                <span className="text-[13px] text-white/60">{formatFCFA(c.cpc)}</span>
              </div>
              <div className="hidden sm:block col-span-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(budgetPct, 3)}%`,
                        background: c.status === "active" ? "#D35400" : c.isBest ? "#1D9E75" : "rgba(255,255,255,0.25)",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium w-8 text-right" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {budgetPct}%
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {formatFCFA(c.spent)} / {formatFCFA(c.budget)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-colors"
          style={{
            color: "rgba(255,255,255,0.4)",
            borderTop: "0.5px solid rgba(255,255,255,0.05)",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
        >
          {expanded ? (
            <><ChevronUp size={13} /> {t("admin.dashboard.showLess")}</>
          ) : (
            <><ChevronDown size={13} /> {t("admin.dashboard.showMore", { count: String(campaigns.length - defaultVisible) })}</>
          )}
        </button>
      )}
    </div>
  );
}
