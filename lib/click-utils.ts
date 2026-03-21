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

/** Build a daily clicks chart using Postgres COUNT per day — immune to row-limit truncation */
export async function getClicksChart(
  supabase: SupabaseClient,
  linkIds: string[],
  days: number,
  from?: Date,
  to?: Date
): Promise<{ date: string; valid: number; fraud: number }[]> {
  const now = new Date();

  // Use provided dates or fall back to `days` parameter
  const startDate = from || new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))
  );
  const endDate = to || new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  // Generate day buckets from startDate to endDate
  const bucketKeys: string[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(endDate);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    bucketKeys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (linkIds.length === 0) {
    return bucketKeys.map(date => ({ date, valid: 0, fraud: 0 }));
  }

  // Per-day Postgres COUNT(*) — immune to row-limit truncation
  const results = await Promise.all(
    bucketKeys.map(async (date) => {
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;

      const [{ count: valid }, { count: total }] = await Promise.all([
        supabase.from("clicks").select("*", { count: "exact", head: true })
          .in("link_id", linkIds)
          .gte("created_at", dayStart).lte("created_at", dayEnd)
          .eq("is_valid", true),
        supabase.from("clicks").select("*", { count: "exact", head: true })
          .in("link_id", linkIds)
          .gte("created_at", dayStart).lte("created_at", dayEnd),
      ]);

      return { date, valid: valid || 0, fraud: (total || 0) - (valid || 0) };
    })
  );

  return results;
}
