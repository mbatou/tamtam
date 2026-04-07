import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch recent checkouts
  const { data: checkouts } = await supabase
    .from("wave_checkouts")
    .select("*, users!user_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch recent payouts
  const { data: payouts } = await supabase
    .from("wave_payouts")
    .select("*, users!user_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch unprocessed webhook events
  const { data: pendingEvents } = await supabase
    .from("wave_webhook_events")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  // Summary stats
  const { count: totalCheckouts } = await supabase
    .from("wave_checkouts")
    .select("*", { count: "exact", head: true });

  const { count: completedCheckouts } = await supabase
    .from("wave_checkouts")
    .select("*", { count: "exact", head: true })
    .eq("checkout_status", "complete");

  const { count: totalPayouts } = await supabase
    .from("wave_payouts")
    .select("*", { count: "exact", head: true });

  const { count: completedPayouts } = await supabase
    .from("wave_payouts")
    .select("*", { count: "exact", head: true })
    .eq("payout_status", "completed");

  const { count: processingPayouts } = await supabase
    .from("wave_payouts")
    .select("*", { count: "exact", head: true })
    .eq("payout_status", "processing");

  const { count: failedPayouts } = await supabase
    .from("wave_payouts")
    .select("*", { count: "exact", head: true })
    .in("payout_status", ["failed", "reversed"]);

  return NextResponse.json({
    checkouts: checkouts || [],
    payouts: payouts || [],
    pendingEvents: pendingEvents || [],
    stats: {
      totalCheckouts: totalCheckouts || 0,
      completedCheckouts: completedCheckouts || 0,
      totalPayouts: totalPayouts || 0,
      completedPayouts: completedPayouts || 0,
      processingPayouts: processingPayouts || 0,
      failedPayouts: failedPayouts || 0,
    },
  });
}
