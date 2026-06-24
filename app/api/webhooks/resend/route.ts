import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Webhook } from "svix";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  const body = await request.text();

  if (webhookSecret) {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
    }

    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      console.error("[Resend] Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[Resend] RESEND_WEBHOOK_SECRET not set — skipping signature verification");
  }

  let parsed: { type?: string; data?: { email_id?: string } };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = parsed.type;
  const resendId = parsed.data?.email_id;

  if (!resendId) return NextResponse.json({ ok: true });

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const updates: Record<string, string> = {};

  switch (event) {
    case "email.delivered":
      updates.status = "delivered";
      updates.delivered_at = now;
      break;
    case "email.opened":
      updates.status = "opened";
      updates.opened_at = now;
      break;
    case "email.clicked":
      updates.status = "clicked";
      updates.clicked_at = now;
      break;
    case "email.bounced":
      updates.status = "bounced";
      updates.bounced_at = now;
      break;
    case "email.complained":
      updates.status = "complained";
      break;
    default:
      return NextResponse.json({ ok: true });
  }

  await supabase
    .from("email_sends")
    .update(updates)
    .eq("resend_id", resendId);

  return NextResponse.json({ ok: true });
}
