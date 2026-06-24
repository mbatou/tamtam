import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, string> = {
  "0": "delivered",
  "3": "delivered",
  "2": "sent",
  "4": "failed",
  "6": "failed",
};

export async function POST(request: NextRequest) {
  let ticket: string | null = null;
  let dlrStatus: string | null = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    ticket = params.get("MsgId") || params.get("ticket") || params.get("msgid");
    dlrStatus = params.get("Status") || params.get("status");
  } else {
    try {
      const body = await request.json();
      ticket = body.MsgId || body.ticket || body.msgid;
      dlrStatus = body.Status || body.status;
    } catch {
      return NextResponse.json({ ok: true });
    }
  }

  if (!ticket || !dlrStatus) {
    return NextResponse.json({ ok: true });
  }

  const mapped = STATUS_MAP[dlrStatus] || "unknown";
  const supabase = createServiceClient();

  await supabase
    .from("sms_logs")
    .update({
      status: mapped,
      ...(mapped === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("mtarget_ticket", ticket);

  return NextResponse.json({ ok: true });
}
