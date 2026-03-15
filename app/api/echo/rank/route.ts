import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
  const echoId = session.user.id;

  const now = new Date();
  const weekDate = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthDate = new Date(now.getTime() - 30 * 86400000).toISOString();
  const allDate = "2020-01-01T00:00:00Z";

  // Fetch all 3 period leaderboards in parallel (with higher limit to find user)
  const [weekRes, monthRes, allRes] = await Promise.all([
    supabase.rpc("get_leaderboard", { since_date: weekDate, limit_count: 1000 }),
    supabase.rpc("get_leaderboard", { since_date: monthDate, limit_count: 1000 }),
    supabase.rpc("get_leaderboard", { since_date: allDate, limit_count: 1000 }),
  ]);

  function findRank(data: { echo_id: string }[] | null): number {
    if (!data) return 0;
    const idx = data.findIndex((e) => e.echo_id === echoId);
    return idx >= 0 ? idx + 1 : 0;
  }

  return NextResponse.json({
    week: findRank(weekRes.data),
    month: findRank(monthRes.data),
    all: findRank(allRes.data),
  });
}
