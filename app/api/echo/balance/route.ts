import { NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const { data: user } = await supabase
    .from("users")
    .select("available_balance, pending_balance, balance")
    .eq("id", authUser.id)
    .single();

  const available = user?.available_balance ?? user?.balance ?? 0;
  const pending = user?.pending_balance ?? 0;

  const { data: pendingList } = await supabase
    .from("pending_earnings")
    .select("campaign_name, amount_fcfa, click_count, unlock_date")
    .eq("echo_id", authUser.id)
    .eq("status", "pending")
    .gt("amount_fcfa", 0)
    .order("unlock_date", { ascending: true });

  const { data: minPayoutSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "min_payout_fcfa")
    .maybeSingle();

  const minWithdrawal = parseInt(minPayoutSetting?.value || "500") || 500;

  return NextResponse.json({
    available,
    pending,
    total: available + pending,
    min_withdrawal: minWithdrawal,
    pending_campaigns: pendingList || [],
  });
}
