import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { EmailCategory } from "./channel-policy";

/**
 * Stateless unsubscribe links.
 *
 * The token is an HMAC over (userId, category) with a server-side secret, so
 * an unsubscribe URL is unguessable and cannot be tampered into unsubscribing
 * a different user — without needing a token column or an expiry sweep.
 */

function secret(): string {
  const value =
    process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET (or SUPABASE_SERVICE_ROLE_KEY) must be set to sign unsubscribe links",
    );
  }
  return value;
}

/** `category` omitted = unsubscribe from everything suppressible. */
export function signUnsubscribe(userId: string, category?: EmailCategory): string {
  return createHmac("sha256", secret())
    .update(`${userId}:${category || "all"}`)
    .digest("hex");
}

export function verifyUnsubscribe(
  userId: string,
  token: string,
  category?: EmailCategory,
): boolean {
  const expected = signUnsubscribe(userId, category);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unsubscribeUrl(userId: string, category?: EmailCategory): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tamma.me";
  const params = new URLSearchParams({ u: userId, t: signUnsubscribe(userId, category) });
  if (category) params.set("c", category);
  return `${base}/api/email/unsubscribe?${params.toString()}`;
}
