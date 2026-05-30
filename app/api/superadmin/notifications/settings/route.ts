import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || !["superadmin", "admin"].includes(user.role)) return null;
  return { session, supabase };
}

const SETTING_KEYS = [
  "notification_quiet_start",
  "notification_quiet_end",
  "notification_daily_cap",
];

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await auth.supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", SETTING_KEYS);

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({
    quietStart: parseInt(settings.notification_quiet_start) || 23,
    quietEnd: parseInt(settings.notification_quiet_end) || 6,
    dailyCap: parseInt(settings.notification_daily_cap) || 2,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { quietStart, quietEnd, dailyCap } = body;

  const updates: { key: string; value: string }[] = [];
  if (quietStart !== undefined) updates.push({ key: "notification_quiet_start", value: String(quietStart) });
  if (quietEnd !== undefined) updates.push({ key: "notification_quiet_end", value: String(quietEnd) });
  if (dailyCap !== undefined) updates.push({ key: "notification_daily_cap", value: String(dailyCap) });

  for (const update of updates) {
    await auth.supabase
      .from("platform_settings")
      .upsert({ key: update.key, value: update.value }, { onConflict: "key" });
  }

  return NextResponse.json({ success: true });
}
