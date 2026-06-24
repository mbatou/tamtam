import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendSmsBatch } from "@/lib/sms/sms-service";
import { SmsType } from "@/lib/sms/templates";

export const dynamic = "force-dynamic";

const VALID_TYPES: SmsType[] = [
  "new_campaign",
  "share_reminder",
  "reengagement",
  "streak_danger",
  "campaign_ending",
  "welcome",
  "custom",
];

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();
  if (!session) return false;
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  return user?.role === "superadmin" || user?.role === "admin";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, campaignId, echoIds, cityFilter, segment, vars } = body as {
    type?: string;
    campaignId?: string;
    echoIds?: string[];
    cityFilter?: string[];
    segment?: string;
    vars?: Record<string, unknown>;
  };

  if (!type || !VALID_TYPES.includes(type as SmsType)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  if (type === "custom" && (!vars?.customMessage || typeof vars.customMessage !== "string")) {
    return NextResponse.json({ error: "customMessage required for custom type" }, { status: 400 });
  }

  const result = await sendSmsBatch({
    type: type as SmsType,
    campaignId,
    echoIds,
    cityFilter,
    segment: (segment as "all" | "active" | "dormant" | "joined_no_clicks") || "all",
    vars: vars as Record<string, string | number | null | undefined>,
  });

  return NextResponse.json(result);
}
