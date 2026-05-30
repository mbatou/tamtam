import { SupabaseClient } from "@supabase/supabase-js";
import { getSmartNotifyTime } from "./smart-timing";

const MAX_DAILY_PUSHES = 2;

async function isNotifTypeEnabled(
  supabase: SupabaseClient,
  echoId: string,
  type: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("notification_prefs")
    .eq("id", echoId)
    .single();

  const prefs = data?.notification_prefs as Record<string, boolean> | null;
  if (!prefs) return true;
  return prefs[type] !== false;
}

interface QueueEntry {
  echo_id: string;
  type: string;
  campaign_id?: string;
  scheduled_for: string;
  payload: Record<string, unknown>;
}

async function canSendToday(
  supabase: SupabaseClient,
  echoId: string,
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("notification_daily_caps")
    .select("send_count")
    .eq("echo_id", echoId)
    .eq("date", today)
    .single();

  return !data || data.send_count < MAX_DAILY_PUSHES;
}

async function hasPushSubscription(
  supabase: SupabaseClient,
  echoId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", echoId);

  return (count ?? 0) > 0;
}

async function wasRecentlyNotified(
  supabase: SupabaseClient,
  echoId: string,
  type: string,
  hoursAgo: number,
  campaignId?: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("notification_queue")
    .select("id", { count: "exact", head: true })
    .eq("echo_id", echoId)
    .eq("type", type)
    .in("status", ["pending", "sent"])
    .gte("created_at", cutoff);

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

async function getScheduledFor(
  supabase: SupabaseClient,
  echoId: string,
): Promise<string> {
  const { hour } = await getSmartNotifyTime(supabase, echoId);
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.toISOString();
}

function scheduleNow(): string {
  return new Date(Date.now() + 60_000).toISOString();
}

async function enqueue(
  supabase: SupabaseClient,
  entries: QueueEntry[],
): Promise<number> {
  if (entries.length === 0) return 0;

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const { error } = await supabase.from("notification_queue").insert(batch);
    if (!error) inserted += batch.length;
  }
  return inserted;
}

// ─── Trigger 1: New Campaign ────────────────────────────────────────────────
// Enqueues notifications for echos matching the campaign's target cities.
// Sent immediately (scheduled_for = ~now) since it's time-sensitive.

export async function triggerNewCampaign(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<{ queued: number; skipped: number }> {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, cpc, target_cities")
    .eq("id", campaignId)
    .is("deleted_at", null)
    .single();

  if (!campaign) return { queued: 0, skipped: 0 };

  // Get all echos with push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  if (!subs || subs.length === 0) return { queued: 0, skipped: 0 };

  const echoIds = Array.from(new Set(subs.map((s) => s.user_id)));

  // Get echo cities for geo filtering
  const { data: echos } = await supabase
    .from("users")
    .select("id, city, lang")
    .in("id", echoIds)
    .eq("role", "echo")
    .is("deleted_at", null);

  if (!echos || echos.length === 0) return { queued: 0, skipped: 0 };

  const targetCities: string[] | null = campaign.target_cities;
  const hasGeoFilter = targetCities && targetCities.length > 0;

  const entries: QueueEntry[] = [];
  let skipped = 0;
  const scheduledFor = scheduleNow();

  for (const echo of echos) {
    // City filter
    if (hasGeoFilter && echo.city && !targetCities.includes(echo.city)) {
      skipped++;
      continue;
    }

    // Preference check
    if (!(await isNotifTypeEnabled(supabase, echo.id, "new_campaign"))) {
      skipped++; continue;
    }

    // Dedup: don't notify same echo for same campaign
    const alreadyNotified = await wasRecentlyNotified(
      supabase, echo.id, "new_campaign", 24, campaignId,
    );
    if (alreadyNotified) { skipped++; continue; }

    // Daily cap
    const canSend = await canSendToday(supabase, echo.id);
    if (!canSend) { skipped++; continue; }

    entries.push({
      echo_id: echo.id,
      type: "new_campaign",
      campaign_id: campaignId,
      scheduled_for: scheduledFor,
      payload: {
        cpc: campaign.cpc,
        campaignTitle: campaign.title,
        lang: echo.lang || "fr",
      },
    });
  }

  const queued = await enqueue(supabase, entries);
  return { queued, skipped };
}

// ─── Trigger 2: Share Reminder ──────────────────────────────────────────────
// For echos who joined a campaign (have a tracked_link) but haven't shared
// recently. Sent at their smart time, once per day per campaign, max 3 days.

export async function triggerShareReminders(
  supabase: SupabaseClient,
): Promise<{ queued: number; skipped: number }> {
  // Active campaigns
  const { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("id, title, cpc")
    .eq("status", "active")
    .is("deleted_at", null);

  if (!activeCampaigns || activeCampaigns.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  const campaignIds = activeCampaigns.map((c) => c.id);
  const campaignMap = new Map(activeCampaigns.map((c) => [c.id, c]));

  // Tracked links created in the last 3 days (only remind for 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: links } = await supabase
    .from("tracked_links")
    .select("echo_id, campaign_id, click_count, created_at")
    .in("campaign_id", campaignIds)
    .gte("created_at", threeDaysAgo);

  if (!links || links.length === 0) return { queued: 0, skipped: 0 };

  // Filter to links with 0 clicks (echo hasn't shared effectively)
  const needsReminder = links.filter((l) => (l.click_count || 0) === 0);

  const entries: QueueEntry[] = [];
  let skipped = 0;

  for (const link of needsReminder) {
    const campaign = campaignMap.get(link.campaign_id);
    if (!campaign) { skipped++; continue; }

    if (!(await hasPushSubscription(supabase, link.echo_id))) {
      skipped++; continue;
    }

    if (!(await isNotifTypeEnabled(supabase, link.echo_id, "share_reminder"))) {
      skipped++; continue;
    }

    // Already reminded for this campaign in last 24h?
    if (await wasRecentlyNotified(supabase, link.echo_id, "share_reminder", 24, link.campaign_id)) {
      skipped++; continue;
    }

    if (!(await canSendToday(supabase, link.echo_id))) {
      skipped++; continue;
    }

    // Get echo lang
    const { data: echo } = await supabase
      .from("users")
      .select("lang")
      .eq("id", link.echo_id)
      .single();

    entries.push({
      echo_id: link.echo_id,
      type: "share_reminder",
      campaign_id: link.campaign_id,
      scheduled_for: await getScheduledFor(supabase, link.echo_id),
      payload: {
        campaignTitle: campaign.title,
        cpc: campaign.cpc,
        lang: echo?.lang || "fr",
      },
    });
  }

  const queued = await enqueue(supabase, entries);
  return { queued, skipped };
}

// ─── Trigger 3: Inactivity Re-engagement ────────────────────────────────────
// Echos who haven't created a tracked_link in 48+ hours.

export async function triggerInactivity(
  supabase: SupabaseClient,
): Promise<{ queued: number; skipped: number }> {
  const fortyEightHoursAgo = new Date(
    Date.now() - 48 * 60 * 60 * 1000,
  ).toISOString();

  // Get all echos with push subs
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  if (!subs || subs.length === 0) return { queued: 0, skipped: 0 };

  const echoIds = Array.from(new Set(subs.map((s) => s.user_id)));

  // Get echo data
  const { data: echos } = await supabase
    .from("users")
    .select("id, lang, balance, available_balance")
    .in("id", echoIds)
    .eq("role", "echo")
    .is("deleted_at", null);

  if (!echos || echos.length === 0) return { queued: 0, skipped: 0 };

  const entries: QueueEntry[] = [];
  let skipped = 0;

  for (const echo of echos) {
    // Check last activity: most recent tracked_link
    const { data: recentLink } = await supabase
      .from("tracked_links")
      .select("created_at")
      .eq("echo_id", echo.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Skip if they were active recently
    if (recentLink && recentLink.created_at > fortyEightHoursAgo) {
      skipped++; continue;
    }

    if (!(await isNotifTypeEnabled(supabase, echo.id, "inactivity"))) {
      skipped++; continue;
    }

    // Don't re-send inactivity within 72h
    if (await wasRecentlyNotified(supabase, echo.id, "inactivity", 72)) {
      skipped++; continue;
    }

    if (!(await canSendToday(supabase, echo.id))) {
      skipped++; continue;
    }

    // Calculate pending amount to show in notification
    const pendingAmount = (echo.available_balance || 0) + (echo.balance || 0);

    entries.push({
      echo_id: echo.id,
      type: "inactivity",
      scheduled_for: await getScheduledFor(supabase, echo.id),
      payload: {
        amount: pendingAmount,
        lang: echo.lang || "fr",
      },
    });
  }

  const queued = await enqueue(supabase, entries);
  return { queued, skipped };
}

// ─── Trigger 4: Campaign Ending ─────────────────────────────────────────────
// Campaigns ending within 24h — notify echos who participated.

export async function triggerCampaignEnding(
  supabase: SupabaseClient,
): Promise<{ queued: number; skipped: number }> {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // Campaigns with end_date within next 24h
  const { data: endingCampaigns } = await supabase
    .from("campaigns")
    .select("id, title, end_date")
    .eq("status", "active")
    .is("deleted_at", null)
    .lte("end_date", twentyFourHoursFromNow)
    .gte("end_date", now.toISOString());

  if (!endingCampaigns || endingCampaigns.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  const entries: QueueEntry[] = [];
  let skipped = 0;

  for (const campaign of endingCampaigns) {
    // Get echos who have links for this campaign
    const { data: links } = await supabase
      .from("tracked_links")
      .select("echo_id")
      .eq("campaign_id", campaign.id);

    if (!links || links.length === 0) continue;

    const echoIds = Array.from(new Set(links.map((l) => l.echo_id)));
    const hoursLeft = Math.round(
      (new Date(campaign.end_date).getTime() - now.getTime()) / 3_600_000,
    );

    for (const echoId of echoIds) {
      if (!(await hasPushSubscription(supabase, echoId))) {
        skipped++; continue;
      }

      if (!(await isNotifTypeEnabled(supabase, echoId, "campaign_ending"))) {
        skipped++; continue;
      }

      if (await wasRecentlyNotified(supabase, echoId, "campaign_ending", 24, campaign.id)) {
        skipped++; continue;
      }

      if (!(await canSendToday(supabase, echoId))) {
        skipped++; continue;
      }

      const { data: echo } = await supabase
        .from("users")
        .select("lang")
        .eq("id", echoId)
        .single();

      entries.push({
        echo_id: echoId,
        type: "campaign_ending",
        campaign_id: campaign.id,
        scheduled_for: scheduleNow(),
        payload: {
          campaignTitle: campaign.title,
          hoursLeft,
          lang: echo?.lang || "fr",
        },
      });
    }
  }

  const queued = await enqueue(supabase, entries);
  return { queued, skipped };
}

// ─── Trigger 5: Streak Danger ───────────────────────────────────────────────
// Echos whose streak will break if they don't share today.
// Only fires if gamification is active (checks for non-zero streaks).

export async function triggerStreakDanger(
  supabase: SupabaseClient,
): Promise<{ queued: number; skipped: number }> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Echos whose last activity was yesterday (streak will break if no activity today)
  const { data: atRiskStreaks } = await supabase
    .from("echo_streaks")
    .select("echo_id, current_streak, last_campaign_date")
    .eq("last_campaign_date", yesterday)
    .gt("current_streak", 1);

  if (!atRiskStreaks || atRiskStreaks.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  const entries: QueueEntry[] = [];
  let skipped = 0;

  for (const streak of atRiskStreaks) {
    if (!(await hasPushSubscription(supabase, streak.echo_id))) {
      skipped++; continue;
    }

    if (!(await isNotifTypeEnabled(supabase, streak.echo_id, "streak_danger"))) {
      skipped++; continue;
    }

    if (await wasRecentlyNotified(supabase, streak.echo_id, "streak_danger", 20)) {
      skipped++; continue;
    }

    if (!(await canSendToday(supabase, streak.echo_id))) {
      skipped++; continue;
    }

    const { data: echo } = await supabase
      .from("users")
      .select("lang")
      .eq("id", streak.echo_id)
      .single();

    entries.push({
      echo_id: streak.echo_id,
      type: "streak_danger",
      scheduled_for: await getScheduledFor(supabase, streak.echo_id),
      payload: {
        days: streak.current_streak,
        lang: echo?.lang || "fr",
      },
    });
  }

  const queued = await enqueue(supabase, entries);
  return { queued, skipped };
}
