import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("available_balance, pending_balance, balance")
    .eq("id", session.user.id)
    .single();

  const available = user?.available_balance ?? user?.balance ?? 0;
  const pending = user?.pending_balance ?? 0;

  const { data: pendingList } = await supabase
    .from("pending_earnings")
    .select("campaign_name, amount_fcfa, click_count, unlock_date")
    .eq("echo_id", session.user.id)
    .eq("status", "pending")
    .gt("amount_fcfa", 0)
    .order("unlock_date", { ascending: true });

  const { data: minConfig } = await supabase
    .from("gamification_caps")
    .select("max_amount_fcfa")
    .eq("cap_type", "min_withdrawal")
    .maybeSingle();

  const { data: minPayoutSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "min_payout_fcfa")
    .maybeSingle();

  const minWithdrawal = minConfig?.max_amount_fcfa
    || parseInt(minPayoutSetting?.value || "500")
    || 500;

  return NextResponse.json({
    available,
    pending,
    total: available + pending,
    min_withdrawal: minWithdrawal,
    pending_campaigns: pendingList || [],
  });
}
