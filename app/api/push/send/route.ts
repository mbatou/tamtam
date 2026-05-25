import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { timingSafeEqual } from "crypto";
import { getEchoStrings, type EchoLang } from "@/lib/echo-i18n";

export const dynamic = "force-dynamic";

type PushType = "new_campaign" | "payout" | "streak_danger" | "streak_milestone" | "custom";

interface PushPayload {
  type: PushType;
  payload: {
    title?: string;
    body?: string;
    url?: string;
    cpc?: number;
    amount?: number;
    days?: number;
    reward?: number;
    lang?: EchoLang;
    campaignId?: string;
  };
  userIds: "all" | string[];
}

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || !process.env.CRON_SECRET) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

function buildNotificationPayload(type: PushType, payload: PushPayload["payload"]) {
  const lang = payload.lang || "fr";
  const s = getEchoStrings(lang);

  switch (type) {
    case "new_campaign":
      return {
        title: s.push.newCampaign.title,
        body: s.push.newCampaign.body(payload.cpc || 0),
        url: "/rythmes",
      };
    case "payout":
      return {
        title: s.push.payout.title,
        body: s.push.payout.body(payload.amount || 0),
        url: "/earnings",
      };
    case "streak_danger":
      return {
        title: s.push.streakDanger.title,
        body: s.push.streakDanger.body(payload.days || 0),
        url: "/dashboard",
      };
    case "streak_milestone":
      return {
        title: s.push.streakMilestone.title,
        body: s.push.streakMilestone.body(payload.days || 0, payload.reward || 0),
        url: "/dashboard",
      };
    case "custom":
      return {
        title: payload.title || s.push.custom.defaultTitle,
        body: payload.body || "",
        url: payload.url || "/echo",
      };
    default:
      return {
        title: "Tamtam",
        body: "",
        url: "/dashboard",
      };
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, payload, userIds } = (await request.json()) as PushPayload;

  if (!type || !payload) {
    return NextResponse.json({ error: "Missing type or payload" }, { status: 400 });
  }

  // Configure web-push
  webpush.setVapidDetails(
    "mailto:contact@tamtam.africa",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const supabase = createServiceClient();

  // Fetch subscriptions
  let query = supabase.from("push_subscriptions").select("id, user_id, subscription");

  if (userIds !== "all" && Array.isArray(userIds)) {
    query = query.in("user_id", userIds);
  }

  const { data: subscriptions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  const notificationPayload = buildNotificationPayload(type, payload);

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          JSON.stringify(notificationPayload),
        );
        sent++;
      } catch (err: unknown) {
        const pushError = err as { statusCode?: number; message?: string };
        failed++;

        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          expiredIds.push(sub.id);
        }
      }
    }),
  );

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  // Suppress unused variable warning
  void results;

  return NextResponse.json({ sent, failed, expired: expiredIds.length });
}
