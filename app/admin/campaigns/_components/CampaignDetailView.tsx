"use client";

import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { SITE_URL, LEAD_GEN_SETUP_FEE_FCFA } from "@/lib/constants";
import type { Campaign } from "@/lib/types";
import ConversionsTab from "./ConversionsTab";
import DeleteConfirmModal from "./DeleteConfirmModal";
import LeadsTab from "./LeadsTab";
import PerformanceSection from "./PerformanceSection";
import { getStatusLabel } from "./types";
import type { CampaignAction, ConvData, DetailTab, Lead, PerfData } from "./types";

export interface CampaignDetailViewProps {
  campaign: Campaign;
  onBack: () => void;
  /** Edit — routes lead-gen campaigns to the lead-gen editor, others to the form. */
  onEdit: (campaign: Campaign) => void;
  /** Launch draft — routes lead-gen campaigns to the lead-gen editor, others submit for review. */
  onLaunchDraft: (campaign: Campaign) => void;
  onAction: (campaignId: string, action: CampaignAction) => void;
  actionLoading: string | null;
  detailTab: DetailTab;
  setDetailTab: Dispatch<SetStateAction<DetailTab>>;
  landingSlug: string | null;
  leads: Lead[];
  leadsLoading: boolean;
  leadActionLoading: string | null;
  onLeadAction: (leadId: string, action: "verify" | "reject") => void;
  perf: PerfData | null;
  perfLoading: boolean;
  convData: ConvData | null;
  convLoading: boolean;
  convError: string | null;
  convPage: number;
  setConvPage: Dispatch<SetStateAction<number>>;
  showDeleteConfirm: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export default function CampaignDetailView({ vm }: { vm: CampaignDetailViewProps }) {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    campaign: c, onBack, onEdit, onLaunchDraft, onAction, actionLoading,
    detailTab, setDetailTab, landingSlug,
    leads, leadsLoading, leadActionLoading, onLeadAction,
    perf, perfLoading,
    convData, convLoading, convError, convPage, setConvPage,
    showDeleteConfirm, onCancelDelete, onConfirmDelete,
  } = vm;

  const progress = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
  const remaining = Math.max(0, c.budget - c.spent);
  const budgetConsumed = c.spent >= c.budget;
  const isActive = c.status === "active";
  const isPaused = c.status === "paused";
  const isLeadGenDraftWithoutLP = c.objective === "lead_generation" && !c.landing_page_id;
  const isDraft = c.status === "draft" && (c.moderation_status !== "pending" || isLeadGenDraftWithoutLP);
  const isPendingReview = c.status === "draft" && c.moderation_status === "pending" && !isLeadGenDraftWithoutLP;
  const isRejected = c.status === "rejected";
  const isEnded = c.status === "completed";

  return (
    <div className="p-6 lg:p-8" style={{ maxWidth: "100%" }}>
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-medium transition mb-6" style={{ color: "rgba(255,255,255,0.35)" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        {t("admin.campaigns.backToRythmes")}
      </button>

      {/* Draft banner */}
      {isDraft && (
        <div className="mb-6 p-4 rounded-2xl flex items-center justify-between" style={{ background: "rgba(234,179,8,0.06)", border: "0.5px solid rgba(234,179,8,0.15)" }}>
          <div>
            <p className="text-sm font-bold font-syne" style={{ color: "#EAB308" }}>{t("admin.campaigns.draft")}</p>
            <p className="text-xs font-dm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.draftNotice")}</p>
          </div>
          <div className="flex gap-2">
            {c.objective === "lead_generation" && (
              <button onClick={() => onEdit(c)} className="px-5 py-2.5 rounded-xl text-sm font-bold transition" style={{ background: "rgba(211,84,0,0.1)", color: "#D35400" }}>
                {t("common.edit")}
              </button>
            )}
            <button
              onClick={() => onLaunchDraft(c)}
              disabled={actionLoading !== null}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-40"
              style={{ background: "#D35400" }}
            >
              {actionLoading === "submitDraft" ? "..." : t("admin.campaigns.launchDraft")}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold font-syne text-white">{c.title}</h1>
            {(() => {
              const sc = isActive
                ? { dot: "#D35400", label: getStatusLabel(c, t), bg: "rgba(211,84,0,0.1)" }
                : isPaused
                ? { dot: "#EAB308", label: getStatusLabel(c, t), bg: "rgba(234,179,8,0.1)" }
                : isEnded
                ? { dot: "rgba(255,255,255,0.2)", label: getStatusLabel(c, t), bg: "rgba(255,255,255,0.04)" }
                : isDraft
                ? { dot: "rgba(255,255,255,0.15)", label: getStatusLabel(c, t), bg: "rgba(255,255,255,0.04)" }
                : isPendingReview
                ? { dot: "#F59E0B", label: getStatusLabel(c, t), bg: "rgba(245,158,11,0.1)" }
                : isRejected
                ? { dot: "#EF4444", label: getStatusLabel(c, t), bg: "rgba(239,68,68,0.1)" }
                : { dot: "rgba(255,255,255,0.2)", label: getStatusLabel(c, t), bg: "rgba(255,255,255,0.04)" };
              return (
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.dot === "rgba(255,255,255,0.2)" || sc.dot === "rgba(255,255,255,0.15)" ? "rgba(255,255,255,0.4)" : sc.dot }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                  {sc.label}
                </span>
              );
            })()}
            {(() => {
              const oc = (c.objective || "traffic") === "awareness"
                ? { label: t("admin.campaigns.objectiveAwareness"), color: "#3B82F6", bg: "rgba(59,130,246,0.1)" }
                : (c.objective || "traffic") === "lead_generation"
                ? { label: t("admin.campaigns.objectiveLeadGen"), color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" }
                : { label: t("admin.campaigns.objectiveTraffic"), color: "#1D9E75", bg: "rgba(29,158,117,0.1)" };
              return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: oc.bg, color: oc.color }}>{oc.label}</span>;
            })()}
            {(c.pricing_model || "cpc") === "cpa" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(211,84,0,0.12)", color: "#D35400" }}>
                {t("admin.campaigns.cpaBadge")} · {c.cpa_event} · {formatFCFA(c.cpa_amount || 0)}/{t("admin.campaigns.cpaPerAction")}
              </span>
            )}
          </div>
          {c.description && <p className="text-sm max-w-xl font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{c.description}</p>}
          {c.target_cities && c.target_cities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.target_cities.map((city) => (
                <span key={city} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(211,84,0,0.08)", color: "#D35400" }}>{city}</span>
              ))}
            </div>
          )}
          <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>{timeAgo(c.created_at)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <button
              onClick={() => onLaunchDraft(c)}
              disabled={actionLoading !== null}
              className="px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ background: "rgba(211,84,0,0.1)", color: "#D35400" }}
            >
              {actionLoading === "submitDraft" ? "..." : t("admin.campaigns.launchDraft")}
            </button>
          )}
          {isActive && (
            <button onClick={() => onAction(c.id, "pause")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40" style={{ background: "rgba(234,179,8,0.08)", color: "#EAB308" }}>
              {actionLoading === "pause" ? "..." : t("admin.campaigns.pause")}
            </button>
          )}
          {isPaused && (
            <button onClick={() => onAction(c.id, "activate")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40" style={{ background: "rgba(29,158,117,0.08)", color: "#1D9E75" }}>
              {actionLoading === "activate" ? "..." : t("admin.campaigns.reactivate")}
            </button>
          )}
          {(isActive || isPaused) && (
            <button onClick={() => onAction(c.id, "complete")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
              {actionLoading === "complete" ? "..." : t("admin.campaigns.finish")}
            </button>
          )}
          {c.objective === "lead_generation" && c.landing_page_id && (
            <button
              onClick={() => router.push(`/admin/campaigns/${c.id}/preview`)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition"
              style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}
            >
              {t("admin.campaigns.viewPage")}
            </button>
          )}
          {!isEnded && (
            <button
              onClick={() => onEdit(c)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition"
              style={{ background: "rgba(211,84,0,0.08)", color: "#D35400" }}
            >
              {t("common.edit")}
            </button>
          )}
          <button onClick={() => onAction(c.id, "delete")} disabled={actionLoading !== null} className="px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
            {actionLoading === "delete" ? "..." : t("common.delete")}
          </button>
        </div>
      </div>

      {/* Pending review banner */}
      {isPendingReview && (
        <div className="rounded-2xl p-4 mb-8" style={{ background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.15)" }}>
          <span className="text-sm font-bold font-syne" style={{ color: "#F59E0B" }}>{t("admin.campaigns.pendingReview")}</span>
          <p className="text-xs font-dm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            {t("admin.campaigns.pendingReviewDesc")}
          </p>
        </div>
      )}

      {/* Rejected banner */}
      {isRejected && (
        <div className="rounded-2xl p-4 mb-8" style={{ background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-bold font-syne" style={{ color: "#EF4444" }}>{t("admin.campaigns.modificationsRequired")}</span>
              {c.moderation_reason && (
                <p className="text-xs font-dm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{c.moderation_reason}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onEdit(c)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: "rgba(211,84,0,0.08)", color: "#D35400" }}
              >
                {t("common.edit")}
              </button>
              <button
                onClick={() => onAction(c.id, "resubmit")}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-40"
                style={{ background: "#D35400" }}
              >
                {actionLoading === "resubmit" ? "..." : t("admin.campaigns.resubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className={`grid grid-cols-2 ${(c.objective || "traffic") === "lead_generation" ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4 mb-4`}>
        <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("common.budget")}</p>
          <p className="text-xl font-bold font-syne text-white">{formatFCFA(c.budget)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.dashboard.spent")}</p>
          <p className="text-xl font-bold font-syne" style={{ color: "#D35400" }}>{formatFCFA(c.spent)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.remaining")}</p>
          <p className="text-xl font-bold font-syne" style={{ color: budgetConsumed ? "#1D9E75" : "#D35400" }}>
            {budgetConsumed ? t("admin.campaigns.fullyConsumed") : formatFCFA(remaining)}
          </p>
        </div>
        {(c.objective || "traffic") !== "lead_generation" && (
          <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {(c.pricing_model || "cpc") === "cpa" ? "CPA" : "CPC"}
            </p>
            <p className="text-xl font-bold font-syne text-white">
              {(c.pricing_model || "cpc") === "cpa" ? formatFCFA(c.cpa_amount || 0) : formatFCFA(c.cpc)}
            </p>
          </div>
        )}
      </div>

      {/* Lead gen specific stats */}
      {(c.objective || "traffic") === "lead_generation" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              {(c.pricing_model || "cpc") === "cpa" ? "CPA" : "CPC"}
            </p>
            <p className="text-xl font-bold font-syne text-white">
              {(c.pricing_model || "cpc") === "cpa" ? formatFCFA(c.cpa_amount || 0) : formatFCFA(c.cpc)}
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>CPL</p>
            <p className="text-xl font-bold font-syne text-white">{formatFCFA(c.cost_per_lead_fcfa || 0)}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.leadsCaptured")}</p>
            <p className="text-xl font-bold font-syne" style={{ color: "#8B5CF6" }}>{c.leads_captured_count || 0}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.landingPageFee")}</p>
            <p className="text-xl font-bold font-syne text-white">{formatFCFA(LEAD_GEN_SETUP_FEE_FCFA)}</p>
            <p className="text-[10px] text-white/20">{c.setup_fee_paid ? t("admin.campaigns.paid") : t("admin.campaigns.notPaid")}</p>
          </div>
        </div>
      )}

      {/* Landing page URL for lead gen */}
      {(c.objective || "traffic") === "lead_generation" && landingSlug && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-medium font-dm mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.landingPage")}</p>
          <a href={`${SITE_URL}/l/${landingSlug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-mono hover:underline break-all" style={{ color: "#D35400" }}>
            {SITE_URL}/l/{landingSlug}
          </a>
        </div>
      )}

      {/* Objective context */}
      {(c.objective || "traffic") === "awareness" ? (
        <p className="text-sm text-white/40 mb-4">
          {t("admin.campaigns.awarenessContext")}
        </p>
      ) : (c.objective || "traffic") === "lead_generation" ? (
        <p className="text-sm text-white/40 mb-4">
          {t("admin.campaigns.leadGenContext")}
        </p>
      ) : (
        <p className="text-sm text-white/40 mb-4">
          {t("admin.campaigns.trafficContext")}
        </p>
      )}

      {/* Tab bar for lead gen campaigns or campaigns with pixel */}
      {((c.objective || "traffic") === "lead_generation" || c.pixel_id) && (
        <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
          <button onClick={() => setDetailTab("overview")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${detailTab === "overview" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
            {t("admin.campaigns.overview")}
          </button>
          {(c.objective || "traffic") === "lead_generation" && (
            <button onClick={() => setDetailTab("leads")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${detailTab === "leads" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
              {t("admin.campaigns.leadsTab")} ({leads.length})
            </button>
          )}
          {c.pixel_id && (
            <button onClick={() => setDetailTab("conversions")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${detailTab === "conversions" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
              {t("admin.campaigns.conversionsTab")}
            </button>
          )}
        </div>
      )}

      {/* Leads Tab */}
      {(c.objective || "traffic") === "lead_generation" && detailTab === "leads" && (
        <LeadsTab
          campaignId={c.id}
          leads={leads}
          leadsLoading={leadsLoading}
          leadActionLoading={leadActionLoading}
          onLeadAction={onLeadAction}
        />
      )}

      {/* Conversions tab — full funnel visualization */}
      {detailTab === "conversions" && c.pixel_id && (
        <ConversionsTab
          campaignId={c.id}
          convData={convData}
          convLoading={convLoading}
          convError={convError}
          convPage={convPage}
          setConvPage={setConvPage}
          onRetry={() => setDetailTab("conversions")}
        />
      )}

      {/* Overview tab content (always show for non-lead-gen, or when overview tab is active) */}
      {((c.objective || "traffic") !== "lead_generation" || detailTab === "overview") && detailTab !== "conversions" && <>
      {/* Progress bar */}
      <div className="rounded-2xl p-5 mb-8" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{t("admin.campaigns.budgetProgress")}</p>
          <p className="text-sm font-bold font-syne" style={{ color: "#D35400" }}>{Math.round(progress)}%</p>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ background: "#D35400", width: `${Math.min(progress, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/30">
          <span>{formatFCFA(c.spent)}</span>
          <span>{formatFCFA(c.budget)}</span>
        </div>
      </div>

      <PerformanceSection perf={perf} perfLoading={perfLoading} />

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-medium font-dm mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.info")}</p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.campaigns.destUrl")}</p>
              <a href={c.destination_url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline break-all" style={{ color: "#D35400" }}>{c.destination_url}</a>
            </div>
            {c.starts_at && (
              <div>
                <p className="text-xs text-white/30">{t("admin.campaigns.startDate")}</p>
                <p className="text-sm">{new Date(c.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            )}
            {c.ends_at && (
              <div>
                <p className="text-xs text-white/30">{t("admin.campaigns.endDate")}</p>
                <p className="text-sm">{new Date(c.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-medium font-dm mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.campaigns.visuals")}</p>
          {c.creative_urls && c.creative_urls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {c.creative_urls.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/10">
                  {url.match(/\.(mp4|webm)/) ? (
                    <video src={url} className="w-full h-full object-cover" controls />
                  ) : (
                    <Image src={url} alt={`Visuel ${i + 1}`} width={300} height={300} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/20">{t("admin.campaigns.noVisuals")}</p>
          )}
        </div>
      </div>
      </>}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          deleting={actionLoading === "delete"}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}
    </div>
  );
}
