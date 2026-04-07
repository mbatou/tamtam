import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "30"), 90);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("financial_snapshots")
    .select("*")
    .gte("snapshot_date", since.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute totals for the period
  const totals = (data || []).reduce(
    (acc, row) => ({
      grossRevenue: acc.grossRevenue + (row.gross_revenue || 0),
      netRevenue: acc.netRevenue + (row.net_revenue || 0),
      echoPayouts: acc.echoPayouts + (row.echo_payouts || 0),
      tamtamCommission: acc.tamtamCommission + (row.tamtam_commission || 0),
      ambassadorCommissions: acc.ambassadorCommissions + (row.ambassador_commissions || 0),
      waveFees: acc.waveFees + (row.wave_checkout_fees || 0) + (row.wave_payout_fees || 0),
      grossMargin: acc.grossMargin + (row.gross_margin || 0),
      clicksVerified: acc.clicksVerified + (row.clicks_verified || 0),
      clicksInvalid: acc.clicksInvalid + (row.clicks_invalid || 0),
    }),
    {
      grossRevenue: 0,
      netRevenue: 0,
      echoPayouts: 0,
      tamtamCommission: 0,
      ambassadorCommissions: 0,
      waveFees: 0,
      grossMargin: 0,
      clicksVerified: 0,
      clicksInvalid: 0,
    }
  );

  return NextResponse.json({ snapshots: data || [], totals, days });
}
