import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { buildSmsMessage, SmsType } from "./templates";

export function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const p = phone.replace(/[\s\-.]/g, "");
  if (p.startsWith("+221")) return p;
  if (p.startsWith("00221")) return `+221${p.slice(5)}`;
  if (p.startsWith("221") && p.length === 12) return `+${p}`;
  if (/^[73]\d{8}$/.test(p)) return `+221${p}`;
  return null;
}

export function extractFirstName(fullName: string): string {
  const clean = fullName
    .replace(/[^\x20-\x7EÀ-ɏ]/g, "")
    .trim()
    .split(/\s+/)[0] || "";

  if (clean.length < 2) return "Echo";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function isQuietHours(): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  return hour >= 22 || hour < 7;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export async function sendSms({
  phone,
  message,
  sender = "TamTam",
}: {
  phone: string;
  message: string;
  sender?: string;
}): Promise<{
  success: boolean;
  ticket?: string;
  smsCount?: number;
  latencyMs: number;
  error?: string;
  errorCode?: number;
  rawResponse: string;
}> {
  const start = Date.now();

  const params = new URLSearchParams({
    username: process.env.MTARGET_USERNAME!,
    password: process.env.MTARGET_PASSWORD!,
    msisdn: phone,
    msg: message,
    sender,
    serviceid: process.env.MTARGET_SERVICEID || "36453",
  });

  try {
    const response = await fetch(
      `${process.env.MTARGET_API_URL || "https://api-public.mtarget.fr"}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: AbortSignal.timeout(45000),
      }
    );

    const latencyMs = Date.now() - start;
    const rawResponse = await response.text();

    try {
      const json = JSON.parse(rawResponse);
      if (json.results && json.results[0]) {
        const r = json.results[0];
        const ticket = r.ticket as string | undefined;
        const smsCount = parseInt(r.smscount || "0");
        const code = parseInt(r.code || "0");
        if (code === 0 && ticket) {
          return { success: true, ticket, smsCount, latencyMs, rawResponse };
        }
        return { success: false, errorCode: code, error: r.reason || `mTarget code ${code}`, latencyMs, rawResponse };
      }
    } catch {
      // Not JSON — fall through to URLSearchParams
    }

    const parsed = new URLSearchParams(rawResponse);
    const ticket = parsed.get("ticket");
    const smsCount = parseInt(parsed.get("smscount") || "0");
    if (ticket) {
      return { success: true, ticket, smsCount, latencyMs, rawResponse };
    }

    const errorCode = parseInt(rawResponse);
    if (!isNaN(errorCode) && errorCode < 0) {
      return { success: false, errorCode, latencyMs, rawResponse, error: `mTarget error ${errorCode}` };
    }

    return { success: false, error: `Unexpected response: ${rawResponse}`, rawResponse, latencyMs };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      rawResponse: "",
      latencyMs: Date.now() - start,
    };
  }
}

interface SendToEchoOpts {
  echoId: string;
  type: SmsType;
  campaignId?: string;
  vars?: Partial<{
    city: string | null;
    cpc: number;
    amount: number;
    hoursLeft: number;
    customMessage: string;
  }>;
  bypassDailyCap?: boolean;
  bypassQuietHours?: boolean;
}

export async function sendSmsToEcho(opts: SendToEchoOpts): Promise<{
  status: "sent" | "failed" | "skipped";
  reason?: string;
  ticket?: string;
  latencyMs?: number;
}> {
  const supabase = createServiceClient();

  const { data: echo } = await supabase
    .from("users")
    .select("id, name, phone, city, status, sms_optout, last_sms_at, deleted_at")
    .eq("id", opts.echoId)
    .single();

  if (!echo) return { status: "skipped", reason: "not_found" };
  if (echo.deleted_at) return { status: "skipped", reason: "deleted" };
  if (echo.status === "suspended") return { status: "skipped", reason: "suspended" };
  if (echo.sms_optout) return { status: "skipped", reason: "optout" };
  if (!echo.phone) return { status: "skipped", reason: "no_phone" };

  if (!opts.bypassDailyCap && isToday(echo.last_sms_at)) {
    return { status: "skipped", reason: "daily_cap" };
  }
  if (!opts.bypassQuietHours && isQuietHours()) {
    return { status: "skipped", reason: "quiet_hours" };
  }

  const phone = normalizePhone(echo.phone);
  if (!phone) return { status: "skipped", reason: "invalid_phone" };

  const firstName = extractFirstName(echo.name || "Echo");
  const message = buildSmsMessage(opts.type, {
    firstName,
    city: echo.city,
    ...opts.vars,
  });

  if (message.length > 160) {
    console.warn(`[SMS] Message too long (${message.length}) for ${echo.id}`);
  }

  const result = await sendSms({ phone, message });

  await supabase.from("sms_logs").insert({
    echo_id: echo.id,
    phone,
    message,
    type: opts.type,
    campaign_id: opts.campaignId || null,
    mtarget_ticket: result.ticket || null,
    status: result.success ? "sent" : "failed",
    error_code: result.errorCode?.toString() || null,
    error_message: result.error || null,
    latency_ms: result.latencyMs,
    raw_response: result.rawResponse,
  });

  if (result.success) {
    await supabase
      .from("users")
      .update({ last_sms_at: new Date().toISOString() })
      .eq("id", echo.id);
  }

  return {
    status: result.success ? "sent" : "failed",
    ticket: result.ticket,
    latencyMs: result.latencyMs,
    reason: result.error,
  };
}

type Segment = "all" | "active" | "dormant" | "joined_no_clicks";

interface BatchOpts {
  type: SmsType;
  campaignId?: string;
  echoIds?: string[];
  cityFilter?: string[];
  segment?: Segment;
  vars?: Partial<{
    city: string | null;
    cpc: number;
    amount: number;
    hoursLeft: number;
    customMessage: string;
  }>;
  bypassDailyCap?: boolean;
  bypassQuietHours?: boolean;
}

export async function sendSmsBatch(opts: BatchOpts): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  details: Array<{ echoId: string; status: string; reason?: string }>;
}> {
  const supabase = createServiceClient();

  let echoIds = opts.echoIds;

  if (!echoIds) {
    let query = supabase
      .from("users")
      .select("id")
      .eq("role", "echo")
      .is("deleted_at", null)
      .neq("status", "suspended")
      .not("phone", "is", null);

    if (opts.cityFilter?.length) {
      query = query.in("city", opts.cityFilter);
    }

    switch (opts.segment) {
      case "active":
        query = query.gt("total_valid_clicks", 0);
        break;
      case "dormant":
        query = query.gt("total_valid_clicks", 10);
        break;
      case "joined_no_clicks":
        query = query.eq("total_valid_clicks", 0).gt("total_campaigns_joined", 0);
        break;
    }

    const { data } = await query.limit(500);
    echoIds = (data || []).map((u) => u.id);
  }

  const results = { sent: 0, failed: 0, skipped: 0, total: echoIds.length, details: [] as Array<{ echoId: string; status: string; reason?: string }> };

  for (const echoId of echoIds) {
    const res = await sendSmsToEcho({
      echoId,
      type: opts.type,
      campaignId: opts.campaignId,
      vars: opts.vars,
      bypassDailyCap: opts.bypassDailyCap,
      bypassQuietHours: opts.bypassQuietHours,
    });

    results[res.status === "sent" ? "sent" : res.status === "failed" ? "failed" : "skipped"]++;
    results.details.push({ echoId, status: res.status, reason: res.reason });

    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}
