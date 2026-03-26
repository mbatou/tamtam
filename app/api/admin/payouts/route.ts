import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get payouts for echos working on this brand's campaigns
  const brandId = await getEffectiveBrandId(supabase, session.user.id);
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("batteur_id", brandId);

  const campaignIds = (campaigns || []).map((c) => c.id);

  if (campaignIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get echo IDs from tracked links
  const { data: links } = await supabase
    .from("tracked_links")
    .select("echo_id")
    .in("campaign_id", campaignIds);

  const echoIds = Array.from(new Set((links || []).map((l) => l.echo_id)));

  if (echoIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get payouts for these echos
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*, users(name, phone)")
    .in("echo_id", echoIds)
    .order("created_at", { ascending: false });

  return NextResponse.json(payouts || []);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Verify user has admin/superadmin role before processing payouts
  const supabaseAdmin = createServiceClient();
  const { data: adminUser } = await supabaseAdmin.from("users").select("role").eq("id", session.user.id).single();
  if (!adminUser || !["batteur", "admin", "superadmin"].includes(adminUser.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { payout_id, status } = await request.json();
  if (!payout_id || !status) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("process_payout", {
    p_payout_id: payout_id,
    p_status: status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
