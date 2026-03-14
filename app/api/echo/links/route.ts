import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { acceptCampaignSchema } from "@/lib/validations";
import { updateStreak, checkMilestones } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tracked_links")
    .select("*, campaigns(*)")
    .eq("echo_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = acceptCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check if already accepted
  const { data: existing } = await supabase
    .from("tracked_links")
    .select("id")
    .eq("campaign_id", parsed.data.campaign_id)
    .eq("echo_id", session.user.id)
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
    echo_id: session.user.id,
    short_code: shortCode,
  }).select("*, campaigns(*)").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update campaigns joined count, streak, and check milestones (async)
  const echoId = session.user.id;
  (async () => {
    await supabase
      .from("users")
      .update({
        total_campaigns_joined: (
          await supabase
            .from("tracked_links")
            .select("id", { count: "exact", head: true })
            .eq("echo_id", echoId)
        ).count || 0,
      })
      .eq("id", echoId);

    await updateStreak(echoId);
    await checkMilestones(echoId);
  })().catch(console.error);

  return NextResponse.json(data, { status: 201 });
}
