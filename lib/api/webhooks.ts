import "server-only";
import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Verify a provider webhook that authenticates via a shared secret passed as
 * a `?secret=` query parameter (for providers without signed payloads, e.g.
 * MTarget DLR/MO callbacks).
 *
 * Fail-closed in production: if the expected secret is not configured, the
 * request is rejected. In development a missing secret is allowed (with a
 * warning) so local testing works without provider config.
 */
export function verifySharedWebhookSecret(request: NextRequest, envVarName: string): boolean {
  const expected = process.env[envVarName];

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[webhook] ${envVarName} not configured — rejecting webhook (fail-closed)`);
      return false;
    }
    console.warn(`[webhook] ${envVarName} not set — accepting webhook (development only)`);
    return true;
  }

  const provided = request.nextUrl.searchParams.get("secret") || "";
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
