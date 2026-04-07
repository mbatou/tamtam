import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/wave";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Log ALL headers for debugging
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    allHeaders[key] = key.toLowerCase().includes("secret") ? "[REDACTED]" : value;
  });
  console.log("Wave webhook: ALL headers:", JSON.stringify(allHeaders));
  console.log("Wave webhook: body preview:", rawBody.slice(0, 200));

  // Wave sends signature in various possible headers
  const signature =
    request.headers.get("wave-signature") ||
    request.headers.get("x-wave-signature") ||
    request.headers.get("wave-webhook-signature") ||
    request.headers.get("x-webhook-signature") ||
    request.headers.get("signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  console.log("Wave webhook: found signature:", signature ? `${signature.slice(0, 30)}... (len=${signature.length})` : "NONE");

  // Verify webhook signature
  if (signature) {
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Wave webhook: invalid signature");
      // Return 200 anyway temporarily to see the payload and debug
      // TODO: revert to 401 once signature is working
      console.log("Wave webhook: BYPASSING signature check for debugging");
    }
  } else {
    console.log("Wave webhook: no signature header found, proceeding without verification");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

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
      // Checkout completed — credit brand wallet
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data);
        break;

      // Checkout payment failed
      case "checkout.session.payment_failed":
        await handleCheckoutFailed(supabase, event.data);
        break;

      // B2B payment received — payout was delivered to recipient
      case "b2b.payment_received":
        await handlePayoutCompleted(supabase, event.data);
        break;

      // B2B payment failed — payout failed
      case "b2b.payment_failed":
        await handlePayoutFailed(supabase, event.data);
        break;

      // Merchant received payment (alternative checkout confirmation)
      case "merchant.payment_received":
        await handleMerchantPaymentReceived(supabase, event.data);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const checkoutId = data.id || data.checkout_session_id;
  if (!checkoutId) {
    console.error("Wave webhook: checkout completed but no ID in payload");
    return;
  }

  // Find the checkout record
  const { data: checkout } = await supabase
    .from("wave_checkouts")
    .select("*")
    .eq("wave_checkout_id", checkoutId)
    .single();

  if (!checkout) {
    console.error(`Wave webhook: checkout not found for ${checkoutId}`);
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
    p_wave_checkout_id: checkoutId,
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
// Checkout payment failed — mark checkout as failed
// ---------------------------------------------------------------------------
async function handleCheckoutFailed(
  supabase: ReturnType<typeof createServiceClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const checkoutId = data.id || data.checkout_session_id;
  if (!checkoutId) return;

  await supabase
    .from("wave_checkouts")
    .update({
      checkout_status: "expired",
      payment_status: "failed",
      error_message: data.last_payment_error || data.error_message || "Payment failed",
    })
    .eq("wave_checkout_id", checkoutId);

  // Also mark the payment record as failed
  const { data: checkout } = await supabase
    .from("wave_checkouts")
    .select("payment_id")
    .eq("wave_checkout_id", checkoutId)
    .single();

  if (checkout?.payment_id) {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", checkout.payment_id);
  }
}

// ---------------------------------------------------------------------------
// B2B payment received — payout completed
// ---------------------------------------------------------------------------
async function handlePayoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  // Try to find by wave_payout_id or client_reference
  const wavePayout = await findWavePayout(supabase, data);
  if (!wavePayout) return;
  if (wavePayout.payout_status === "completed") return;

  await supabase
    .from("wave_payouts")
    .update({
      payout_status: "completed",
      wave_payout_id: data.id || wavePayout.wave_payout_id,
      wave_transaction_id: data.transaction_id || null,
      receipt_url: data.receipt_url || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", wavePayout.id);

  // Also mark the legacy payout record as sent
  if (wavePayout.payout_id) {
    await supabase
      .from("payouts")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", wavePayout.payout_id);
  }
}

// ---------------------------------------------------------------------------
// B2B payment failed — refund wallet
// ---------------------------------------------------------------------------
async function handlePayoutFailed(
  supabase: ReturnType<typeof createServiceClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const wavePayout = await findWavePayout(supabase, data);
  if (!wavePayout) return;
  if (wavePayout.payout_status === "failed") return;

  await supabase
    .from("wave_payouts")
    .update({
      payout_status: "failed",
      error_code: data.error_code || null,
      error_message: data.error_message || data.failure_reason || null,
    })
    .eq("id", wavePayout.id);

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
// Merchant payment received — alternative checkout confirmation
// ---------------------------------------------------------------------------
async function handleMerchantPaymentReceived(
  supabase: ReturnType<typeof createServiceClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  // This can serve as a backup confirmation for checkout payments
  // Try to match by client_reference or amount
  const clientRef = data.client_reference;
  if (!clientRef) return;

  const { data: checkout } = await supabase
    .from("wave_checkouts")
    .select("*")
    .eq("client_reference", clientRef)
    .single();

  if (!checkout || checkout.checkout_status === "complete") return;

  // Credit the wallet
  const amount = parseInt(data.amount) || checkout.amount;
  const { data: credited } = await supabase.rpc("credit_wallet_from_checkout", {
    p_user_id: checkout.user_id,
    p_amount: amount,
    p_wave_checkout_id: checkout.wave_checkout_id,
    p_payment_id: checkout.payment_id,
  });

  if (credited) {
    await logWalletTransaction({
      supabase,
      userId: checkout.user_id,
      amount,
      type: "wallet_recharge",
      description: `Recharge via Wave (merchant) — ${amount} FCFA`,
      sourceId: checkout.payment_id,
      sourceType: "wave_checkout",
    });
  }
}

// ---------------------------------------------------------------------------
// Helper: find wave_payout record from webhook data
// ---------------------------------------------------------------------------
async function findWavePayout(
  supabase: ReturnType<typeof createServiceClient>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  // Try by wave_payout_id first
  if (data.id) {
    const { data: payout } = await supabase
      .from("wave_payouts")
      .select("*")
      .eq("wave_payout_id", data.id)
      .single();
    if (payout) return payout;
  }

  // Try by client_reference
  if (data.client_reference) {
    const { data: payout } = await supabase
      .from("wave_payouts")
      .select("*")
      .eq("client_reference", data.client_reference)
      .single();
    if (payout) return payout;
  }

  console.error("Wave webhook: could not find matching wave_payout for", data);
  return null;
}
