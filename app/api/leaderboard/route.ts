import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") || "week";

  let dateFilter: string;
  const now = new Date();
  if (period === "week") {
    dateFilter = new Date(now.getTime() - 7 * 86400000).toISOString();
  } else if (period === "month") {
    dateFilter = new Date(now.getTime() - 30 * 86400000).toISOString();
  } else {
    dateFilter = "2020-01-01T00:00:00Z";
  }

  const { data, error } = await supabaseAdmin.rpc("get_leaderboard", {
    since_date: dateFilter,
    limit_count: 20,
  });

  if (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // Enrich with founding echo status
  const echoIds = (data || []).map((e: { echo_id: string }) => e.echo_id).filter(Boolean);
  let foundingMap: Record<string, boolean> = {};
  if (echoIds.length > 0) {
    const { data: foundingData } = await supabaseAdmin
      .from("users")
      .select("id, is_founding_echo")
      .in("id", echoIds)
      .eq("is_founding_echo", true);
    if (foundingData) {
      foundingMap = Object.fromEntries(foundingData.map((u: { id: string }) => [u.id, true]));
    }
  }

  const enriched = (data || []).map((e: { echo_id: string }) => ({
    ...e,
    is_founding_echo: !!foundingMap[e.echo_id],
  }));

  return NextResponse.json({ leaderboard: enriched, period });
}
