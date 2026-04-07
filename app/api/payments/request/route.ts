import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { paymentRequestSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { sendRechargeRequestNotification } from "@/lib/email";
import { createCheckoutSession } from "@/lib/wave";

// Fallback: legacy Wave payment link (used when WAVE_API_KEY is not set)
const WAVE_PAYMENT_BASE_URL = "https://pay.wave.com/m/M_sn_hawWuMtnv3Ad/c/sn/";

export async function POST(req: NextRequest) {
  try {
    const authClient = createClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Rate limit: 5 payment requests per hour
    const { allowed } = rateLimit(`payment:${session.user.id}`, 5, 3600000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessaie plus tard." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = paymentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { amount, payment_method } = parsed.data;
    const supabase = createServiceClient();

    // Generate unique reference
    const refCommand = `TAMTAM_WALLET_${session.user.id.slice(0, 8)}_${Date.now()}`;

    // Create payment record
    const { data: paymentRecord, error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: session.user.id,
        amount: amount,
        ref_command: refCommand,
        status: "pending",
        payment_method: payment_method || "Wave",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Payment insert error:", insertError);
      return NextResponse.json(
        { error: "Erreur création paiement" },
        { status: 500 }
      );
    }

    // Notify admin by email
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", session.user.id)
      .single();

    sendRechargeRequestNotification({
      brandName: profile?.name || "Inconnu",
      amount,
      paymentMethod: payment_method || "Wave",
      refCommand,
    }).catch(() => {});

    // ---- Wave Checkout API (preferred) ----
    if (process.env.WAVE_API_KEY) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tamma.me";
        console.log("Wave Checkout: creating session for", amount, "FCFA");

        const checkoutSession = await createCheckoutSession({
          amount: String(amount),
          currency: "XOF",
          error_url: `${appUrl}/admin/wallet?payment=error&ref=${refCommand}`,
          success_url: `${appUrl}/admin/wallet?payment=success&ref=${refCommand}`,
          client_reference: refCommand,
        });

        console.log("Wave Checkout: session created", checkoutSession.id, checkoutSession.wave_launch_url);

        // Track the checkout session (non-blocking — don't let DB errors prevent redirect)
        supabase.from("wave_checkouts").insert({
          user_id: session.user.id,
          payment_id: paymentRecord.id,
          wave_checkout_id: checkoutSession.id,
          amount,
          currency: "XOF",
          client_reference: refCommand,
          checkout_status: checkoutSession.checkout_status,
          wave_launch_url: checkoutSession.wave_launch_url,
          expires_at: checkoutSession.when_expires,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.error("Wave Checkout: failed to track session in DB:", insertErr.message);
        });

        return NextResponse.json({
          success: true,
          redirect_url: checkoutSession.wave_launch_url,
          payment_id: paymentRecord.id,
          wave_checkout_id: checkoutSession.id,
        });
      } catch (err) {
        console.error("Wave Checkout API error, falling back to legacy:", err);
        // Fall through to legacy link below
      }
    } else {
      console.log("Wave Checkout: WAVE_API_KEY not set, using legacy link");
    }

    // ---- Fallback: legacy static Wave payment link ----
    const waveUrl = `${WAVE_PAYMENT_BASE_URL}?amount=${amount}`;

    return NextResponse.json({
      success: true,
      redirect_url: waveUrl,
      payment_id: paymentRecord.id,
    });
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
