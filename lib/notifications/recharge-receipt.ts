import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRechargeReceiptEmail } from "@/lib/email";
import { sendRoutedEmail } from "./email-router";

/**
 * Recharge confirmed → receipt to the brand.
 *
 * Fires from all three credit paths: the Wave checkout webhook, the Wave
 * merchant-payment webhook (a backup confirmation for the same money), and
 * manual validation in the superadmin finance screen.
 *
 * `reference` is the idempotency key as well as the receipt number — the two
 * webhook paths can both fire for one payment, and a brand must not receive
 * two receipts for one charge.
 *
 * Never throws — a receipt is not worth failing a credit over.
 */
export async function sendRechargeReceipt(
  supabase: SupabaseClient,
  opts: {
    brandId: string;
    amount: number;
    method: string;
    reference: string;
    paidAt?: string;
  },
): Promise<"sent" | "skipped"> {
  try {
    const { data: brand } = await supabase
      .from("users")
      .select("name, balance")
      .eq("id", opts.brandId)
      .single();

    if (!brand) return "skipped";

    // Both Wave webhook handlers can credit the same checkout. The ledger is
    // the guard: one receipt per reference, whichever handler arrives first.
    const { count } = await supabase
      .from("sent_emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", opts.brandId)
      .eq("email_type", "recharge_received")
      .eq("status", "sent")
      .eq("reference", opts.reference);

    if ((count ?? 0) > 0) return "skipped";

    const result = await sendRoutedEmail(supabase, {
      event: "recharge_received",
      userId: opts.brandId,
      reference: opts.reference,
      ...buildRechargeReceiptEmail({
        brandName: brand.name,
        amount: opts.amount,
        // `users.balance` is the LIVE column for brands (unlike Échos, where it
        // is a stale duplicate), so it is the right figure for a receipt.
        newBalance: typeof brand.balance === "number" ? brand.balance : null,
        method: opts.method,
        reference: opts.reference,
        paidAt: opts.paidAt,
      }),
    });

    return result.status === "sent" ? "sent" : "skipped";
  } catch (err) {
    console.error(`[recharge-receipt] failed for ${opts.reference}:`, err);
    return "skipped";
  }
}
