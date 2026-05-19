import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: admin } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: echos } = await supabase
    .from("users")
    .select("available_balance, pending_balance")
    .eq("role", "echo")
    .is("deleted_at", null);

  const totalAvailable = (echos || []).reduce(
    (sum, u) => sum + (u.available_balance || 0), 0
  );
  const totalPending = (echos || []).reduce(
    (sum, u) => sum + (u.pending_balance || 0), 0
  );

  const { data: upcoming } = await supabase
    .from("pending_earnings")
    .select("campaign_name, unlock_date, amount_fcfa, echo_id")
    .eq("status", "pending")
    .gt("amount_fcfa", 0)
    .order("unlock_date", { ascending: true })
    .limit(50);

  interface UpcomingGroup {
    campaign: string;
    date: string;
    total: number;
    echos: number;
  }

  const grouped: Record<string, UpcomingGroup> = {};
  (upcoming || []).forEach((pe) => {
    const key = `${pe.campaign_name}_${pe.unlock_date}`;
    if (!grouped[key]) {
      grouped[key] = {
        campaign: pe.campaign_name || "Campagne",
        date: pe.unlock_date,
        total: 0,
        echos: 0,
      };
    }
    grouped[key].total += pe.amount_fcfa;
    grouped[key].echos += 1;
  });

  return NextResponse.json({
    total_available: totalAvailable,
    total_pending: totalPending,
    total_owed: totalAvailable + totalPending,
    upcoming_unlocks: Object.values(grouped),
  });
}
