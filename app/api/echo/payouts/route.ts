import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { payoutRequestSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { sendPayoutRequestNotification } from "@/lib/email";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { createPayout, calculatePayoutFee } from "@/lib/wave";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("echo_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { allowed } = rateLimit(`payout:${session.user.id}`, 3, 86400000);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de demandes de retrait. Réessaie demain." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = payoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Validate multiple of 5
  if (parsed.data.amount % 5 !== 0) {
    return NextResponse.json({ error: "Le montant doit être un multiple de 5" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch dynamic min payout setting
  const { data: minPayoutSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "min_payout_fcfa")
    .single();
  const minPayout = parseInt(minPayoutSetting?.value || "1000") || 1000;

  if (parsed.data.amount < minPayout) {
    return NextResponse.json({ error: `Montant minimum: ${minPayout} FCFA` }, { status: 400 });
  }

  // Verify user balance and get phone
  const { data: user } = await supabase
    .from("users")
    .select("balance, phone, name")
    .eq("id", session.user.id)
    .single();

  if (!user || user.balance < parsed.data.amount) {
    return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  const provider = parsed.data.provider || "wave";
  const useWaveApi = provider === "wave" && !!process.env.WAVE_API_KEY && !!user.phone;

  if (useWaveApi) {
    // ---- Wave API Payout Flow ----
    // 1. Generate idempotency key BEFORE anything
    const idempotencyKey = randomUUID();
    const { fee, netAmount } = calculatePayoutFee(parsed.data.amount);

    // 2. Atomic debit via RPC (prevents race conditions)
    const { data: debited } = await supabase.rpc("debit_wallet_for_payout", {
      p_user_id: session.user.id,
      p_amount: parsed.data.amount,
      p_idempotency_key: idempotencyKey,
    });

    if (!debited) {
      return NextResponse.json({ error: "Solde insuffisant ou retrait en cours" }, { status: 400 });
    }

    // 3. Log the debit transaction
    await logWalletTransaction({
      supabase,
      userId: session.user.id,
      amount: -parsed.data.amount,
      type: "withdrawal",
      description: `Retrait Wave — ${parsed.data.amount} FCFA (frais: ${fee} FCFA)`,
      sourceType: "wave_payout",
    });

    // 4. Create payout record in our DB
    const { data: payoutRecord } = await supabase.from("payouts").insert({
      echo_id: session.user.id,
      amount: parsed.data.amount,
      provider: "wave",
      status: "pending",
    }).select().single();

    // Format phone to E.164
    const mobile = user.phone!.startsWith("+") ? user.phone! : `+221${user.phone}`;
    const clientRef = `TAMTAM_PAYOUT_${session.user.id.slice(0, 8)}_${Date.now()}`;

    // 5. Store wave_payout BEFORE calling API (idempotency key is our safety net)
    await supabase.from("wave_payouts").insert({
      payout_id: payoutRecord?.id,
      user_id: session.user.id,
      idempotency_key: idempotencyKey,
      amount: parsed.data.amount,
      fee,
      net_amount: netAmount,
      currency: "XOF",
      mobile,
      client_reference: clientRef,
      payout_status: "processing",
    });

    // 6. Call Wave Payout API
    try {
      const wavePayout = await createPayout({
        idempotency_key: idempotencyKey,
        mobile,
        amount: String(netAmount),
        currency: "XOF",
        client_reference: clientRef,
        name: user.name || undefined,
      });

      console.log("Wave Payout response:", JSON.stringify(wavePayout));

      // Wave payouts are synchronous — if we got here without an error,
      // the API accepted the payout. Mark as completed.
      // Check multiple indicators: payout_status, transaction_id, or simply
      // the fact that createPayout() returned without throwing.
      const isFailed = wavePayout.payout_status === "failed"
        || wavePayout.payout_status === "reversed";
      const isCompleted = !isFailed; // If not failed, it's done or processing

      // Update our wave_payouts record
      await supabase
        .from("wave_payouts")
        .update({
          wave_payout_id: wavePayout.id,
          payout_status: isCompleted ? "completed" : "failed",
          wave_transaction_id: wavePayout.transaction_id || null,
          receipt_url: wavePayout.receipt_url || null,
          completed_at: isCompleted ? new Date().toISOString() : null,
          error_code: wavePayout.error_code || null,
          error_message: wavePayout.error_message || null,
        })
        .eq("idempotency_key", idempotencyKey);

      // Update legacy payout record
      if (payoutRecord) {
        await supabase
          .from("payouts")
          .update({
            status: isCompleted ? "sent" : "failed",
            completed_at: isCompleted ? new Date().toISOString() : null,
          })
          .eq("id", payoutRecord.id);
      }

      // Notify admin
      sendPayoutRequestNotification({
        echoName: user.name || "Inconnu",
        echoPhone: user.phone || "",
        amount: parsed.data.amount,
        provider: "wave",
      }).catch(() => {});

      return NextResponse.json({
        ...payoutRecord,
        status: isCompleted ? "sent" : "pending",
        wave_status: wavePayout.payout_status,
        fee,
        net_amount: netAmount,
      }, { status: 201 });

    } catch (err) {
      // Network error or Wave API error — do NOT auto-refund
      // Mark as "processing" for manual reconciliation
      console.error("Wave Payout API error:", err);

      await supabase
        .from("wave_payouts")
        .update({
          payout_status: "processing",
          error_message: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("idempotency_key", idempotencyKey);

      // Still notify admin of the situation
      sendPayoutRequestNotification({
        echoName: user.name || "Inconnu",
        echoPhone: user.phone || "",
        amount: parsed.data.amount,
        provider: "wave",
      }).catch(() => {});

      return NextResponse.json({
        ...payoutRecord,
        wave_status: "processing",
        fee,
        net_amount: netAmount,
        note: "Paiement en cours de traitement",
      }, { status: 201 });
    }
  }

  // ---- Legacy Flow (Orange Money or no Wave API key) ----
  // Debit balance immediately
  const newBalance = user.balance - parsed.data.amount;
  const { error: balanceError } = await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("id", session.user.id);

  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  await logWalletTransaction({
    supabase,
    userId: session.user.id,
    amount: -parsed.data.amount,
    type: "withdrawal",
    description: `Demande de retrait — ${provider}`,
    sourceType: "payout",
  });

  const { data, error } = await supabase.from("payouts").insert({
    echo_id: session.user.id,
    amount: parsed.data.amount,
    provider,
  }).select().single();

  if (error) {
    // Rollback balance if payout creation fails
    await supabase
      .from("users")
      .update({ balance: user.balance })
      .eq("id", session.user.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify admin by email
  sendPayoutRequestNotification({
    echoName: user.name || "Inconnu",
    echoPhone: user.phone || "",
    amount: parsed.data.amount,
    provider: provider,
  }).catch(() => {});

  return NextResponse.json(data, { status: 201 });
}
