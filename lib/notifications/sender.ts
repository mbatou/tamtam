import { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { getEchoStrings, type EchoLang } from "@/lib/echo-i18n";

export const MAX_DAILY_PUSHES = 2;

interface NotificationRow {
  id: string;
  echo_id: string;
  type: string;
  campaign_id: string | null;
  payload: Record<string, unknown>;
}

export function buildPayload(type: string, payload: Record<string, unknown>) {
  const lang = (payload.lang as EchoLang) || "fr";
  const s = getEchoStrings(lang);

  switch (type) {
    case "new_campaign":
      return {
        title: s.push.newCampaign.title,
        body: s.push.newCampaign.body(Number(payload.cpc) || 0),
        url: "/rythmes",
        tag: `new-campaign-${payload.campaignId || ""}`,
      };
    case "share_reminder":
      return {
        title: s.push.shareReminder.title,
        body: s.push.shareReminder.body(
          String(payload.campaignTitle || ""),
          Number(payload.cpc) || 0,
        ),
        url: "/rythmes",
        tag: `share-reminder-${payload.campaignId || ""}`,
      };
    case "inactivity":
      return {
        title: s.push.inactivity.title(Number(payload.amount) || 0),
        body: s.push.inactivity.body,
        url: "/rythmes",
        tag: "inactivity",
      };
    case "campaign_ending":
      return {
        title: s.push.campaignEnding.title(Number(payload.hoursLeft) || 0),
        body: s.push.campaignEnding.body(String(payload.campaignTitle || "")),
        url: "/rythmes",
        tag: `campaign-ending-${payload.campaignId || ""}`,
      };
    case "streak_danger":
      return {
        title: s.push.streakDanger.title,
        body: s.push.streakDanger.body(Number(payload.days) || 0),
        url: "/dashboard",
        tag: "streak-danger",
      };
    case "streak_milestone":
      return {
        title: s.push.streakMilestone.title,
        body: s.push.streakMilestone.body(
          Number(payload.days) || 0,
          Number(payload.reward) || 0,
        ),
        url: "/dashboard",
        tag: "streak-milestone",
      };
    case "payout_ready":
      return {
        title: s.push.payout.title,
        body: s.push.payout.body(Number(payload.amount) || 0),
        url: "/earnings",
        tag: "payout",
      };
    case "manual":
    case "reengagement":
      return {
        title: String(payload.title || "Tamtam"),
        body: String(payload.body || ""),
        url: String(payload.url || "/rythmes"),
        tag: String(payload.tag || "manual"),
      };
    default:
      return {
        title: "Tamtam",
        body: "",
        url: "/echo",
        tag: "default",
      };
  }
}

async function incrementDailyCap(
  supabase: SupabaseClient,
  echoId: string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("notification_daily_caps")
    .select("send_count")
    .eq("echo_id", echoId)
    .eq("date", today)
    .single();

  if (existing) {
    await supabase
      .from("notification_daily_caps")
      .update({ send_count: existing.send_count + 1 })
      .eq("echo_id", echoId)
      .eq("date", today);
  } else {
    await supabase
      .from("notification_daily_caps")
      .insert({ echo_id: echoId, date: today, send_count: 1 });
  }
}

async function checkDailyCap(
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

export async function sendSinglePush(
  supabase: SupabaseClient,
  entry: {
    echo_id: string;
    type: string;
    campaign_id?: string | null;
    payload: Record<string, unknown>;
  },
): Promise<"sent" | "failed" | "suppressed"> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    await supabase.from("notification_queue").insert({
      ...entry,
      campaign_id: entry.campaign_id || null,
      scheduled_for: new Date().toISOString(),
      status: "failed",
      suppression_reason: "vapid_not_configured",
    });
    return "failed";
  }

  webpush.setVapidDetails(
    "mailto:contact@tamtam.africa",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const canSend = await checkDailyCap(supabase, entry.echo_id);
  if (!canSend) {
    await supabase.from("notification_queue").insert({
      ...entry,
      campaign_id: entry.campaign_id || null,
      scheduled_for: new Date().toISOString(),
      status: "suppressed",
      suppression_reason: "daily_cap_reached",
    });
    return "suppressed";
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", entry.echo_id);

  if (!subs || subs.length === 0) {
    await supabase.from("notification_queue").insert({
      ...entry,
      campaign_id: entry.campaign_id || null,
      scheduled_for: new Date().toISOString(),
      status: "suppressed",
      suppression_reason: "no_push_subscription",
    });
    return "suppressed";
  }

  const pushPayload = buildPayload(entry.type, entry.payload);
  let anySent = false;
  const expiredSubIds: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub.subscription as webpush.PushSubscription,
        JSON.stringify(pushPayload),
      );
      anySent = true;
    } catch (err: unknown) {
      const pushError = err as { statusCode?: number };
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        expiredSubIds.push(sub.id);
      }
    }
  }

  if (expiredSubIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredSubIds);
  }

  const now = new Date().toISOString();
  if (anySent) {
    await supabase.from("notification_queue").insert({
      ...entry,
      campaign_id: entry.campaign_id || null,
      scheduled_for: now,
      status: "sent",
      sent_at: now,
    });
    await incrementDailyCap(supabase, entry.echo_id);
    return "sent";
  }

  await supabase.from("notification_queue").insert({
    ...entry,
    campaign_id: entry.campaign_id || null,
    scheduled_for: now,
    status: "failed",
  });
  return "failed";
}

export async function processNotificationQueue(
  supabase: SupabaseClient,
): Promise<{ sent: number; failed: number; suppressed: number }> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    // Mark all pending as failed — VAPID not configured
    const now = new Date().toISOString();
    const { data: pending } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(200);

    if (pending && pending.length > 0) {
      await supabase
        .from("notification_queue")
        .update({ status: "failed", suppression_reason: "vapid_not_configured" })
        .in("id", pending.map((n) => n.id));
    }

    return { sent: 0, failed: pending?.length || 0, suppressed: 0 };
  }

  webpush.setVapidDetails(
    "mailto:contact@tamtam.africa",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const now = new Date().toISOString();

  // Fetch pending notifications whose scheduled time has passed
  const { data: pending, error } = await supabase
    .from("notification_queue")
    .select("id, echo_id, type, campaign_id, payload")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(200);

  if (error || !pending || pending.length === 0) {
    return { sent: 0, failed: 0, suppressed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let suppressed = 0;
  const expiredSubIds: string[] = [];

  for (const notification of pending as NotificationRow[]) {
    // Re-check daily cap at send time
    const canSend = await checkDailyCap(supabase, notification.echo_id);
    if (!canSend) {
      await supabase
        .from("notification_queue")
        .update({ status: "suppressed", suppression_reason: "daily_cap_reached" })
        .eq("id", notification.id);
      suppressed++;
      continue;
    }

    // Get push subscriptions for this echo
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", notification.echo_id);

    if (!subs || subs.length === 0) {
      await supabase
        .from("notification_queue")
        .update({ status: "suppressed", suppression_reason: "no_push_subscription" })
        .eq("id", notification.id);
      suppressed++;
      continue;
    }

    const pushPayload = buildPayload(notification.type, notification.payload);
    let anySent = false;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          JSON.stringify(pushPayload),
        );
        anySent = true;
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number };
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          expiredSubIds.push(sub.id);
        }
      }
    }

    if (anySent) {
      await supabase
        .from("notification_queue")
        .update({ status: "sent", sent_at: now })
        .eq("id", notification.id);
      await incrementDailyCap(supabase, notification.echo_id);
      sent++;
    } else {
      await supabase
        .from("notification_queue")
        .update({ status: "failed" })
        .eq("id", notification.id);
      failed++;
    }
  }

  // Clean up expired subscriptions
  if (expiredSubIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", expiredSubIds);
  }

  return { sent, failed, suppressed };
}
