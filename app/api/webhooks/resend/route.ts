import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  const event = body.type;
  const resendId = body.data?.email_id;

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
