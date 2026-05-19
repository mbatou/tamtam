import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { notifyEchoUnlock } from "@/lib/unlock-earnings";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || !process.env.CRON_SECRET) return false;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: dueList } = await supabaseAdmin
    .from("pending_earnings")
    .select("*")
    .eq("status", "pending")
    .lte("unlock_date", today)
    .gt("amount_fcfa", 0);

  if (!dueList || dueList.length === 0) {
    return NextResponse.json({ unlocked: 0, date: today });
  }

  let unlockedCount = 0;

  for (const pending of dueList) {
    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("title, status, ends_at")
      .eq("id", pending.campaign_id)
      .single();

    const isStillActive = campaign?.status === "active";

    if (isStillActive) {
      // Campaign still running — 30-day rolling unlock
      await supabaseAdmin.rpc("transfer_pending_to_available", {
        p_user_id: pending.echo_id,
        p_amount: pending.amount_fcfa,
      });

      await logWalletTransaction({
        supabase: supabaseAdmin,
        userId: pending.echo_id,
        amount: pending.amount_fcfa,
        type: "click_earning",
        description: `Gains débloqués (paiement intermédiaire) — ${campaign?.title || pending.campaign_name}`,
        sourceId: pending.campaign_id,
        sourceType: "campaign_unlock",
      });

      // Reset for next 30-day cycle
      const nextUnlock = new Date();
      nextUnlock.setDate(nextUnlock.getDate() + 30);

      await supabaseAdmin
        .from("pending_earnings")
        .update({
          amount_fcfa: 0,
          click_count: 0,
          unlock_date: nextUnlock.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id);

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("name, phone, email, available_balance")
        .eq("id", pending.echo_id)
        .single();

      if (user && pending.amount_fcfa > 0) {
        await notifyEchoUnlock(
          pending.echo_id,
          user,
          pending.amount_fcfa,
          (campaign?.title || pending.campaign_name) + " (paiement intermédiaire)",
          user.available_balance || 0,
        ).catch(console.error);
      }
    } else {
      // Campaign completed/paused/cancelled — final unlock
      await supabaseAdmin
        .from("pending_earnings")
        .update({
          status: "unlocked",
          unlocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id);

      await supabaseAdmin.rpc("transfer_pending_to_available", {
        p_user_id: pending.echo_id,
        p_amount: pending.amount_fcfa,
      });

      await logWalletTransaction({
        supabase: supabaseAdmin,
        userId: pending.echo_id,
        amount: pending.amount_fcfa,
        type: "click_earning",
        description: `Gains débloqués — ${campaign?.title || pending.campaign_name}`,
        sourceId: pending.campaign_id,
        sourceType: "campaign_unlock",
      });

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("name, phone, email, available_balance")
        .eq("id", pending.echo_id)
        .single();

      if (user) {
        await notifyEchoUnlock(
          pending.echo_id,
          user,
          pending.amount_fcfa,
          campaign?.title || pending.campaign_name || "Campagne",
          user.available_balance || 0,
        ).catch(console.error);
      }
    }

    unlockedCount++;
  }

  return NextResponse.json({ unlocked: unlockedCount, date: today });
}
