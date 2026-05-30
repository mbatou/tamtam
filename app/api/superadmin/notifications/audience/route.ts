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

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { segment, cityFilter } = await request.json();
  const supabase = auth.supabase;
  const result = await buildAudience(supabase, segment, cityFilter);

  // Get push + email eligible counts
  const echoIds = result.map((e: { id: string }) => e.id);

  let pushEligible = 0;
  let emailEligible = 0;
  let cappedCount = 0;

  if (echoIds.length > 0) {
    const { count: pushCount } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .in("user_id", echoIds.slice(0, 500));
    pushEligible = pushCount || 0;

    // Check how many have email via auth
    emailEligible = echoIds.length;

    // Check daily caps
    const today = new Date().toISOString().split("T")[0];
    const { data: caps } = await supabase
      .from("notification_daily_caps")
      .select("echo_id")
      .in("echo_id", echoIds.slice(0, 500))
      .eq("date", today)
      .gte("send_count", 2);
    cappedCount = caps?.length || 0;
  }

  return NextResponse.json({
    total: echoIds.length,
    pushEligible,
    emailEligible,
    cappedCount,
    echoIds,
  });
}

async function buildAudience(
  supabase: ReturnType<typeof createServiceClient>,
  segment: string,
  cityFilter?: string[],
): Promise<{ id: string }[]> {
  let query = supabase
    .from("users")
    .select("id")
    .eq("role", "echo")
    .is("deleted_at", null);

  switch (segment) {
    case "all_active":
      break;
    case "has_joined": {
      const { data: linkEchos } = await supabase
        .from("tracked_links")
        .select("echo_id");
      const joinedIds = Array.from(new Set((linkEchos || []).map((l: { echo_id: string }) => l.echo_id)));
      if (joinedIds.length === 0) return [];
      query = query.in("id", joinedIds.slice(0, 500));
      break;
    }
    case "no_clicks": {
      const { data: zeroLinks } = await supabase
        .from("tracked_links")
        .select("echo_id")
        .eq("click_count", 0);
      const zeroIds = Array.from(new Set((zeroLinks || []).map((l: { echo_id: string }) => l.echo_id)));
      if (zeroIds.length === 0) return [];
      query = query.in("id", zeroIds.slice(0, 500));
      break;
    }
    case "dormant": {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentLinks } = await supabase
        .from("tracked_links")
        .select("echo_id")
        .gte("created_at", thirtyDaysAgo);
      const recentIds = new Set((recentLinks || []).map((l: { echo_id: string }) => l.echo_id));
      const { data: allLinks } = await supabase
        .from("tracked_links")
        .select("echo_id");
      const allLinkIds = Array.from(new Set((allLinks || []).map((l: { echo_id: string }) => l.echo_id)));
      const dormantIds = allLinkIds.filter((id) => !recentIds.has(id));
      if (dormantIds.length === 0) return [];
      query = query.in("id", dormantIds.slice(0, 500));
      break;
    }
    case "ghosts": {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: linkEchos } = await supabase
        .from("tracked_links")
        .select("echo_id");
      const joinedSet = new Set((linkEchos || []).map((l: { echo_id: string }) => l.echo_id));
      query = query.lt("created_at", fourteenDaysAgo);
      const { data: allEchos } = await query;
      return (allEchos || []).filter((e: { id: string }) => !joinedSet.has(e.id));
    }
    case "streak_active": {
      const { data: streaks } = await supabase
        .from("echo_streaks")
        .select("echo_id")
        .gt("current_streak", 0);
      const streakIds = (streaks || []).map((s: { echo_id: string }) => s.echo_id);
      if (streakIds.length === 0) return [];
      query = query.in("id", streakIds.slice(0, 500));
      break;
    }
  }

  if (cityFilter && cityFilter.length > 0) {
    query = query.in("city", cityFilter);
  }

  const { data } = await query.limit(5000);
  return data || [];
}
