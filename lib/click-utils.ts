import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared click-counting utilities for brand and superadmin APIs.
 *
 * All total/valid counts use Postgres-level COUNT(*) via { count: "exact", head: true }
 * to avoid silent row-limit truncation that can occur when fetching individual rows.
 */

/** Get tracked link IDs for a set of campaigns */
export async function getLinksForCampaigns(
  supabase: SupabaseClient,
  campaignIds: string[]
): Promise<{ id: string; campaign_id: string; echo_id: string; click_count: number }[]> {
  if (campaignIds.length === 0) return [];
  const { data } = await supabase
    .from("tracked_links")
    .select("id, campaign_id, echo_id, click_count")
    .in("campaign_id", campaignIds);
  return data || [];
}

/** Count clicks using Postgres COUNT(*) — immune to row limits */
export async function countClicks(
  supabase: SupabaseClient,
  linkIds: string[],
  validOnly?: boolean
): Promise<number> {
  if (linkIds.length === 0) return 0;
  let query = supabase
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", linkIds);
  if (validOnly) query = query.eq("is_valid", true);
  const { count } = await query;
  return count || 0;
}

/** Build a daily clicks chart with pre-filled UTC date buckets */
export async function getClicksChart(
  supabase: SupabaseClient,
  linkIds: string[],
  days: number
): Promise<{ date: string; valid: number; fraud: number }[]> {
  const now = new Date();
  const startUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))
  );

  // Pre-fill all day buckets with zeros
  const buckets: Record<string, { date: string; valid: number; fraud: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(startUTC);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, valid: 0, fraud: 0 };
  }

  if (linkIds.length === 0) return Object.values(buckets);

  const { data: clicks } = await supabase
    .from("clicks")
    .select("created_at, is_valid")
    .in("link_id", linkIds)
    .gte("created_at", startUTC.toISOString())
    .order("created_at", { ascending: true });

  for (const click of clicks || []) {
    const key = click.created_at.slice(0, 10);
    if (buckets[key]) {
      if (click.is_valid) buckets[key].valid++;
      else buckets[key].fraud++;
    }
  }

  return Object.values(buckets);
}
