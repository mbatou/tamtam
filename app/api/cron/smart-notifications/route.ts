import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "crypto";
import {
  triggerShareReminders,
  triggerInactivity,
  triggerCampaignEnding,
  triggerStreakDanger,
} from "@/lib/notifications/engine";
import { processNotificationQueue } from "@/lib/notifications/sender";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results: Record<string, unknown> = {};

  // Run all triggers (enqueue notifications)
  const [shareResult, inactivityResult, endingResult, streakResult] =
    await Promise.allSettled([
      triggerShareReminders(supabase),
      triggerInactivity(supabase),
      triggerCampaignEnding(supabase),
      triggerStreakDanger(supabase),
    ]);

  results.share_reminders =
    shareResult.status === "fulfilled" ? shareResult.value : { error: String(shareResult.reason) };
  results.inactivity =
    inactivityResult.status === "fulfilled" ? inactivityResult.value : { error: String(inactivityResult.reason) };
  results.campaign_ending =
    endingResult.status === "fulfilled" ? endingResult.value : { error: String(endingResult.reason) };
  results.streak_danger =
    streakResult.status === "fulfilled" ? streakResult.value : { error: String(streakResult.reason) };

  // Process the queue (send pending notifications)
  const sendResult = await processNotificationQueue(supabase);
  results.processed = sendResult;

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
