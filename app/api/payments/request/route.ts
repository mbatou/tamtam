import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { paytechConfig, paytechHeaders } from "@/lib/paytech";

export async function POST(req: NextRequest) {
  try {
    const authClient = createClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, payment_method } = body;

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: "Montant minimum: 100 FCFA" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get user profile for autofill
    const { data: profile } = await supabase
      .from("users")
      .select("name, phone")
      .eq("id", session.user.id)
      .single();

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
        payment_method: payment_method || null,
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

      // Add autofill params if user has phone
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

      // Update payment record with token
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
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
