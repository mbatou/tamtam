import { NextResponse } from "next/server";

export async function GET() {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken || !projectId) {
    return NextResponse.json({
      error: "Vercel API not configured",
      setup: "Add VERCEL_API_TOKEN and VERCEL_PROJECT_ID to Vercel env vars",
    }, { status: 400 });
  }

  const from = new Date(Date.now() - 30 * 86400000).toISOString();
  const to = new Date().toISOString();
  const headers = { Authorization: `Bearer ${vercelToken}` };

  const baseParams = new URLSearchParams({ projectId, from, to });
  if (teamId) baseParams.set("teamId", teamId);

  try {
    const endpoints = [
      { key: "pageViews", path: "path", limit: 10 },
      { key: "referrers", path: "referrer", limit: 10 },
      { key: "devices", path: "device", limit: 5 },
      { key: "countries", path: "country", limit: 10 },
      { key: "browsers", path: "browser", limit: 5 },
      { key: "os", path: "os", limit: 5 },
    ];

    const results: Record<string, unknown[]> = {};

    for (const ep of endpoints) {
      const params = new URLSearchParams(baseParams);
      params.set("limit", String(ep.limit));
      try {
        const res = await fetch(
          `https://vercel.com/api/web/insights/stats/${ep.path}?${params}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          results[ep.key] = data?.data || [];
        } else {
          results[ep.key] = [];
        }
      } catch {
        results[ep.key] = [];
      }
    }

    // Also fetch custom events
    try {
      const eventParams = new URLSearchParams(baseParams);
      eventParams.set("limit", "20");
      const eventsRes = await fetch(
        `https://vercel.com/api/web/insights/stats/event?${eventParams}`,
        { headers }
      );
      results["customEvents"] = eventsRes.ok ? (await eventsRes.json())?.data || [] : [];
    } catch {
      results["customEvents"] = [];
    }

    return NextResponse.json({ ...results, period: { from, to } });
  } catch (error) {
    console.error("Vercel Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
