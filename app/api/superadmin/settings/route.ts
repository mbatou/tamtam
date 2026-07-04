import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { settingUpdateSchema } from "@/lib/validations";
import { requireAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  try {
    return await requireAuth(["superadmin"]);
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;

  const [
    { data: settings },
    { data: admins },
  ] = await Promise.all([
    supabase.from("platform_settings").select("*"),
    supabase.from("users").select("id, name, phone, role, created_at").in("role", ["admin", "superadmin"]).is("deleted_at", null),
  ]);

  let recentLogs: unknown[] = [];
  try {
    const { data } = await supabase.from("admin_activity_log").select("*, users!admin_id(name)").order("created_at", { ascending: false }).limit(20);
    recentLogs = data || [];
  } catch { /* admin_activity_log may not exist yet */ }

  return NextResponse.json({
    settings: settings || [],
    admins: admins || [],
    recentLogs,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const authUser = auth.authUser;
  const body = await request.json();
  const parsed = settingUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { key, value } = parsed.data;

  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: authUser.id,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: authUser.id,
      action: "setting_update",
      target_type: "setting",
      target_id: key,
      details: { value },
    });
  } catch { /* admin_activity_log may not exist yet */ }

  return NextResponse.json({ success: true });
}
