import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { triggerNewCampaign } from "@/lib/notifications/engine";
import { processNotificationQueue } from "@/lib/notifications/sender";
import { verifyCronSecret } from "@/lib/api/cron";

export const dynamic = "force-dynamic";

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
