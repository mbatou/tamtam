import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Get average CPC from active + completed campaigns (meaningful data only)
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("cpc, budget, spent")
    .in("status", ["active", "completed", "paused"]);

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ avgCpc: 0, campaignCount: 0 });
  }

  const totalCpc = campaigns.reduce((sum, c) => sum + (c.cpc || 0), 0);
  const avgCpc = Math.round(totalCpc / campaigns.length);

  return NextResponse.json({
    avgCpc,
    campaignCount: campaigns.length,
  });
}
