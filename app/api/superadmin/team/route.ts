import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Predefined team positions with default permissions
const POSITION_DEFAULTS: Record<string, string[]> = {
  coo: [
    "briefing", "overview", "roadmap", "fraud", "campaigns",
    "leads", "finance", "users", "gamification", "health", "support", "crm",
  ],
  customer_success: ["briefing", "overview", "users", "support", "leads", "crm"],
  campaign_manager: ["briefing", "overview", "campaigns", "leads", "users"],
  finance_manager: ["briefing", "overview", "finance", "users"],
  community_manager: ["briefing", "overview", "users", "support", "gamification"],
  custom: [],
};

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;

  const { data: members } = await supabase
    .from("users")
    .select("id, name, phone, role, team_position, team_permissions, created_at")
    .not("team_position", "is", null)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    members: members || [],
    positions: POSITION_DEFAULTS,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;
  const session = auth.session;
  const body = await request.json();
  const { action } = body;

  // --- Create a new team member ---
  if (action === "create") {
    const { name, email, password, phone, team_position, team_permissions } = body;
    if (!name || !email || !password || !team_position) {
      return NextResponse.json({ error: "Nom, email, mot de passe et poste requis" }, { status: 400 });
    }

    const permissions = team_permissions || POSITION_DEFAULTS[team_position] || [];

    // Create auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

    // Create profile
    const { error: profileErr } = await supabase.from("users").insert({
      id: authUser.user.id,
      name,
      phone: phone || null,
      role: "admin",
      team_position,
      team_permissions: permissions,
      balance: 0,
      total_earned: 0,
      status: "verified",
    });
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "team_create",
        target_type: "user",
        target_id: authUser.user.id,
        details: { name, email, team_position },
      });
    } catch { /* log may not exist */ }

    return NextResponse.json({ success: true, user_id: authUser.user.id });
  }

  // --- Update a team member's position/permissions ---
  if (action === "update") {
    const { user_id, team_position, team_permissions } = body;
    if (!user_id) return NextResponse.json({ error: "user_id requis" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (team_position !== undefined) updates.team_position = team_position;
    if (team_permissions !== undefined) updates.team_permissions = team_permissions;

    const { error } = await supabase.from("users").update(updates).eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "team_update",
        target_type: "user",
        target_id: user_id,
        details: { team_position, team_permissions },
      });
    } catch { /* log may not exist */ }

    return NextResponse.json({ success: true });
  }

  // --- Remove a team member (revoke access, set back to echo) ---
  if (action === "remove") {
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: "user_id requis" }, { status: 400 });

    // Don't allow removing yourself
    if (user_id === session.user.id) {
      return NextResponse.json({ error: "Impossible de se retirer soi-même" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users")
      .update({ role: "echo", team_position: null, team_permissions: [] })
      .eq("id", user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: session.user.id,
        action: "team_remove",
        target_type: "user",
        target_id: user_id,
      });
    } catch { /* log may not exist */ }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
