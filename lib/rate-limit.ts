/**
 * Rate limiter with a distributed backend.
 *
 * Uses Upstash Redis over REST when configured — env vars from either the
 * Vercel KV integration (KV_REST_API_URL / KV_REST_API_TOKEN) or Upstash
 * directly (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). One INCR +
 * PEXPIRE-NX pipeline per check: fixed window, atomic, shared across all
 * serverless instances.
 *
 * Falls back to a per-instance in-memory window when Redis isn't configured
 * (local dev) — with a one-time warning in production, where per-instance
 * limits are ineffective. Redis errors fail open (a rate-limiter blip must
 * not take payment routes down) but are logged.
 */

const store = new Map<string, { count: number; resetAt: number }>();

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let warnedNoRedis = false;

function memoryRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = redisConfig();

  if (!redis) {
    if (!warnedNoRedis && process.env.NODE_ENV === "production") {
      warnedNoRedis = true;
      console.warn(
        "[rate-limit] No Redis configured (KV_REST_API_URL / UPSTASH_REDIS_REST_URL) — falling back to per-instance in-memory limits"
      );
    }
    return memoryRateLimit(key, max, windowMs);
  }

  try {
    const res = await fetch(`${redis.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["PEXPIRE", `rl:${key}`, windowMs.toString(), "NX"],
      ]),
      // Never let a slow limiter stall a request for long
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      throw new Error(`Redis pipeline HTTP ${res.status}`);
    }

    const results = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    if (results[0]?.error) throw new Error(results[0].error);

    const count = Number(results[0]?.result);
    if (!Number.isFinite(count)) throw new Error("Unexpected INCR result");

    return { allowed: count <= max, remaining: Math.max(0, max - count) };
  } catch (err) {
    console.error(
      "[rate-limit] Redis error — failing open:",
      err instanceof Error ? err.message : err
    );
    return memoryRateLimit(key, max, windowMs);
  }
}

// Cleanup the in-memory fallback store every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }, 300000).unref?.();
}
