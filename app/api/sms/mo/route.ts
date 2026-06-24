import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/sms/sms-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let msisdn: string | null = null;
  let content: string | null = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    msisdn = params.get("Msisdn") || params.get("msisdn") || params.get("from");
    content = params.get("Content") || params.get("content") || params.get("msg");
  } else {
    try {
      const body = await request.json();
      msisdn = body.Msisdn || body.msisdn || body.from;
      content = body.Content || body.content || body.msg;
    } catch {
      return NextResponse.json({ ok: true });
    }
  }

  if (!msisdn || !content) {
    return NextResponse.json({ ok: true });
  }

  const upper = content.toUpperCase().trim();
  if (!upper.includes("STOP")) {
    return NextResponse.json({ ok: true });
  }

  const normalized = normalizePhone(msisdn);
  if (!normalized) {
    console.warn("[SMS MO] Could not normalize phone:", msisdn);
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("phone", normalized)
    .is("deleted_at", null)
    .maybeSingle();

  if (!user) {
    const withoutPlus = normalized.startsWith("+") ? normalized.slice(1) : normalized;
    const digits9 = normalized.replace(/^\+221/, "");
    const { data: fuzzy } = await supabase
      .from("users")
      .select("id, phone")
      .is("deleted_at", null)
      .or(`phone.eq.${withoutPlus},phone.eq.${digits9},phone.eq.${msisdn}`)
      .maybeSingle();

    if (fuzzy) {
      await supabase
        .from("users")
        .update({ sms_optout: true, sms_optout_at: new Date().toISOString() })
        .eq("id", fuzzy.id);
      console.log(`[SMS MO] STOP from ${msisdn} → opted out user ${fuzzy.id}`);
      return NextResponse.json({ ok: true });
    }

    console.warn(`[SMS MO] STOP from ${msisdn} — no matching user`);
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from("users")
    .update({ sms_optout: true, sms_optout_at: new Date().toISOString() })
    .eq("id", user.id);

  console.log(`[SMS MO] STOP from ${msisdn} → opted out user ${user.id}`);
  return NextResponse.json({ ok: true });
}
