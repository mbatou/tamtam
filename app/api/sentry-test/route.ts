import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  // Manual test: capture a test event
  Sentry.captureMessage("Sentry test from Tamtam — if you see this, it works!", "info");

  // Also throw an error to test error capture
  try {
    throw new Error("Sentry test error — Tamtam integration verified");
  } catch (err) {
    Sentry.captureException(err);
  }

  return NextResponse.json({
    success: true,
    message: "Test event sent to Sentry. Check your Sentry dashboard in ~30 seconds.",
    timestamp: new Date().toISOString(),
  });
}
