import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, users!batteur_id(name, phone)")
    .order("created_at", { ascending: false });

  // Get echo counts per campaign
  const { data: links } = await supabase
    .from("tracked_links")
    .select("campaign_id, echo_id");

  const echoCountMap: Record<string, number> = {};
  const clickCountMap: Record<string, number> = {};
  if (links) {
    for (const link of links) {
      echoCountMap[link.campaign_id] = (echoCountMap[link.campaign_id] || 0) + 1;
    }
  }

  // Get click counts per campaign
  const { data: linkClicks } = await supabase
    .from("tracked_links")
    .select("campaign_id, click_count");

  if (linkClicks) {
    for (const link of linkClicks) {
      clickCountMap[link.campaign_id] = (clickCountMap[link.campaign_id] || 0) + link.click_count;
    }
  }

  const enriched = (campaigns || []).map((c: Record<string, unknown>) => ({
    ...c,
    echo_count: echoCountMap[c.id as string] || 0,
    total_clicks: clickCountMap[c.id as string] || 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const body = await request.json();
  const { campaign_id, action, reason } = body;

  if (!campaign_id || !action) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    moderated_by: session.user.id,
    moderated_at: new Date().toISOString(),
  };

  switch (action) {
    case "approve":
      updates.moderation_status = "approved";
      updates.status = "active";
      break;
    case "reject":
      updates.moderation_status = "rejected";
      updates.status = "rejected";
      updates.moderation_reason = reason || "Rejeté par l'admin";
      break;
    case "pause":
      updates.status = "paused";
      break;
    case "resume":
      updates.status = "active";
      break;
    default:
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const { error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", campaign_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log action
  await supabase.from("admin_activity_log").insert({
    admin_id: session.user.id,
    action: `campaign_${action}`,
    target_type: "campaign",
    target_id: campaign_id,
    details: { reason },
  });

  return NextResponse.json({ success: true });
}
