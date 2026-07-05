"use client";

import Image from "next/image";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";
import type { Campaign } from "@/lib/types";
import type { CampaignStatsMap } from "./types";

export interface CampaignListViewProps {
  campaigns: Campaign[];
  campaignStats: CampaignStatsMap;
  error: string | null;
  onNewCampaign: () => void;
  onOpenDetail: (campaign: Campaign) => void;
  /** Edit — routes lead-gen campaigns to the lead-gen editor, others to the form. */
  onEdit: (campaign: Campaign) => void;
  /** Launch draft — routes lead-gen campaigns to the lead-gen editor, others submit for review. */
  onLaunchDraft: (campaign: Campaign) => void;
  onResubmit: (campaignId: string) => void;
  onRelaunch: (campaign: Campaign) => void;
  actionLoading: string | null;
}

export default function CampaignListView({ vm }: { vm: CampaignListViewProps }) {
  const { t } = useTranslation();
  const {
    campaigns, campaignStats, error,
    onNewCampaign, onOpenDetail, onEdit, onLaunchDraft, onResubmit, onRelaunch, actionLoading,
  } = vm;

  // Best CPC computed once outside the loop
  const allFinishedCampaigns = campaigns.filter(c => c.status === "completed" && c.spent > 0);
  const bestCPCId = allFinishedCampaigns.length > 1
    ? [...allFinishedCampaigns].sort((a, b) => {
        const aCPC = a.cpc > 0 ? Math.floor(a.spent / a.cpc) : 0;
        const bCPC = b.cpc > 0 ? Math.floor(b.spent / b.cpc) : 0;
        return (aCPC > 0 ? a.spent / aCPC : Infinity) - (bCPC > 0 ? b.spent / bCPC : Infinity);
      })[0]?.id
    : null;

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">{t("admin.campaigns.title")}</h1>
          <p className="text-[11px] font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {campaigns.length} {campaigns.length === 1 ? t("admin.campaigns.rythmeCount") : t("admin.campaigns.rythmeCountPlural")} ·{" "}
            {campaigns.filter(c => c.status === "active").length} {t("admin.dashboard.live").toLowerCase()}
          </p>
        </div>
        <button
          onClick={onNewCampaign}
          data-tour="new-campaign-btn"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold text-white transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-orange-900/20"
          style={{ background: "#D35400" }}
          aria-label={t("admin.campaigns.newRythme")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("admin.campaigns.newRythme")}
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-5 p-3 rounded-xl text-xs" style={{ background: error.startsWith("✓") ? "rgba(29,158,117,0.1)" : "rgba(239,68,68,0.1)", border: `0.5px solid ${error.startsWith("✓") ? "rgba(29,158,117,0.3)" : "rgba(239,68,68,0.3)"}`, color: error.startsWith("✓") ? "#5DCAA5" : "#EF4444" }}>
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(211,84,0,0.1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3m0 0L9.5 7.5M12 3l2.5 4.5" /></svg>
          </div>
          <p className="text-sm font-semibold font-syne text-white mb-1">{t("admin.campaigns.noRythmes")}</p>
          <p className="text-[11px] mb-4 font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.noRythmesDesc")}</p>
          <button
            onClick={onNewCampaign}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all active:scale-[0.97]"
            style={{ background: "#D35400" }}
          >
            {t("admin.campaigns.createFirst")}
          </button>
        </div>
      ) : (
        <div data-tour="campaign-list" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {campaigns.map((campaign) => {
            const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
            const stats = campaignStats[campaign.id];
            const realClicks = stats?.realValidClicks ?? 0;
            const echoCount = stats?.echoCount ?? 0;
            const estimatedClicks = realClicks > 0 ? realClicks : (campaign.cpc > 0 ? Math.floor(campaign.spent / campaign.cpc) : 0);
            const actualCPC = estimatedClicks > 0 ? Math.round(campaign.spent / estimatedClicks) : campaign.cpc;
            const isFinished = campaign.status === "completed";
            const budgetConsumed = progress >= 100;
            const isActive = campaign.status === "active";
            const isPaused = campaign.status === "paused";
            const isDraft = campaign.status === "draft" && (campaign.moderation_status !== "pending" || (campaign.objective === "lead_generation" && !campaign.landing_page_id));
            const isPendingReview = campaign.status === "draft" && campaign.moderation_status === "pending" && !(campaign.objective === "lead_generation" && !campaign.landing_page_id);
            const isRejected = campaign.status === "rejected";

            const statusConfig = isActive
              ? { dot: "#D35400", label: t("common.active"), bg: "rgba(211,84,0,0.1)" }
              : isPaused
              ? { dot: "#EAB308", label: t("common.paused"), bg: "rgba(234,179,8,0.1)" }
              : isFinished
              ? { dot: "rgba(255,255,255,0.2)", label: t("common.finished"), bg: "rgba(255,255,255,0.04)" }
              : isDraft
              ? { dot: "rgba(255,255,255,0.15)", label: t("admin.campaigns.draft"), bg: "rgba(255,255,255,0.04)" }
              : isPendingReview
              ? { dot: "#F59E0B", label: t("admin.campaigns.pendingValidation"), bg: "rgba(245,158,11,0.1)" }
              : isRejected
              ? { dot: "#EF4444", label: t("common.rejected"), bg: "rgba(239,68,68,0.1)" }
              : { dot: "rgba(255,255,255,0.2)", label: campaign.status, bg: "rgba(255,255,255,0.04)" };

            const objectiveConfig = (campaign.objective || "traffic") === "awareness"
              ? { label: t("admin.campaigns.objectiveAwareness"), color: "#3B82F6", bg: "rgba(59,130,246,0.1)" }
              : (campaign.objective || "traffic") === "lead_generation"
              ? { label: t("admin.campaigns.objectiveLeadGen"), color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" }
              : { label: t("admin.campaigns.objectiveTraffic"), color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };

            return (
              <div
                key={campaign.id}
                role="article"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail(campaign); } }}
                className="rounded-xl overflow-hidden transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D35400]/50"
                style={{
                  background: "#111128",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(211,84,0,0.2)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
                onClick={() => onOpenDetail(campaign)}
              >
                {/* Image / placeholder */}
                {campaign.creative_urls && campaign.creative_urls.length > 0 ? (
                  <div className="h-24 overflow-hidden">
                    <Image src={campaign.creative_urls[0]} alt={campaign.title} width={400} height={96} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-12 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}

                <div className="p-2.5">
                  {/* Title + objective badge */}
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <h3 className="text-[11px] font-bold font-syne text-white truncate leading-tight">{campaign.title}</h3>
                    <span className="text-[8px] font-medium px-1 py-px rounded-full shrink-0 leading-tight" style={{ background: objectiveConfig.bg, color: objectiveConfig.color }}>
                      {objectiveConfig.label}
                    </span>
                  </div>

                  {/* Status + echo count */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: statusConfig.dot }} />
                    <span className="text-[9px] font-medium" style={{ color: statusConfig.dot === "rgba(255,255,255,0.2)" || statusConfig.dot === "rgba(255,255,255,0.15)" ? "rgba(255,255,255,0.4)" : statusConfig.dot }}>{statusConfig.label}</span>
                    {echoCount > 0 && (
                      <span className="text-[8px] ml-auto" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {echoCount} {t("admin.campaigns.echosCount")}
                      </span>
                    )}
                  </div>

                  {/* Budget bar */}
                  <div className="mb-2">
                    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                          background: budgetConsumed ? "#1D9E75" : isActive ? "#D35400" : "rgba(255,255,255,0.2)",
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <span>{formatFCFA(campaign.spent)}</span>
                      <span style={{ color: budgetConsumed ? "#5DCAA5" : "rgba(255,255,255,0.3)" }}>
                        {budgetConsumed ? t("admin.campaigns.fullyConsumed") : formatFCFA(campaign.budget)}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-1 text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span className="font-medium text-white">{estimatedClicks.toLocaleString()} {t("common.clicks")}</span>
                    <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
                    {(campaign.pricing_model || "cpc") === "cpa" ? (
                      <span>{formatFCFA(campaign.cpa_amount || 0)}/{t("admin.campaigns.cpaPerAction")}</span>
                    ) : (
                      <span>{formatFCFA(actualCPC)}/{t("admin.campaigns.perClick")}</span>
                    )}
                  </div>

                  {/* CPA badge */}
                  {(campaign.pricing_model || "cpc") === "cpa" && (
                    <div className="mt-1">
                      <span className="text-[8px] font-semibold px-1.5 py-px rounded-full" style={{ background: "rgba(211,84,0,0.12)", color: "#D35400" }}>
                        {t("admin.campaigns.cpaBadge")}
                      </span>
                    </div>
                  )}

                  {/* Best CPC badge */}
                  {bestCPCId === campaign.id && allFinishedCampaigns.length > 1 && (
                    <div className="mt-1.5">
                      <span className="text-[8px] font-semibold px-1.5 py-px rounded-full" style={{ background: "rgba(29,158,117,0.12)", color: "#5DCAA5" }}>
                        {t("admin.campaigns.bestCPC")}
                      </span>
                    </div>
                  )}

                  {/* Action buttons — stop propagation so card click doesn't fire */}
                  {isDraft && (
                    <div className="flex gap-1.5 mt-2 pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(campaign); }}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                        style={{ background: "rgba(211,84,0,0.08)", color: "#D35400" }}
                        aria-label={`${t("common.edit")} ${campaign.title}`}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onLaunchDraft(campaign); }}
                        disabled={actionLoading !== null}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors disabled:opacity-40"
                        style={{ background: "#D35400" }}
                        aria-label={`${t("admin.campaigns.launchDraft")} ${campaign.title}`}
                      >
                        {actionLoading === "submitDraft" ? "..." : t("admin.campaigns.launchDraft")}
                      </button>
                    </div>
                  )}

                  {isRejected && (
                    <div className="flex gap-1.5 mt-2 pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(campaign); }}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                        style={{ background: "rgba(211,84,0,0.08)", color: "#D35400" }}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onResubmit(campaign.id); }}
                        disabled={actionLoading !== null}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors disabled:opacity-40"
                        style={{ background: "#D35400" }}
                      >
                        {actionLoading === "resubmit" ? "..." : t("admin.campaigns.resubmit")}
                      </button>
                    </div>
                  )}

                  {isFinished && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRelaunch(campaign); }}
                      className="w-full mt-2 pt-2 pb-0 text-center text-[10px] font-semibold transition-colors"
                      style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", color: "#D35400" }}
                      aria-label={`${t("admin.campaigns.relaunch")} ${campaign.title}`}
                    >
                      {t("admin.campaigns.relaunch")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
