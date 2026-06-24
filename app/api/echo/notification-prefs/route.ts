import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = [
  "new_campaign",
  "share_reminder",
  "inactivity",
  "campaign_ending",
  "streak_danger",
];

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("users")
    .select("notification_prefs")
    .eq("id", session.user.id)
    .single();

  const prefs: Record<string, boolean> = {};
  for (const key of ALLOWED_KEYS) {
    prefs[key] = (data?.notification_prefs as Record<string, boolean>)?.[key] !== false;
  }

  return NextResponse.json(prefs);
}

export async function PUT(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const prefs: Record<string, boolean> = {};

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      prefs[key] = Boolean(body[key]);
    }
  }

  const supabase = createServiceClient();

  // Handle SMS opt-out separately (direct column, not JSONB)
  if ("sms_optout" in body) {
    const smsUpdate: Record<string, unknown> = {
      sms_optout: Boolean(body.sms_optout),
    };
    if (body.sms_optout) {
      smsUpdate.sms_optout_at = body.sms_optout_at || new Date().toISOString();
    } else {
      smsUpdate.sms_optout_at = null;
    }
    await supabase
      .from("users")
      .update(smsUpdate)
      .eq("id", session.user.id);
  }

  // Merge with existing prefs (brand prefs may also be on this field)
  if (Object.keys(prefs).length > 0) {
    const { data: existing } = await supabase
      .from("users")
      .select("notification_prefs")
      .eq("id", session.user.id)
      .single();

    const merged = { ...(existing?.notification_prefs as Record<string, boolean> || {}), ...prefs };

    await supabase
      .from("users")
      .update({ notification_prefs: merged })
      .eq("id", session.user.id);

    return NextResponse.json({ success: true, prefs: merged });
  }

  return NextResponse.json({ success: true });
}
