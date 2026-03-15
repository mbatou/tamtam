import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendNewCampaignNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { campaign_id } = await request.json();
  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id requis" }, { status: 400 });
  }

  // Get campaign details
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, cpc, status")
    .eq("id", campaign_id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  // Get all active echos
  const { data: echos } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "echo");

  if (!echos?.length) {
    return NextResponse.json({ error: "Aucun echo trouvé" }, { status: 404 });
  }

  // Get auth emails
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers?.map((u) => [u.id, u.email]) || []);

  let sent = 0;
  let failed = 0;

  for (const echo of echos) {
    const email = emailMap.get(echo.id);
    if (email) {
      try {
        await sendNewCampaignNotification({
          to: email,
          echoName: echo.name,
          campaignTitle: campaign.title,
          cpc: campaign.cpc,
        });
        sent++;
      } catch {
        failed++;
      }
    }
  }

  // Log the action
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: "campaign_notify_echos",
      target_type: "campaign",
      target_id: campaign_id,
      details: { sent, failed, total: echos.length },
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, sent, failed, total: echos.length });
}
