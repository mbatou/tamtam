import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifyCronSecret(authHeader: string | null): boolean {
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!authHeader || authHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    // Revenue from clicks today
    const { data: clickTxns } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "click_earning")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const echoPayouts = (clickTxns || []).reduce(
      (s: number, r: { amount: number }) => s + Math.abs(r.amount),
      0
    );

    // Campaign budget debits today (gross revenue proxy)
    const { data: campaignDebits } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "campaign_budget_debit")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const grossRevenue = (campaignDebits || []).reduce(
      (s: number, r: { amount: number }) => s + Math.abs(r.amount),
      0
    );

    // Ambassador commissions today
    const { data: ambassadorTxns } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "referral_bonus")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const ambassadorCommissions = (ambassadorTxns || []).reduce(
      (s: number, r: { amount: number }) => s + Math.abs(r.amount),
      0
    );

    // Tamtam commission = gross - echo payouts - ambassador commissions
    const tamtamCommission = Math.max(0, grossRevenue - echoPayouts - ambassadorCommissions);
    const netRevenue = tamtamCommission;

    // Wave checkout fees today
    const { data: checkoutFees } = await supabaseAdmin
      .from("wave_checkouts")
      .select("amount")
      .eq("checkout_status", "complete")
      .gte("completed_at", startOfDay)
      .lte("completed_at", endOfDay);

    const waveCheckoutFees = Math.ceil(
      (checkoutFees || []).reduce((s: number, r: { amount: number }) => s + r.amount, 0) * 0.01
    );

    // Wave payout fees today
    const { data: payoutFees } = await supabaseAdmin
      .from("wave_payouts")
      .select("fee")
      .eq("payout_status", "completed")
      .gte("completed_at", startOfDay)
      .lte("completed_at", endOfDay);

    const wavePayoutFees = (payoutFees || []).reduce(
      (s: number, r: { fee: number }) => s + (r.fee || 0),
      0
    );

    // Welcome bonuses today
    const { data: bonusTxns } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "welcome_bonus")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const welcomeBonuses = (bonusTxns || []).reduce(
      (s: number, r: { amount: number }) => s + Math.abs(r.amount),
      0
    );

    // Challenge rewards today
    const { data: challengeTxns } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .in("type", ["badge_reward", "streak_bonus"])
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const challengeRewards = (challengeTxns || []).reduce(
      (s: number, r: { amount: number }) => s + Math.abs(r.amount),
      0
    );

    // Click stats today
    const { count: clicksVerified } = await supabaseAdmin
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .eq("is_valid", true)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const { count: clicksInvalid } = await supabaseAdmin
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .eq("is_valid", false)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    // Active brands/echos (had activity today)
    const { data: activeBrands } = await supabaseAdmin
      .from("campaigns")
      .select("user_id")
      .eq("status", "active");
    const brandsActive = new Set((activeBrands || []).map((c: { user_id: string }) => c.user_id)).size;

    const { count: echosActive } = await supabaseAdmin
      .from("clicks")
      .select("user_id", { count: "exact", head: true })
      .eq("is_valid", true)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    // New registrations today
    const { count: newBrands } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "batteur")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const { count: newEchos } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "echo")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const grossMargin = netRevenue - waveCheckoutFees - wavePayoutFees - welcomeBonuses - challengeRewards;

    // Upsert for today
    const { error } = await supabaseAdmin
      .from("financial_snapshots")
      .upsert(
        {
          snapshot_date: today,
          gross_revenue: grossRevenue,
          tamtam_commission: tamtamCommission,
          ambassador_commissions: ambassadorCommissions,
          net_revenue: netRevenue,
          echo_payouts: echoPayouts,
          wave_checkout_fees: waveCheckoutFees,
          wave_payout_fees: wavePayoutFees,
          welcome_bonuses: welcomeBonuses,
          challenge_rewards: challengeRewards,
          clicks_verified: clicksVerified || 0,
          clicks_invalid: clicksInvalid || 0,
          brands_active: brandsActive,
          echos_active: echosActive || 0,
          new_brands: newBrands || 0,
          new_echos: newEchos || 0,
          gross_margin: grossMargin,
        },
        { onConflict: "snapshot_date" }
      );

    if (error) {
      console.error("Financial snapshot upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      date: today,
      grossRevenue,
      netRevenue,
      grossMargin,
    });
  } catch (err) {
    console.error("Financial snapshot cron error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
