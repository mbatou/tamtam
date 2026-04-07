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

  // Wave checkouts
  const { data: checkouts } = await supabase
    .from("wave_checkouts")
    .select("*, users!user_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Wave payouts
  const { data: wavePayouts } = await supabase
    .from("wave_payouts")
    .select("*, users!user_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Legacy payments (recharges)
  const { data: payments } = await supabase
    .from("payments")
    .select("*, users!user_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Legacy payouts (withdrawals)
  const { data: legacyPayouts } = await supabase
    .from("payouts")
    .select("*, users!echo_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Unprocessed webhook events
  const { data: pendingEvents } = await supabase
    .from("wave_webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  // Stats — Wave
  const { count: totalCheckouts } = await supabase
    .from("wave_checkouts").select("*", { count: "exact", head: true });
  const { count: completedCheckouts } = await supabase
    .from("wave_checkouts").select("*", { count: "exact", head: true })
    .eq("checkout_status", "complete");
  const { count: totalWavePayouts } = await supabase
    .from("wave_payouts").select("*", { count: "exact", head: true });
  const { count: completedWavePayouts } = await supabase
    .from("wave_payouts").select("*", { count: "exact", head: true })
    .eq("payout_status", "completed");
  const { count: processingPayouts } = await supabase
    .from("wave_payouts").select("*", { count: "exact", head: true })
    .eq("payout_status", "processing");
  const { count: failedPayouts } = await supabase
    .from("wave_payouts").select("*", { count: "exact", head: true })
    .in("payout_status", ["failed", "reversed"]);

  // Stats — Legacy
  const { count: totalPayments } = await supabase
    .from("payments").select("*", { count: "exact", head: true });
  const { count: completedPayments } = await supabase
    .from("payments").select("*", { count: "exact", head: true })
    .eq("status", "completed");
  const { count: pendingPayments } = await supabase
    .from("payments").select("*", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: totalLegacyPayouts } = await supabase
    .from("payouts").select("*", { count: "exact", head: true });
  const { count: sentPayouts } = await supabase
    .from("payouts").select("*", { count: "exact", head: true })
    .eq("status", "sent");
  const { count: pendingLegacyPayouts } = await supabase
    .from("payouts").select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return NextResponse.json({
    checkouts: checkouts || [],
    wavePayouts: wavePayouts || [],
    payments: payments || [],
    legacyPayouts: legacyPayouts || [],
    pendingEvents: pendingEvents || [],
    stats: {
      // Wave
      totalCheckouts: totalCheckouts || 0,
      completedCheckouts: completedCheckouts || 0,
      totalWavePayouts: totalWavePayouts || 0,
      completedWavePayouts: completedWavePayouts || 0,
      processingPayouts: processingPayouts || 0,
      failedPayouts: failedPayouts || 0,
      // Legacy
      totalPayments: totalPayments || 0,
      completedPayments: completedPayments || 0,
      pendingPayments: pendingPayments || 0,
      totalLegacyPayouts: totalLegacyPayouts || 0,
      sentPayouts: sentPayouts || 0,
      pendingLegacyPayouts: pendingLegacyPayouts || 0,
    },
  });
}
