import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Use service role client directly to bypass RLS
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const type_event = formData.get("type_event") as string;
    const custom_field = formData.get("custom_field") as string;
    const ref_command = formData.get("ref_command") as string;
    const item_price = formData.get("item_price") as string;
    const final_item_price = formData.get("final_item_price") as string;
    const payment_method = formData.get("payment_method") as string;
    const client_phone = formData.get("client_phone") as string;
    const api_key_sha256 = formData.get("api_key_sha256") as string;
    const api_secret_sha256 = formData.get("api_secret_sha256") as string;
    const hmac_compute = formData.get("hmac_compute") as string;

    // ===== VERIFY AUTHENTICITY =====
    if (hmac_compute) {
      const price = final_item_price || item_price;
      const message = `${price}|${ref_command}|${process.env.PAYTECH_API_KEY}`;
      const expectedHmac = crypto
        .createHmac("sha256", process.env.PAYTECH_API_SECRET!)
        .update(message)
        .digest("hex");

      if (expectedHmac !== hmac_compute) {
        console.error("IPN: HMAC verification failed");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (api_key_sha256 && api_secret_sha256) {
      const expectedKey = crypto
        .createHash("sha256")
        .update(process.env.PAYTECH_API_KEY!)
        .digest("hex");
      const expectedSecret = crypto
        .createHash("sha256")
        .update(process.env.PAYTECH_API_SECRET!)
        .digest("hex");

      if (expectedKey !== api_key_sha256 || expectedSecret !== api_secret_sha256) {
        console.error("IPN: SHA256 verification failed");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // ===== PARSE CUSTOM FIELD =====
    let customData: { payment_id?: string; user_id?: string; type?: string } = {};
    if (custom_field) {
      try {
        const decoded = Buffer.from(custom_field, "base64").toString("utf-8");
        customData = JSON.parse(decoded);
      } catch {
        try {
          customData = JSON.parse(custom_field);
        } catch {
          console.error("IPN: Could not parse custom_field:", custom_field);
        }
      }
    }

    const { payment_id, user_id, type } = customData;

    // ===== PROCESS PAYMENT EVENT =====
    if (type_event === "sale_complete") {
      console.log(`IPN: Payment successful for ${ref_command}`);

      // Update payment record
      if (payment_id) {
        await supabase
          .from("payments")
          .update({
            status: "completed",
            payment_method: payment_method,
            client_phone: client_phone,
            completed_at: new Date().toISOString(),
          })
          .eq("id", payment_id);
      }

      // Credit the user's wallet
      if (type === "wallet_recharge" && user_id) {
        const amount = parseInt(final_item_price || item_price);

        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", user_id)
          .single();

        if (user) {
          await supabase
            .from("users")
            .update({ balance: (user.balance || 0) + amount })
            .eq("id", user_id);
        }
      }
    } else if (type_event === "sale_canceled") {
      console.log(`IPN: Payment cancelled for ${ref_command}`);

      if (payment_id) {
        await supabase
          .from("payments")
          .update({ status: "cancelled" })
          .eq("id", payment_id);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("IPN handler error:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
