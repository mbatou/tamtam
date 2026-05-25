import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getUTCDay();
  // Monday = 1, so offset: if Sunday (0) treat as 7
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

function getStartOfMonth(): string {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return first.toISOString();
}

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period") || "weekly";
  const sinceDate = period === "monthly" ? getStartOfMonth() : getStartOfWeek();

  const supabase = createServiceClient();

  // Get ALL results (no limit) to compute user rank
  const { data: allResults, error } = await supabase.rpc("get_leaderboard", {
    since_date: sinceDate,
    limit_count: 1000,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = allResults || [];

  // Sort by total_clicks descending (RPC may already sort, but ensure consistency)
  results.sort(
    (a: { total_clicks: number }, b: { total_clicks: number }) =>
      Number(b.total_clicks) - Number(a.total_clicks),
  );

  // Find current user's rank (1-indexed)
  const userIndex = results.findIndex(
    (r: { echo_id: string }) => r.echo_id === session.user.id,
  );
  const userRank = userIndex >= 0 ? userIndex + 1 : null;

  // Get top 20 for the leaderboard response
  const top20Ids = results
    .slice(0, 20)
    .map((r: { echo_id: string }) => r.echo_id);

  // Fetch city and is_founding_echo for each entry in top 20
  let userDetails: Record<string, { city: string | null; is_founding_echo: boolean }> = {};

  if (top20Ids.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, city, is_founding_echo")
      .in("id", top20Ids)
      .is("deleted_at", null);

    if (users) {
      userDetails = Object.fromEntries(
        users.map((u) => [u.id, { city: u.city || null, is_founding_echo: !!u.is_founding_echo }]),
      );
    }
  }

  const leaderboard = results.slice(0, 20).map(
    (
      r: {
        echo_id: string;
        name: string;
        tier: string;
        total_clicks: number;
        campaigns_joined: number;
      },
      index: number,
    ) => ({
      rank: index + 1,
      echo_id: r.echo_id,
      name: r.name,
      tier: r.tier,
      total_clicks: Number(r.total_clicks),
      campaigns_joined: Number(r.campaigns_joined),
      city: userDetails[r.echo_id]?.city || null,
      is_founding_echo: userDetails[r.echo_id]?.is_founding_echo || false,
    }),
  );

  return NextResponse.json({
    leaderboard,
    userRank,
    period,
    startDate: sinceDate,
  });
}
