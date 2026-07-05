import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";
import { acceptCampaignSchema } from "@/lib/validations";
import { trackConversion } from "@/lib/tracking/track-conversion";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;
  const { data, error } = await supabase
    .from("tracked_links")
    .select("*, campaigns(*)")
    .eq("echo_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const body = await request.json();
  const parsed = acceptCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Verify campaign is active before accepting
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", parsed.data.campaign_id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }
  if (campaign.status !== "active") {
    return NextResponse.json({ error: "Cette campagne n'est plus active" }, { status: 400 });
  }

  // Check if already accepted
  const { data: existing } = await supabase
    .from("tracked_links")
    .select("id")
    .eq("campaign_id", parsed.data.campaign_id)
    .eq("echo_id", authUser.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Déjà accepté" }, { status: 409 });
  }

  // Generate unique short code
  let shortCode = Math.random().toString(36).substring(2, 8);
  const { data: codeExists } = await supabase
    .from("tracked_links")
    .select("id")
    .eq("short_code", shortCode)
    .single();

  if (codeExists) {
    shortCode = Math.random().toString(36).substring(2, 10);
  }

  const { data, error } = await supabase.from("tracked_links").insert({
    campaign_id: parsed.data.campaign_id,
    echo_id: authUser.id,
    short_code: shortCode,
  }).select("*, campaigns(*)").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update campaigns joined count
  const echoId = authUser.id;
  try {
    const { count } = await supabase
      .from("tracked_links")
      .select("id", { count: "exact", head: true })
      .eq("echo_id", echoId);

    await supabase
      .from("users")
      .update({ total_campaigns_joined: count || 0 })
      .eq("id", echoId);

    // First campaign accepted — fire activation conversion (non-blocking)
    if (count === 1) {
      const { data: user } = await supabase
        .from("users")
        .select("signup_tm_ref")
        .eq("id", echoId)
        .single();

      trackConversion({
        event: "activation",
        tmRef: user?.signup_tm_ref || null,
        externalId: `echo_activation_${echoId}`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Post-accept update failed:", err);
  }

  return NextResponse.json(data, { status: 201 });
}
