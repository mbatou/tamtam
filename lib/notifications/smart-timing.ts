import { SupabaseClient } from "@supabase/supabase-js";

export interface SmartTime {
  hour: number;
  confidence: "high" | "medium" | "low";
  basis: "history" | "default";
}

/**
 * Returns the best hour to notify an Écho based on when their shared links
 * generate clicks (proxy for when they are active/sharing).
 * Falls back to 8am if not enough history.
 */
export async function getSmartNotifyTime(
  supabase: SupabaseClient,
  echoId: string,
): Promise<SmartTime> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: links } = await supabase
    .from("tracked_links")
    .select("id")
    .eq("echo_id", echoId);

  const linkIds = links?.map((l) => l.id) || [];
  if (linkIds.length === 0) {
    return { hour: 8, confidence: "low", basis: "default" };
  }

  const { data: clickHistory } = await supabase
    .from("clicks")
    .select("created_at")
    .eq("is_valid", true)
    .in("link_id", linkIds)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!clickHistory || clickHistory.length < 5) {
    return { hour: 8, confidence: "low", basis: "default" };
  }

  const hourCounts: Record<number, number> = {};
  for (const click of clickHistory) {
    const hour = new Date(click.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  const peakHour = Object.entries(hourCounts).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const hour = parseInt(peakHour[0]);

  // Notify 1 hour before peak activity, never before 6am
  const notifyHour = Math.max(6, hour - 1);

  return {
    hour: notifyHour,
    confidence: clickHistory.length >= 20 ? "high" : "medium",
    basis: "history",
  };
}

/**
 * Returns the next datetime to schedule a notification for this Écho.
 * If the target hour has already passed today, schedules for tomorrow.
 */
export async function getNextNotifyDatetime(
  supabase: SupabaseClient,
  echoId: string,
): Promise<Date> {
  const { hour } = await getSmartNotifyTime(supabase, echoId);
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}
