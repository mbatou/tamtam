import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendTestSms, checkMtargetBalance } from "@/lib/sms/mtarget-test";

export const dynamic = "force-dynamic";

const ALLOWED_TEST_USER = "846d55ca-1bb6-49fe-9462-cb3af1732bdd";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return false;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  return user?.role === "superadmin";
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const balance = await checkMtargetBalance();
  return NextResponse.json(balance);
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone, message, sender, notes, userId } = await request.json();

  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message are required" }, { status: 400 });
  }

  if (userId && userId !== ALLOWED_TEST_USER) {
    return NextResponse.json(
      { error: "Test phase: only Georges DIEME (user 846d55ca) allowed" },
      { status: 403 }
    );
  }

  const normalizedInput = phone.replace(/\s/g, "");
  if (!normalizedInput.includes("766224151")) {
    return NextResponse.json(
      { error: "Test phase: only +221766224151 allowed" },
      { status: 403 }
    );
  }

  const result = await sendTestSms({ phone, message, sender, notes });

  const supabase = createServiceClient();
  const { data: log } = await supabase
    .from("sms_test_logs")
    .insert({
      user_id: userId || ALLOWED_TEST_USER,
      phone,
      message,
      sender: sender || "TamTam",
      mtarget_ticket: result.ticket,
      status: result.success ? "sent" : "failed",
      error_code: result.errorCode?.toString(),
      error_message: result.error,
      latency_ms: result.latencyMs,
      raw_response: result.rawResponse,
      notes,
    })
    .select()
    .single();

  return NextResponse.json({
    success: result.success,
    ticket: result.ticket,
    smsCount: result.smsCount,
    latencyMs: result.latencyMs,
    error: result.error,
    errorCode: result.errorCode,
    rawResponse: result.rawResponse,
    logId: log?.id,
  });
}
