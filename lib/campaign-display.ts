import { ECHO_SHARE_PERCENT, ECHO_CPA_SHARE_PERCENT } from "@/lib/constants";
import type { Campaign } from "@/lib/types";

export function isCpaCampaign(campaign: { pricing_model?: string }): boolean {
  return campaign.pricing_model === "cpa";
}

export function getEchoEarningPerClick(campaign: Campaign): number {
  if (isCpaCampaign(campaign)) return 0;
  return Math.floor(campaign.cpc * ECHO_SHARE_PERCENT / 100);
}

export function getEchoEarningPerConversion(campaign: Campaign): number {
  if (!isCpaCampaign(campaign) || !campaign.cpa_amount) return 0;
  return Math.floor(campaign.cpa_amount * ECHO_CPA_SHARE_PERCENT / 100);
}

export function getEchoEarnings(campaign: Campaign, clickCount: number): number {
  if (isCpaCampaign(campaign)) return 0;
  return Math.floor(clickCount * campaign.cpc * ECHO_SHARE_PERCENT / 100);
}
