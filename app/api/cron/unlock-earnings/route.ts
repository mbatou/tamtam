import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { notifyEchoUnlock, unlockCampaignEarnings } from "@/lib/unlock-earnings";
import { verifyCronSecret } from "@/lib/api/cron";
import { refundCampaignRemaining } from "@/lib/campaign-refund";
import { sendCampaignReport } from "@/lib/notifications/campaign-report";
import { getUserEmail } from "@/lib/user-emails";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // Auto-complete expired campaigns (ends_at has passed)
  const { data: expiredCampaigns } = await supabaseAdmin
    .from("campaigns")
    .select("id, title, batteur_id, budget, spent")
    .eq("status", "active")
    .lte("ends_at", now);

  let expiredCount = 0;
  for (const campaign of expiredCampaigns || []) {
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "completed" })
      .eq("id", campaign.id)
      .eq("status", "active");

    // Awaited so the due-list query below sees these rows already claimed
    // (un-awaited, both paths could process the same row — F5 double-credit)
    await unlockCampaignEarnings(campaign.id, campaign.title || campaign.id).catch(console.error);

    // Refund remaining budget to the brand — atomic + exactly-once (F7).
    // Previously this path had NO idempotency guard at all.
    await refundCampaignRemaining(supabaseAdmin, campaign.id, {
      reason: "fin de campagne",
    });

    // Performance report to the brand — exactly once per campaign, whichever
    // of the six completion paths gets there first.
    await sendCampaignReport(supabaseAdmin, campaign.id);
    expiredCount++;
  }

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
      // Campaign still running — 30-day rolling unlock.
      // Atomic claim FIRST (zero the row before transferring): the guard on
      // status AND the exact amount we read means a concurrent unlocker or a
      // click landing between read and claim makes us skip — never transfer
      // an amount that no longer matches the row (F5).
      const nextUnlock = new Date();
      nextUnlock.setDate(nextUnlock.getDate() + 30);

      const { data: claimed } = await supabaseAdmin
        .from("pending_earnings")
        .update({
          amount_fcfa: 0,
          click_count: 0,
          unlock_date: nextUnlock.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id)
        .eq("status", "pending")
        .eq("amount_fcfa", pending.amount_fcfa)
        .select("id");

      if (!claimed || claimed.length === 0) continue;

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

      // public.users has no email column (it lives in auth.users)
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("name, phone, available_balance")
        .eq("id", pending.echo_id)
        .single();
      const echoEmail = user ? await getUserEmail(supabaseAdmin, pending.echo_id) : null;

      if (user && pending.amount_fcfa > 0) {
        await notifyEchoUnlock(
          pending.echo_id,
          { ...user, email: echoEmail },
          pending.amount_fcfa,
          (campaign?.title || pending.campaign_name) + " (paiement intermédiaire)",
          user.available_balance || 0,
          pending.campaign_id,
        ).catch(console.error);
      }
    } else {
      // Campaign completed/paused/cancelled — final unlock.
      // Atomic claim: transfer only if we flipped status pending→unlocked (F5).
      const { data: claimed } = await supabaseAdmin
        .from("pending_earnings")
        .update({
          status: "unlocked",
          unlocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id)
        .eq("status", "pending")
        .select("id");

      if (!claimed || claimed.length === 0) continue;

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

      // public.users has no email column (it lives in auth.users)
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("name, phone, available_balance")
        .eq("id", pending.echo_id)
        .single();
      const echoEmail = user ? await getUserEmail(supabaseAdmin, pending.echo_id) : null;

      if (user) {
        await notifyEchoUnlock(
          pending.echo_id,
          { ...user, email: echoEmail },
          pending.amount_fcfa,
          campaign?.title || pending.campaign_name || "Campagne",
          user.available_balance || 0,
          pending.campaign_id,
        ).catch(console.error);
      }
    }

    unlockedCount++;
  }

  return NextResponse.json({ unlocked: unlockedCount, expired_campaigns: expiredCount, date: today });
}
