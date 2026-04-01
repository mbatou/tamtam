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

/**
 * Build a daily clicks chart by fetching all clicks in a single query
 * and grouping by day in memory. This replaces the previous approach of
 * firing 2 COUNT queries per day (60+ queries for 30 days).
 *
 * Only fetches 2 minimal columns (created_at, is_valid) to keep transfer small.
 */
export async function getClicksChart(
  supabase: SupabaseClient,
  linkIds: string[],
  days: number,
  from?: Date,
  to?: Date
): Promise<{ date: string; valid: number; fraud: number }[]> {
  const now = new Date();

  const startDate = from || new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))
  );
  const endDate = to || new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  // Generate day buckets from startDate to endDate
  const bucketMap: Record<string, { date: string; valid: number; fraud: number }> = {};
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(endDate);
  endDay.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    bucketMap[key] = { date: key, valid: 0, fraud: 0 };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (linkIds.length === 0) {
    return Object.values(bucketMap);
  }

  // Fetch all clicks in the date range with minimal columns, paginated
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  const PAGE_SIZE = 1000;

  // Batch linkIds to avoid URL-length limits
  const linkBatches: string[][] = [];
  for (let i = 0; i < linkIds.length; i += IN_BATCH_SIZE) {
    linkBatches.push(linkIds.slice(i, i + IN_BATCH_SIZE));
  }

  // Fetch all clicks across all link batches
  await Promise.all(
    linkBatches.map(async (batch) => {
      let offset = 0;
      while (true) {
        const { data } = await supabase
          .from("clicks")
          .select("created_at, is_valid")
          .in("link_id", batch)
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .range(offset, offset + PAGE_SIZE - 1);

        const rows = data || [];
        for (const row of rows) {
          const day = row.created_at.slice(0, 10);
          const bucket = bucketMap[day];
          if (bucket) {
            if (row.is_valid) {
              bucket.valid++;
            } else {
              bucket.fraud++;
            }
          }
        }

        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
    })
  );

  // Return sorted by date
  return Object.values(bucketMap).sort((a, b) => a.date.localeCompare(b.date));
}
