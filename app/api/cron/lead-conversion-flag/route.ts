import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// LUP-113: Low Conversion Flag Cron
// Flags lead generation campaigns with < 2% conversion rate after 50+ clicks.
// Intended to run daily.
// ---------------------------------------------------------------------------

const MIN_CLICKS_THRESHOLD = 50;
const LOW_CONVERSION_RATE = 0.02; // 2%

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !process.env.CRON_SECRET) return false;
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expected)
  );
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find active lead_generation campaigns with enough traffic
    const { data: campaigns, error } = await supabaseAdmin
      .from("campaigns")
      .select("id, title, batteur_id, spent, cpc, leads_captured_count, low_conversion_flagged")
      .eq("objective", "lead_generation")
      .eq("status", "active")
      .eq("low_conversion_flagged", false);

    if (error) {
      console.error("Cron lead-conversion-flag query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let flaggedCount = 0;

    for (const campaign of campaigns || []) {
      // Estimate click count from spent / cpc
      const estimatedClicks = campaign.cpc > 0 ? Math.floor(campaign.spent / campaign.cpc) : 0;

      if (estimatedClicks < MIN_CLICKS_THRESHOLD) continue;

      // Calculate conversion rate
      const leads = campaign.leads_captured_count || 0;
      const conversionRate = leads / estimatedClicks;

      if (conversionRate < LOW_CONVERSION_RATE) {
        // Flag the campaign
        await supabaseAdmin
          .from("campaigns")
          .update({ low_conversion_flagged: true })
          .eq("id", campaign.id);

        flaggedCount++;
        console.log(
          `Flagged campaign ${campaign.id} (${campaign.title}): ${leads} leads / ${estimatedClicks} clicks = ${(conversionRate * 100).toFixed(1)}%`
        );
      }
    }

    Sentry.addBreadcrumb({
      category: "cron",
      message: "Lead conversion flag job completed",
      level: "info",
      data: { checked: (campaigns || []).length, flagged: flaggedCount },
    });

    return NextResponse.json({
      success: true,
      checked: (campaigns || []).length,
      flagged: flaggedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error("Cron lead-conversion-flag error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
