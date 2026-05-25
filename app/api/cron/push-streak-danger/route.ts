import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

// TODO: Implement streak danger notifications once gamification is re-enabled.
// This route should:
// 1. Query echo_streaks for echos with current_streak > 0
//    whose last_campaign_date is yesterday (haven't shared today)
// 2. Send a push notification to each via /api/push/send with type "streak_danger"
// 3. Skip echos who have already been notified today (dedup via notification_logs)
//
// Currently stubbed because GAMIFICATION_SUSPENDED = true in lib/gamification.ts

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

  // Gamification is suspended — return stub response
  return NextResponse.json({ sent: 0, reason: "gamification_suspended" });
}
