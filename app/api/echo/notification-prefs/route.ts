import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";
import {
  SUPPRESSIBLE_CATEGORIES,
  type EmailCategory,
  type EmailPrefs,
} from "@/lib/notifications/channel-policy";

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
    .select("notification_prefs, sms_optout, email_optout, email_prefs")
    .eq("id", authUser.id)
    .single();

  const prefs: Record<string, boolean> = {};
  for (const key of ALLOWED_KEYS) {
    prefs[key] = (data?.notification_prefs as Record<string, boolean>)?.[key] !== false;
  }

  // Email preferences live alongside push and SMS so all three channels are
  // manageable from one screen. Only suppressible categories are exposed —
  // account and payment email cannot be turned off, so offering a toggle that
  // does nothing would be a lie.
  const emailPrefs = (data?.email_prefs as EmailPrefs | null) || {};
  const email: Record<string, boolean> = {};
  for (const category of SUPPRESSIBLE_CATEGORIES) {
    email[category] = emailPrefs[category] !== false;
  }

  return NextResponse.json({
    ...prefs,
    sms_optout: Boolean(data?.sms_optout),
    email_optout: Boolean(data?.email_optout),
    email,
  });
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

  // Email opt-out — same shape as the SMS pair above.
  if ("email_optout" in body) {
    await supabase
      .from("users")
      .update({
        email_optout: Boolean(body.email_optout),
        email_optout_at: body.email_optout ? new Date().toISOString() : null,
      })
      .eq("id", authUser.id);
  }

  // Per-category email preferences. Only suppressible categories are writable:
  // a request to disable "money" or "account" email is silently ignored rather
  // than stored, so no future reader can mistake it for an honoured preference.
  if (body.email && typeof body.email === "object") {
    const incoming: EmailPrefs = {};
    for (const category of SUPPRESSIBLE_CATEGORIES) {
      if (category in body.email) {
        incoming[category as EmailCategory] = Boolean(body.email[category]);
      }
    }

    if (Object.keys(incoming).length > 0) {
      const { data: existing } = await supabase
        .from("users")
        .select("email_prefs")
        .eq("id", authUser.id)
        .single();

      await supabase
        .from("users")
        .update({ email_prefs: { ...((existing?.email_prefs as EmailPrefs | null) || {}), ...incoming } })
        .eq("id", authUser.id);
    }
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
