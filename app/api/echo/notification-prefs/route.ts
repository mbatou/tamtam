import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = [
  "new_campaign",
  "share_reminder",
  "inactivity",
  "campaign_ending",
  "streak_danger",
];

export async function GET(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const { data } = await supabase
    .from("users")
    .select("notification_prefs")
    .eq("id", authUser.id)
    .single();

  const prefs: Record<string, boolean> = {};
  for (const key of ALLOWED_KEYS) {
    prefs[key] = (data?.notification_prefs as Record<string, boolean>)?.[key] !== false;
  }

  return NextResponse.json(prefs);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const body = await request.json();
  const prefs: Record<string, boolean> = {};

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      prefs[key] = Boolean(body[key]);
    }
  }

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
      .eq("id", authUser.id);
  }

  // Merge with existing prefs (brand prefs may also be on this field)
  if (Object.keys(prefs).length > 0) {
    const { data: existing } = await supabase
      .from("users")
      .select("notification_prefs")
      .eq("id", authUser.id)
      .single();

    const merged = { ...(existing?.notification_prefs as Record<string, boolean> || {}), ...prefs };

    await supabase
      .from("users")
      .update({ notification_prefs: merged })
      .eq("id", authUser.id);

    return NextResponse.json({ success: true, prefs: merged });
  }

  return NextResponse.json({ success: true });
}
