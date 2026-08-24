import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPayoutFailedEmail } from "@/lib/email";
import { sendRoutedEmail } from "./email-router";
import { alertPayoutFailed } from "./ops-alerts";
import { normalizePhone, sendSms, extractFirstName } from "@/lib/sms/sms-service";

/**
 * A withdrawal bounced — tell the Écho and tell ops.
 *
 * `payout_failed` routes to SMS + email: the Écho's money did not arrive and
 * they have to act (usually fix a Wave number), which is one of the few
 * moments genuinely worth per-message spend. Ops gets a parallel alert because
 * a bounced payout needs a human to look at the number before it is retried.
 *
 * The SMS bypasses the daily cap and quiet hours on purpose. Someone who
 * thinks the platform has eaten their money should not wait until 07:00 to
 * learn otherwise.
 *
 * Never throws — a notification must not fail the refund that precedes it.
 */
export async function notifyPayoutFailed(
  supabase: SupabaseClient,
  opts: { echoId: string; amount: number; reason: string | null; payoutId: string },
): Promise<void> {
  try {
    const { data: echo } = await supabase
      .from("users")
      .select("name, phone, available_balance, sms_optout")
      .eq("id", opts.echoId)
      .single();

    if (!echo) return;

    await alertPayoutFailed({
      echoName: echo.name,
      echoPhone: echo.phone,
      amount: opts.amount,
      reason: opts.reason,
      payoutId: opts.payoutId,
    });

    await sendRoutedEmail(supabase, {
      event: "payout_failed",
      userId: opts.echoId,
      // The payout id keys the ledger row: Wave can redeliver a webhook, and
      // the handler's own `payout_status === "failed"` guard only covers the
      // case where the status write landed first.
      reference: opts.payoutId,
      ...buildPayoutFailedEmail({
        echoName: echo.name,
        amount: opts.amount,
        reason: opts.reason,
        newBalance: typeof echo.available_balance === "number" ? echo.available_balance : null,
      }),
    });

    const phone = echo.sms_optout ? null : normalizePhone(echo.phone || "");
    if (!phone) return;

    const sms = await sendSms({
      phone,
      message:
        `TamTam: ${extractFirstName(echo.name || "")}, ton retrait de ` +
        `${opts.amount.toLocaleString("fr-FR")} FCFA n'est pas passe. ` +
        `Ton argent est de retour sur ton solde. Verifie ton numero Wave -> tamma.me/earnings`,
    });

    if (!sms.success) {
      console.error(`[payout-failed] SMS failed for ${opts.echoId}: ${sms.error}`);
    }
  } catch (err) {
    console.error(`[payout-failed] notification failed for ${opts.payoutId}:`, err);
  }
}
