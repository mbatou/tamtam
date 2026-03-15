import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Cache for 5 minutes
export const revalidate = 300;

export async function GET() {
  const supabase = createServiceClient();

  const [echos, campaigns, clicks, payouts, batteurs] = await Promise.all([
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "echo"),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .eq("is_valid", true),
    supabase
      .from("payouts")
      .select("amount")
      .eq("status", "sent"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "batteur"),
  ]);

  const totalPaid = payouts.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const withdrawalCount = payouts.data?.length || 0;

  return NextResponse.json({
    echos: echos.count || 0,
    campaigns: campaigns.count || 0,
    validClicks: clicks.count || 0,
    totalPaid,
    withdrawalCount,
    batteurs: batteurs.count || 0,
  });
}
