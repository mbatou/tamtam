import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/wave";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("wave-signature") || "";

  // Verify webhook signature
  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Wave webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    console.error("Wave webhook: signature verification error", err);
    return NextResponse.json({ error: "Signature error" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceClient();

  // Idempotency: check if we already processed this event
  const eventId = event.id || `${event.type}_${Date.now()}`;
  const { data: existing } = await supabase
    .from("wave_webhook_events")
    .select("id")
    .eq("wave_event_id", eventId)
    .single();

  if (existing) {
    return NextResponse.json({ status: "already_processed" });
  }

  // Log the event
  await supabase.from("wave_webhook_events").insert({
    wave_event_id: eventId,
    event_type: event.type,
    payload: event,
    processed: false,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data);
        break;
      case "payout.completed":
        await handlePayoutCompleted(supabase, event.data);
        break;
      case "payout.failed":
        await handlePayoutFailed(supabase, event.data);
        break;
      case "payout.reversed":
        await handlePayoutReversed(supabase, event.data);
        break;
      default:
        console.log(`Wave webhook: unhandled event type ${event.type}`);
    }

    // Mark as processed
    await supabase
      .from("wave_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("wave_event_id", eventId);
  } catch (err) {
    console.error(`Wave webhook: error processing ${event.type}`, err);
    // Don't mark as processed so it can be retried
  }

  return NextResponse.json({ status: "ok" });
}

// ---------------------------------------------------------------------------
// Checkout completed — credit brand wallet
// ---------------------------------------------------------------------------
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  data: { id: string; amount: string; client_reference?: string; payment_status?: string }
) {
  if (data.payment_status !== "succeeded") return;

  // Find the checkout record
  const { data: checkout } = await supabase
    .from("wave_checkouts")
    .select("*")
    .eq("wave_checkout_id", data.id)
    .single();

  if (!checkout) {
    console.error(`Wave webhook: checkout not found for ${data.id}`);
    return;
  }

  if (checkout.checkout_status === "complete") {
    return; // Already processed
  }

  const amount = parseInt(data.amount) || checkout.amount;

  // Atomic credit via RPC
  const { data: credited } = await supabase.rpc("credit_wallet_from_checkout", {
    p_user_id: checkout.user_id,
    p_amount: amount,
    p_wave_checkout_id: data.id,
    p_payment_id: checkout.payment_id,
  });

  if (credited) {
    await logWalletTransaction({
      supabase,
      userId: checkout.user_id,
      amount,
      type: "wallet_recharge",
      description: `Recharge via Wave — ${amount} FCFA`,
      sourceId: checkout.payment_id,
      sourceType: "wave_checkout",
    });
  }
}

// ---------------------------------------------------------------------------
// Payout completed — mark as done
// ---------------------------------------------------------------------------
async function handlePayoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  data: { id: string; transaction_id?: string; receipt_url?: string }
) {
  const { data: wavePayout } = await supabase
    .from("wave_payouts")
    .select("*")
    .eq("wave_payout_id", data.id)
    .single();

  if (!wavePayout) return;
  if (wavePayout.payout_status === "completed") return;

  await supabase
    .from("wave_payouts")
    .update({
      payout_status: "completed",
      wave_transaction_id: data.transaction_id || null,
      receipt_url: data.receipt_url || null,
      completed_at: new Date().toISOString(),
    })
    .eq("wave_payout_id", data.id);

  // Also mark the legacy payout record as sent
  if (wavePayout.payout_id) {
    await supabase
      .from("payouts")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", wavePayout.payout_id);
  }
}

// ---------------------------------------------------------------------------
// Payout failed — refund wallet
// ---------------------------------------------------------------------------
async function handlePayoutFailed(
  supabase: ReturnType<typeof createServiceClient>,
  data: { id: string; error_code?: string; error_message?: string }
) {
  const { data: wavePayout } = await supabase
    .from("wave_payouts")
    .select("*")
    .eq("wave_payout_id", data.id)
    .single();

  if (!wavePayout) return;
  if (wavePayout.payout_status === "failed") return;

  await supabase
    .from("wave_payouts")
    .update({
      payout_status: "failed",
      error_code: data.error_code || null,
      error_message: data.error_message || null,
    })
    .eq("wave_payout_id", data.id);

  // Refund the wallet
  const { data: refunded } = await supabase.rpc("refund_wallet_from_payout", {
    p_user_id: wavePayout.user_id,
    p_amount: wavePayout.amount,
    p_idempotency_key: wavePayout.idempotency_key,
  });

  if (refunded) {
    await logWalletTransaction({
      supabase,
      userId: wavePayout.user_id,
      amount: wavePayout.amount,
      type: "withdrawal_refund",
      description: `Retrait échoué — remboursement ${wavePayout.amount} FCFA`,
      sourceId: wavePayout.payout_id,
      sourceType: "wave_payout",
    });
  }

  // Mark legacy payout as failed
  if (wavePayout.payout_id) {
    await supabase
      .from("payouts")
      .update({ status: "failed" })
      .eq("id", wavePayout.payout_id);
  }
}

// ---------------------------------------------------------------------------
// Payout reversed — refund wallet (same logic as failed)
// ---------------------------------------------------------------------------
async function handlePayoutReversed(
  supabase: ReturnType<typeof createServiceClient>,
  data: { id: string; error_code?: string; error_message?: string }
) {
  const { data: wavePayout } = await supabase
    .from("wave_payouts")
    .select("*")
    .eq("wave_payout_id", data.id)
    .single();

  if (!wavePayout) return;
  if (wavePayout.payout_status === "reversed") return;

  await supabase
    .from("wave_payouts")
    .update({
      payout_status: "reversed",
      error_code: data.error_code || null,
      error_message: data.error_message || null,
    })
    .eq("wave_payout_id", data.id);

  // Refund if not already refunded from a failed state
  if (wavePayout.payout_status !== "failed") {
    const { data: refunded } = await supabase.rpc("refund_wallet_from_payout", {
      p_user_id: wavePayout.user_id,
      p_amount: wavePayout.amount,
      p_idempotency_key: wavePayout.idempotency_key,
    });

    if (refunded) {
      await logWalletTransaction({
        supabase,
        userId: wavePayout.user_id,
        amount: wavePayout.amount,
        type: "withdrawal_refund",
        description: `Retrait annulé — remboursement ${wavePayout.amount} FCFA`,
        sourceId: wavePayout.payout_id,
        sourceType: "wave_payout",
      });
    }
  }

  if (wavePayout.payout_id) {
    await supabase
      .from("payouts")
      .update({ status: "failed" })
      .eq("id", wavePayout.payout_id);
  }
}
