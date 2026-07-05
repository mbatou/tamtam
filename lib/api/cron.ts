import "server-only";
import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Verify that a request carries `Authorization: Bearer <CRON_SECRET>`.
 * Timing-safe. Returns false when CRON_SECRET is not configured (fail-closed).
 *
 * Single shared implementation — do not copy this into route files.
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}
