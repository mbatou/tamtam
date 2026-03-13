import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
// import { paytechConfig, paytechHeaders } from "@/lib/paytech";
import { paymentRequestSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { sendRechargeRequestNotification } from "@/lib/email";

// Wave payment link configuration
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

    // Create payment record with pending_wave status (needs superadmin validation)
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

    // Generate Wave payment link with dynamic amount
    const waveUrl = `${WAVE_PAYMENT_BASE_URL}?amount=${amount}`;

    return NextResponse.json({
      success: true,
      redirect_url: waveUrl,
      payment_id: paymentRecord.id,
    });

    /* ===== PAYTECH INTEGRATION (commented out - waiting for prod approval) =====
    // Get user profile for autofill
    const { data: profile } = await supabase
      .from("users")
      .select("name, phone")
      .eq("id", session.user.id)
      .single();

    // Call PayTech API
    const paymentData = {
      item_name: "Recharge portefeuille Tamtam",
      item_price: amount,
      currency: "XOF",
      ref_command: refCommand,
      command_name: `Tamtam - Recharge portefeuille`,
      env: paytechConfig.env,
      ipn_url: `${paytechConfig.appUrl}/api/payments/ipn`,
      success_url: `${paytechConfig.appUrl}/admin/wallet?payment=success`,
      cancel_url: `${paytechConfig.appUrl}/admin/wallet?payment=cancelled`,
      custom_field: JSON.stringify({
        payment_id: paymentRecord.id,
        user_id: session.user.id,
        type: "wallet_recharge",
      }),
    };

    const response = await fetch(
      `${paytechConfig.baseUrl}/payment/request-payment`,
      {
        method: "POST",
        headers: paytechHeaders,
        body: JSON.stringify(paymentData),
      }
    );

    const result = await response.json();

    if (result.success === 1) {
      let redirectUrl = result.redirect_url;

      if (profile?.phone) {
        const phone = profile.phone.startsWith("+221")
          ? profile.phone
          : `+221${profile.phone}`;
        const params = new URLSearchParams({
          pn: phone,
          nn: phone.slice(4),
          fn: profile.name || "",
        });
        redirectUrl += "?" + params.toString();
      }

      await supabase
        .from("payments")
        .update({ paytech_token: result.token })
        .eq("id", paymentRecord.id);

      return NextResponse.json({
        success: true,
        redirect_url: redirectUrl,
        token: result.token,
      });
    } else {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", paymentRecord.id);

      return NextResponse.json(
        { error: result.message || "Erreur PayTech" },
        { status: 400 }
      );
    }
    ===== END PAYTECH INTEGRATION ===== */
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
