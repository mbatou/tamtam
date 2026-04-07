import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get campaign
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Get all sends for this campaign
  const { data: sends } = await supabase
    .from("email_sends")
    .select("status, user_id")
    .eq("campaign_id", campaignId);

  const allSends = sends || [];

  // Compute totals
  const totals = {
    total: allSends.length,
    pending: allSends.filter((s) => s.status === "pending").length,
    sent: allSends.filter((s) => ["sent", "delivered", "opened", "clicked"].includes(s.status)).length,
    delivered: allSends.filter((s) => ["delivered", "opened", "clicked"].includes(s.status)).length,
    opened: allSends.filter((s) => ["opened", "clicked"].includes(s.status)).length,
    clicked: allSends.filter((s) => s.status === "clicked").length,
    bounced: allSends.filter((s) => s.status === "bounced").length,
    complained: allSends.filter((s) => s.status === "complained").length,
    failed: allSends.filter((s) => s.status === "failed").length,
  };

  // Count users who completed interests (from email attribution)
  const sentUserIds = allSends
    .filter((s) => ["sent", "delivered", "opened", "clicked"].includes(s.status))
    .map((s) => s.user_id);

  let completedFromEmail = 0;
  if (sentUserIds.length > 0) {
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("id", sentUserIds)
      .not("interests_completed_at", "is", null);
    completedFromEmail = count || 0;
  }

  // Total completions overall
  const { count: totalCompleted } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "echo")
    .is("deleted_at", null)
    .not("interests_completed_at", "is", null);

  return NextResponse.json({
    campaign,
    totals,
    completions: {
      fromEmailRecipients: completedFromEmail,
      total: totalCompleted || 0,
    },
  });
}
