import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "crypto";
import { SITE_URL } from "@/lib/constants";

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

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find campaigns that went active in the last 6 hours (schedule runs 3x/day)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: newCampaigns, error } = await supabase
    .from("campaigns")
    .select("id, title, cpc, status, moderated_at")
    .eq("status", "active")
    .is("deleted_at", null)
    .gte("moderated_at", sixHoursAgo)
    .order("moderated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!newCampaigns || newCampaigns.length === 0) {
    return NextResponse.json({ sent: 0, campaigns: 0 });
  }

  // Use the newest campaign's CPC for the notification
  const newestCampaign = newCampaigns[0];
  const cpc = newestCampaign.cpc || 0;

  // Send push to all subscribed echos
  try {
    const response = await fetch(`${SITE_URL}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        type: "new_campaign",
        payload: {
          cpc,
          campaignId: newestCampaign.id,
        },
        userIds: "all",
      }),
    });

    const result = await response.json();

    return NextResponse.json({
      campaigns: newCampaigns.length,
      newestCampaignId: newestCampaign.id,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
