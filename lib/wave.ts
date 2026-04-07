import "server-only";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Wave API integration layer
// Docs: https://developers.wave.com
// ---------------------------------------------------------------------------

const WAVE_API_BASE = "https://api.wave.com/v1";

function getWaveApiKey(): string {
  const key = process.env.WAVE_API_KEY;
  if (!key) throw new Error("WAVE_API_KEY is not set");
  return key;
}

function getWaveSigningSecret(): string | null {
  return process.env.WAVE_SIGNING_SECRET || null;
}

function waveHeaders(body?: string, idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getWaveApiKey()}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  // Wave requires HMAC-SHA256 signature on every request
  if (body) {
    const sig = signRequest(body);
    if (sig) {
      headers["Wave-Signature"] = sig;
    }
  }
  return headers;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 request signing
// ---------------------------------------------------------------------------

export function signRequest(body: string): string {
  const secret = getWaveSigningSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// Wave signs with HMAC-SHA256 using the webhook/signing secret
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // Strip any prefix like "sha256=" or "hmac-sha256="
  const rawSignature = signature.replace(/^(sha256=|hmac-sha256=)/i, "");

  // Try WAVE_WEBHOOK_SECRET first, then WAVE_SIGNING_SECRET as fallback
  const secrets = [
    process.env.WAVE_WEBHOOK_SECRET,
    process.env.WAVE_SIGNING_SECRET,
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Safe comparison — handle different lengths gracefully
    if (expected.length === rawSignature.length) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(rawSignature))) {
          return true;
        }
      } catch {
        // Length mismatch or other error — try next secret
      }
    } else if (expected === rawSignature) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Checkout Sessions (Brand Recharge)
// ---------------------------------------------------------------------------

export interface WaveCheckoutRequest {
  amount: string; // Wave expects string
  currency: "XOF";
  error_url: string;
  success_url: string;
  client_reference?: string;
}

export interface WaveCheckoutSession {
  id: string;
  amount: string;
  checkout_status: "open" | "complete" | "expired";
  client_reference: string | null;
  currency: "XOF";
  error_url: string;
  last_payment_error: string | null;
  business_name: string;
  payment_status: "succeeded" | "pending" | "failed" | null;
  wave_launch_url: string;
  when_completed: string | null;
  when_created: string;
  when_expires: string;
}

export async function createCheckoutSession(
  params: WaveCheckoutRequest
): Promise<WaveCheckoutSession> {
  const body = JSON.stringify(params);
  const res = await fetch(`${WAVE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: waveHeaders(body),
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wave checkout creation failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getCheckoutSession(
  sessionId: string
): Promise<WaveCheckoutSession> {
  const emptyBody = "";
  const res = await fetch(`${WAVE_API_BASE}/checkout/sessions/${sessionId}`, {
    method: "GET",
    headers: waveHeaders(emptyBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wave checkout fetch failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Payouts (Écho Withdrawal)
// ---------------------------------------------------------------------------

export interface WavePayoutRequest {
  idempotency_key: string;
  mobile: string; // E.164 format e.g. "+221771234567"
  amount: string; // Wave expects string
  currency: "XOF";
  client_reference?: string;
  name?: string;
}

export type WavePayoutStatus =
  | "processing"
  | "completed"
  | "failed"
  | "reversed";

export interface WavePayout {
  id: string;
  amount: string;
  currency: "XOF";
  client_reference: string | null;
  error_code: string | null;
  error_message: string | null;
  mobile: string;
  name: string | null;
  national_id: string | null;
  payout_status: WavePayoutStatus;
  receipt_url: string | null;
  transaction_id: string | null;
  when_completed: string | null;
  when_created: string;
}

export async function createPayout(
  params: WavePayoutRequest
): Promise<WavePayout> {
  const body = JSON.stringify({
    mobile: params.mobile,
    amount: params.amount,
    currency: params.currency,
    client_reference: params.client_reference,
    name: params.name,
  });

  const res = await fetch(`${WAVE_API_BASE}/payout`, {
    method: "POST",
    headers: waveHeaders(body, params.idempotency_key),
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wave payout creation failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getPayout(payoutId: string): Promise<WavePayout> {
  const res = await fetch(`${WAVE_API_BASE}/payout/${payoutId}`, {
    method: "GET",
    headers: waveHeaders(""),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wave payout fetch failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Recipient verification (optional — check if mobile can receive payouts)
// ---------------------------------------------------------------------------

export interface WaveRecipientCheck {
  mobile: string;
  name: string | null;
  is_valid: boolean;
}

export async function verifyRecipient(
  mobile: string
): Promise<WaveRecipientCheck> {
  const res = await fetch(
    `${WAVE_API_BASE}/payout/eligibility?mobile=${encodeURIComponent(mobile)}`,
    {
      method: "GET",
      headers: waveHeaders(""),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wave recipient check failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Wave Payout Fee estimation
// ---------------------------------------------------------------------------

export const WAVE_PAYOUT_FEE_PERCENT = 1; // 1% fee on payouts
export const WAVE_MIN_PAYOUT_AMOUNT = 500; // Minimum amount Wave accepts

export function calculatePayoutFee(amount: number): {
  fee: number;
  netAmount: number;
} {
  const fee = Math.ceil(amount * (WAVE_PAYOUT_FEE_PERCENT / 100));
  return { fee, netAmount: amount - fee };
}

// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------

export type WaveWebhookEventType =
  | "checkout.session.completed"
  | "checkout.session.payment_failed"
  | "b2b.payment_received"
  | "b2b.payment_failed"
  | "merchant.payment_received";

export interface WaveWebhookEvent {
  id: string;
  type: WaveWebhookEventType;
  data: WaveCheckoutSession | WavePayout;
  timestamp: string;
}
