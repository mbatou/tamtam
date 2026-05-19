import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { sendEmail } from "@/lib/email";

export async function unlockCampaignEarnings(campaignId: string, campaignName: string) {
  const { data: pendingList } = await supabaseAdmin
    .from("pending_earnings")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if (!pendingList || pendingList.length === 0) return 0;

  let unlockedCount = 0;

  for (const pending of pendingList) {
    if (pending.amount_fcfa <= 0) continue;

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
      description: `Gains débloqués — ${campaignName}`,
      sourceId: campaignId,
      sourceType: "campaign_unlock",
    });

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("name, phone, email, available_balance")
      .eq("id", pending.echo_id)
      .single();

    if (user) {
      notifyEchoUnlock(
        pending.echo_id,
        user,
        pending.amount_fcfa,
        campaignName,
        user.available_balance || 0,
      ).catch(console.error);
    }

    unlockedCount++;
  }

  console.log(`[UNLOCK] Campaign ${campaignId}: unlocked ${unlockedCount} Échos`);
  return unlockedCount;
}

export async function notifyEchoUnlock(
  echoId: string,
  user: { name: string; phone: string | null; email: string | null; available_balance: number },
  amount: number,
  campaignName: string,
  newAvailableBalance: number,
) {
  const formattedAmount = new Intl.NumberFormat("fr-FR").format(amount);
  const formattedBalance = new Intl.NumberFormat("fr-FR").format(newAvailableBalance);

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `${formattedAmount} FCFA débloqués !`,
      html: `
        <div style="background:#0A0A1A;color:white;padding:32px;font-family:Arial,sans-serif;max-width:500px;">
          <p style="color:#D35400;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Gains débloqués</p>
          <h1 style="font-size:32px;margin:8px 0;">${formattedAmount} FCFA</h1>
          <p style="color:#8E8E93;">
            La campagne <strong style="color:white;">"${campaignName}"</strong> a débloqué vos gains.
          </p>
          <p style="color:#8E8E93;margin-top:24px;">
            Solde disponible : <strong style="color:#1ABC9C;">${formattedBalance} FCFA</strong>
          </p>
          <a href="https://tamma.me/earnings" style="display:inline-block;margin-top:24px;background:#D35400;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Retirer maintenant
          </a>
          <p style="color:#555;font-size:12px;margin-top:32px;">Tamtam — tamma.me</p>
        </div>
      `,
    }).catch(console.error);
  }

  if (user.phone) {
    const message = encodeURIComponent(
      `${formattedAmount} FCFA débloqués !\n\n` +
      `La campagne "${campaignName}" est terminée.\n\n` +
      `Solde disponible : ${formattedBalance} FCFA\n\n` +
      `Retirer → tamma.me/earnings`
    );
    const waLink = `https://wa.me/${user.phone}?text=${message}`;

    try {
      await supabaseAdmin
        .from("notification_logs")
        .insert({
          echo_id: echoId,
          channel: "whatsapp",
          status: "manual",
          metadata: { wa_link: waLink, type: "unlock" },
        });
    } catch { /* non-blocking */ }
  }
}
