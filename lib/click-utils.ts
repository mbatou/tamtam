import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared click-counting utilities for brand and superadmin APIs.
 *
 * All total/valid counts use Postgres-level COUNT(*) via { count: "exact", head: true }
 * to avoid silent row-limit truncation that can occur when fetching individual rows.
 */

/** Get tracked link IDs for a set of campaigns (paginated to avoid the 1 000-row default) */
export async function getLinksForCampaigns(
  supabase: SupabaseClient,
  campaignIds: string[]
): Promise<{ id: string; campaign_id: string; echo_id: string; click_count: number }[]> {
  if (campaignIds.length === 0) return [];

  const PAGE_SIZE = 1000;
  const all: { id: string; campaign_id: string; echo_id: string; click_count: number }[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from("tracked_links")
      .select("id, campaign_id, echo_id, click_count")
      .in("campaign_id", campaignIds)
      .range(from, from + PAGE_SIZE - 1);

    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Count clicks using Postgres COUNT(*) — immune to row limits.
 * Batches the .in() filter to avoid exceeding PostgREST URL length limits
 * when there are many tracked links.
 */
const IN_BATCH_SIZE = 150; // ~150 UUIDs ≈ 5.5 KB, well within PostgREST 8 KB URL limit

export async function countClicks(
  supabase: SupabaseClient,
  linkIds: string[],
  validOnly?: boolean
): Promise<number> {
  if (linkIds.length === 0) return 0;

  // Small array — single query
  if (linkIds.length <= IN_BATCH_SIZE) {
    let query = supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds);
    if (validOnly) query = query.eq("is_valid", true);
    const { count } = await query;
    return count || 0;
  }

  // Large array — batch into chunks and sum
  let total = 0;
  const batches: string[][] = [];
  for (let i = 0; i < linkIds.length; i += IN_BATCH_SIZE) {
    batches.push(linkIds.slice(i, i + IN_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map(async (batch) => {
      let query = supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .in("link_id", batch);
      if (validOnly) query = query.eq("is_valid", true);
      const { count } = await query;
      return count || 0;
    })
  );
  for (const r of results) total += r;
  return total;
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

  // Helper: count clicks for a single day, batching linkIds to avoid URL-length limits
  async function countDay(date: string) {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    // Batch linkIds into chunks
    const batches: string[][] = [];
    for (let i = 0; i < linkIds.length; i += IN_BATCH_SIZE) {
      batches.push(linkIds.slice(i, i + IN_BATCH_SIZE));
    }

    let valid = 0;
    let total = 0;
    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const [{ count: v }, { count: t }] = await Promise.all([
          supabase.from("clicks").select("*", { count: "exact", head: true })
            .in("link_id", batch)
            .gte("created_at", dayStart).lte("created_at", dayEnd)
            .eq("is_valid", true),
          supabase.from("clicks").select("*", { count: "exact", head: true })
            .in("link_id", batch)
            .gte("created_at", dayStart).lte("created_at", dayEnd),
        ]);
        return { valid: v || 0, total: t || 0 };
      })
    );
    for (const r of batchResults) {
      valid += r.valid;
      total += r.total;
    }
    return { date, valid, fraud: total - valid };
  }

  // Per-day Postgres COUNT(*) — immune to row-limit truncation
  const results = await Promise.all(bucketKeys.map(countDay));

  return results;
}
