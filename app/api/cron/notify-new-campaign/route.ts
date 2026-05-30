import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "crypto";
import { triggerNewCampaign } from "@/lib/notifications/engine";
import { processNotificationQueue } from "@/lib/notifications/sender";

export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { campaignId } = body as { campaignId: string };

  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Enqueue notifications for matching echos
  const enqueueResult = await triggerNewCampaign(supabase, campaignId);

  // Immediately process the queue to send them
  const sendResult = await processNotificationQueue(supabase);

  return NextResponse.json({
    ok: true,
    campaignId,
    enqueued: enqueueResult,
    processed: sendResult,
  });
}
