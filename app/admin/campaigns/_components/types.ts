import type { Campaign } from "@/lib/types";

export type View = "list" | "detail" | "objective" | "form";

export type DetailTab = "overview" | "leads" | "conversions";

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export interface CampaignFormState {
  title: string;
  description: string;
  destination_url: string;
  cpc: string;
  budget: string;
  starts_at: string;
  ends_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  custom_fields: Record<string, string> | null;
  status: string;
  created_at: string;
  echo_id: string | null;
}

export interface BrandPixel {
  pixel_id: string;
  name: string;
  platform: string;
  is_active: boolean;
}

export interface PerfData {
  totalClicks: number;
  validClicks: number;
  activeEchos: number;
  costPerVisitor: number;
  chartData: { date: string; valid: number; fraud: number }[];
  topEchos: { name: string; city: string; clicks: number; earnings: number }[];
  geoBreakdown: { city: string; clicks: number; percentage: number }[];
}

export interface ConvData {
  funnel: { clicks: number; installs: number; signups: number; activations: number; subscriptions: number; purchases: number; leads: number; custom: number };
  rates: Record<string, number>;
  costs: Record<string, number>;
  revenue: { total_value: number; currency: string; roas: number };
  daily: { date: string; clicks: number; installs: number; signups: number; activations: number; subscriptions: number; purchases: number; leads: number }[];
  recent: { id: string; event: string; event_name: string | null; value_amount: number | null; value_currency: string; attributed: boolean; attribution_type: string | null; click_to_conversion_seconds: number | null; created_at: string; external_id: string | null }[];
  attribution: { direct: number; unattributed: number; total: number };
}

/** Per-campaign real click + echo counts from stats API. */
export type CampaignStatsMap = Record<string, { realClicks: number; realValidClicks: number; echoCount: number }>;

export type ImageFormatHint = { type: "warning" | "success"; message: string } | null;

export type CampaignAction = "pause" | "activate" | "complete" | "delete" | "resubmit";

export function getStatusLabel(campaign: Campaign, t: TranslateFn) {
  if (campaign.status === "draft" && campaign.moderation_status === "pending" &&
    !(campaign.objective === "lead_generation" && !campaign.landing_page_id)) {
    return t("admin.campaigns.pendingValidation");
  }
  const map: Record<string, string> = {
    active: t("common.active"), paused: t("common.paused"), completed: t("common.finished"), draft: t("admin.campaigns.draft"), rejected: t("common.rejected"),
  };
  return map[campaign.status] || campaign.status;
}
