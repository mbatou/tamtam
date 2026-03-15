import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";

export const revalidate = 60; // cache 1 minute

export async function GET() {
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["min_payout_fcfa", "referral_program_enabled"]);

  const settings: Record<string, string> = {};
  for (const row of rows || []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({
    min_payout_fcfa: parseInt(settings.min_payout_fcfa) || MIN_PAYOUT_AMOUNT,
    referral_program_enabled: settings.referral_program_enabled !== "false",
  });
}
