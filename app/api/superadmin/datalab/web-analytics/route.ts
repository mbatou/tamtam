import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();

  const { data: currentUser } = await supabaseAdmin
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  try {
    // ===== DAILY CLICKS (30 days) =====
    const { data: clicksData } = await supabaseAdmin
      .from("clicks")
      .select("created_at, is_valid")
      .gte("created_at", thirtyDaysAgo)
      .limit(50000);

    const dailyClicks: Record<string, { total: number; valid: number }> = {};
    for (const click of clicksData || []) {
      const day = click.created_at.slice(0, 10);
      if (!dailyClicks[day]) dailyClicks[day] = { total: 0, valid: 0 };
      dailyClicks[day].total++;
      if (click.is_valid) dailyClicks[day].valid++;
    }

    const clicksTrend = Object.entries(dailyClicks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // ===== DAILY SIGNUPS (30 days) =====
    const { data: signupsData } = await supabaseAdmin
      .from("users")
      .select("created_at, role")
      .is("deleted_at", null)
      .gte("created_at", thirtyDaysAgo);

    const dailySignups: Record<string, { echos: number; brands: number }> = {};
    for (const user of signupsData || []) {
      const day = user.created_at.slice(0, 10);
      if (!dailySignups[day]) dailySignups[day] = { echos: 0, brands: 0 };
      if (user.role === "echo") dailySignups[day].echos++;
      else if (user.role === "batteur" || user.role === "brand") dailySignups[day].brands++;
    }

    const signupsTrend = Object.entries(dailySignups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // ===== TOP CAMPAIGNS BY CLICKS (30 days) =====
    const { data: campaignClicks } = await supabaseAdmin
      .from("clicks")
      .select("is_valid, tracked_links!inner(campaign_id, campaigns!inner(title))")
      .gte("created_at", thirtyDaysAgo)
      .eq("is_valid", true)
      .limit(50000);

    const campaignCounts: Record<string, { title: string; clicks: number }> = {};
    for (const click of campaignClicks || []) {
      const tl = click.tracked_links as unknown as { campaign_id: string; campaigns: { title: string } | null } | null;
      const title = tl?.campaigns?.title;
      const cid = tl?.campaign_id;
      if (cid && title) {
        if (!campaignCounts[cid]) campaignCounts[cid] = { title, clicks: 0 };
        campaignCounts[cid].clicks++;
      }
    }

    const topCampaigns = Object.values(campaignCounts)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);

    // ===== CLICK HOURS DISTRIBUTION =====
    const hourDist: number[] = Array(24).fill(0);
    for (const click of clicksData || []) {
      const hour = new Date(click.created_at).getUTCHours();
      hourDist[hour]++;
    }

    // ===== SUMMARY TOTALS =====
    const totalClicks = (clicksData || []).length;
    const validClicks = (clicksData || []).filter((c: { is_valid: boolean }) => c.is_valid).length;
    const totalSignups = (signupsData || []).length;
    const echoSignups = (signupsData || []).filter((u: { role: string }) => u.role === "echo").length;
    const brandSignups = (signupsData || []).filter((u: { role: string }) => u.role === "batteur" || u.role === "brand").length;

    return NextResponse.json({
      summary: {
        totalClicks,
        validClicks,
        fraudRate: totalClicks > 0 ? Math.round(((totalClicks - validClicks) / totalClicks) * 100) : 0,
        totalSignups,
        echoSignups,
        brandSignups,
      },
      clicksTrend,
      signupsTrend,
      topCampaigns,
      hourDistribution: hourDist,
      period: { from: thirtyDaysAgo, to: now.toISOString() },
    });
  } catch (error) {
    console.error("Web analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
