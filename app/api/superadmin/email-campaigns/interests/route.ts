import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { segmentEchosForInterestsCampaign } from "@/lib/email-segments";

export const dynamic = "force-dynamic";

// GET: Preview segmentation without sending
export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const echos = await segmentEchosForInterestsCampaign();

  return NextResponse.json({
    total: echos.length,
    segments: {
      active: echos.filter((e) => e.segment === "active").length,
      semi_active: echos.filter((e) => e.segment === "semi_active").length,
      dormant: echos.filter((e) => e.segment === "dormant").length,
    },
  });
}

// POST: Create and launch the campaign
export async function POST() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Segment Échos
  const echos = await segmentEchosForInterestsCampaign();
  if (echos.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .insert({
      name: "Interests Collection — Écho Fondateur",
      subject_line: "varies by segment",
      template_key: "interests_campaign",
      target_segment: "all",
      status: "sending",
      total_recipients: echos.length,
      started_at: new Date().toISOString(),
      created_by: session.user.id,
    })
    .select()
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }

  // Insert send records
  const sendRecords = echos.map((e) => ({
    campaign_id: campaign.id,
    user_id: e.id,
    email: e.email,
    status: "pending",
  }));

  const { error: sendsError } = await supabase
    .from("email_sends")
    .insert(sendRecords);

  if (sendsError) {
    return NextResponse.json({ error: "Failed to queue sends" }, { status: 500 });
  }

  // Trigger wave-send worker (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tamma.me";
  fetch(`${appUrl}/api/superadmin/email-campaigns/${campaign.id}/process`, {
    method: "POST",
    headers: { "x-internal-secret": process.env.INTERNAL_SECRET || "" },
  }).catch((err) => console.error("Failed to trigger worker:", err));

  return NextResponse.json({
    campaign_id: campaign.id,
    total_recipients: echos.length,
    segments: {
      active: echos.filter((e) => e.segment === "active").length,
      semi_active: echos.filter((e) => e.segment === "semi_active").length,
      dormant: echos.filter((e) => e.segment === "dormant").length,
    },
  });
}
