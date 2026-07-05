import { describe, it, expect, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/api/cron";
import { verifySharedWebhookSecret } from "@/lib/api/webhooks";

function requestWithAuth(authorization?: string): NextRequest {
  return {
    headers: new Headers(authorization ? { authorization } : {}),
  } as unknown as NextRequest;
}

function requestWithUrl(url: string): NextRequest {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyCronSecret", () => {
  it("accepts the correct Bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(requestWithAuth("Bearer s3cret"))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(requestWithAuth("Bearer nope"))).toBe(false);
  });

  it("rejects when the header is missing", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(requestWithAuth())).toBe(false);
  });

  it("fails closed when CRON_SECRET is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(verifyCronSecret(requestWithAuth("Bearer anything"))).toBe(false);
  });

  it("rejects secrets of different length without throwing", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(verifyCronSecret(requestWithAuth("Bearer s3cret-and-more"))).toBe(false);
  });
});

describe("verifySharedWebhookSecret", () => {
  it("accepts a matching ?secret= parameter", () => {
    vi.stubEnv("SMS_WEBHOOK_SECRET", "hook-secret");
    const req = requestWithUrl("https://tamma.me/api/sms/dlr?secret=hook-secret");
    expect(verifySharedWebhookSecret(req, "SMS_WEBHOOK_SECRET")).toBe(true);
  });

  it("rejects a wrong secret", () => {
    vi.stubEnv("SMS_WEBHOOK_SECRET", "hook-secret");
    const req = requestWithUrl("https://tamma.me/api/sms/dlr?secret=wrong");
    expect(verifySharedWebhookSecret(req, "SMS_WEBHOOK_SECRET")).toBe(false);
  });

  it("rejects when the parameter is missing", () => {
    vi.stubEnv("SMS_WEBHOOK_SECRET", "hook-secret");
    const req = requestWithUrl("https://tamma.me/api/sms/dlr");
    expect(verifySharedWebhookSecret(req, "SMS_WEBHOOK_SECRET")).toBe(false);
  });

  it("fails closed in production when the env var is unset", () => {
    vi.stubEnv("SMS_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const req = requestWithUrl("https://tamma.me/api/sms/dlr?secret=whatever");
    expect(verifySharedWebhookSecret(req, "SMS_WEBHOOK_SECRET")).toBe(false);
  });

  it("allows (with warning) in development when the env var is unset", () => {
    vi.stubEnv("SMS_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    const req = requestWithUrl("http://localhost:3000/api/sms/dlr");
    expect(verifySharedWebhookSecret(req, "SMS_WEBHOOK_SECRET")).toBe(true);
  });
});
