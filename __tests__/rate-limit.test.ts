import { describe, it, expect, afterEach, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("rateLimit — in-memory fallback (no Redis configured)", () => {
  it("allows up to max requests then blocks within the window", async () => {
    const key = `test:${Math.random()}`;
    const first = await rateLimit(key, 2, 60000);
    const second = await rateLimit(key, 2, 60000);
    const third = await rateLimit(key, 2, 60000);

    expect(first).toEqual({ allowed: true, remaining: 1 });
    expect(second).toEqual({ allowed: true, remaining: 0 });
    expect(third).toEqual({ allowed: false, remaining: 0 });
  });

  it("uses separate windows per key", async () => {
    const a = await rateLimit(`a:${Math.random()}`, 1, 60000);
    const b = await rateLimit(`b:${Math.random()}`, 1, 60000);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});

describe("rateLimit — Redis backend", () => {
  function stubRedis(responder: (body: string) => unknown) {
    vi.stubEnv("KV_REST_API_URL", "https://fake-kv.example.com");
    vi.stubEnv("KV_REST_API_TOKEN", "fake-token");
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => ({
      ok: true,
      status: 200,
      json: async () => responder(init.body),
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("sends an INCR + PEXPIRE-NX pipeline and allows while under the limit", async () => {
    const fetchMock = stubRedis(() => [{ result: 3 }, { result: 1 }]);

    const result = await rateLimit("payment:user-1", 5, 3600000);

    expect(result).toEqual({ allowed: true, remaining: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual([
      ["INCR", "rl:payment:user-1"],
      ["PEXPIRE", "rl:payment:user-1", "3600000", "NX"],
    ]);
  });

  it("blocks when the shared counter exceeds max", async () => {
    stubRedis(() => [{ result: 6 }, { result: 0 }]);

    const result = await rateLimit("payment:user-2", 5, 3600000);

    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("fails open (memory fallback) when Redis errors", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://fake-kv.example.com");
    vi.stubEnv("KV_REST_API_TOKEN", "fake-token");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));

    const result = await rateLimit(`down:${Math.random()}`, 5, 60000);

    expect(result.allowed).toBe(true);
  });
});
