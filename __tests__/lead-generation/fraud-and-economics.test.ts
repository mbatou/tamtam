import { describe, it, expect } from "vitest";

/**
 * LUP-113 — Lead Fraud Scoring & CPL Economics Tests
 * Pure logic tests that validate fraud scoring thresholds, factor combinations,
 * CPL/Echo share calculations, and budget exhaustion edge cases.
 */

describe("Lead Fraud Scoring — Factor Calculations", () => {
  // ------- Decision thresholds -------

  describe("Decision thresholds", () => {
    function decide(score: number): "verify" | "flag" | "reject" {
      if (score >= 70) return "reject";
      if (score >= 30) return "flag";
      return "verify";
    }

    it("score 0 → verify", () => expect(decide(0)).toBe("verify"));
    it("score 29 → verify", () => expect(decide(29)).toBe("verify"));
    it("score 30 → flag", () => expect(decide(30)).toBe("flag"));
    it("score 69 → flag", () => expect(decide(69)).toBe("flag"));
    it("score 70 → reject", () => expect(decide(70)).toBe("reject"));
    it("score 100 → reject", () => expect(decide(100)).toBe("reject"));
  });

  // ------- Factor weights -------

  describe("Factor weights sum correctly", () => {
    const FACTOR_WEIGHTS = {
      ip_multi_page: 30,
      bot_ua: 20,
      speed: 15,
      phone_reuse: 20,
      country: 15, // added at route level
    };

    it("max possible score is 100", () => {
      const total = Object.values(FACTOR_WEIGHTS).reduce((s, v) => s + v, 0);
      expect(total).toBe(100);
    });

    it("bot_ua alone (20) → verify", () => {
      expect(FACTOR_WEIGHTS.bot_ua).toBeLessThan(30);
    });

    it("bot_ua + speed (35) → flag", () => {
      const combined = FACTOR_WEIGHTS.bot_ua + FACTOR_WEIGHTS.speed;
      expect(combined).toBe(35);
      expect(combined).toBeGreaterThanOrEqual(30);
      expect(combined).toBeLessThan(70);
    });

    it("ip_multi_page + bot_ua + speed (65) → flag", () => {
      const combined = FACTOR_WEIGHTS.ip_multi_page + FACTOR_WEIGHTS.bot_ua + FACTOR_WEIGHTS.speed;
      expect(combined).toBe(65);
      expect(combined).toBeGreaterThanOrEqual(30);
      expect(combined).toBeLessThan(70);
    });

    it("ip_multi_page + bot_ua + phone_reuse (70) → reject", () => {
      const combined = FACTOR_WEIGHTS.ip_multi_page + FACTOR_WEIGHTS.bot_ua + FACTOR_WEIGHTS.phone_reuse;
      expect(combined).toBe(70);
      expect(combined).toBeGreaterThanOrEqual(70);
    });
  });

  // ------- Bot UA detection -------

  describe("Bot user agent detection", () => {
    const BOT_UA_PATTERNS = [
      /bot/i, /crawl/i, /spider/i, /headless/i, /phantom/i,
      /selenium/i, /puppeteer/i, /playwright/i, /curl/i, /wget/i,
      /python-requests/i, /httpx/i, /axios/i, /node-fetch/i,
    ];

    function isBot(ua: string): boolean {
      return BOT_UA_PATTERNS.some((p) => p.test(ua)) || !ua || ua.length < 20;
    }

    it("detects Googlebot", () => expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true));
    it("detects selenium", () => expect(isBot("Mozilla/5.0 Selenium")).toBe(true));
    it("detects curl", () => expect(isBot("curl/7.81.0")).toBe(true));
    it("detects python-requests", () => expect(isBot("python-requests/2.28.0")).toBe(true));
    it("detects puppeteer", () => expect(isBot("HeadlessChrome Puppeteer")).toBe(true));
    it("flags empty user agent", () => expect(isBot("")).toBe(true));
    it("flags very short user agent", () => expect(isBot("Mozilla/5.0")).toBe(true));
    it("passes legitimate Chrome UA", () => {
      expect(isBot("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0")).toBe(false);
    });
    it("passes legitimate Safari UA", () => {
      expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
    });
  });

  // ------- Speed check -------

  describe("Speed check (honeypot)", () => {
    it("flags submission under 5 seconds", () => {
      const now = Date.now();
      const pageLoadTs = now - 3000; // 3s ago
      const elapsed = now - pageLoadTs;
      expect(elapsed).toBeLessThan(5000);
    });

    it("passes submission after 5 seconds", () => {
      const now = Date.now();
      const pageLoadTs = now - 6000; // 6s ago
      const elapsed = now - pageLoadTs;
      expect(elapsed).toBeGreaterThanOrEqual(5000);
    });

    it("passes when page_load_ts is 0 (not set)", () => {
      const pageLoadTs = 0;
      const shouldCheck = pageLoadTs && pageLoadTs > 0;
      expect(shouldCheck).toBeFalsy();
    });

    it("passes when page_load_ts is undefined", () => {
      const pageLoadTs = undefined;
      const shouldCheck = pageLoadTs && pageLoadTs > 0;
      expect(shouldCheck).toBeFalsy();
    });
  });

  // ------- Country score at route level -------

  describe("Country check (route-level)", () => {
    it("adds +15 for non-SN country", () => {
      const country = "FR";
      let score = 20; // e.g. from bot_ua
      if (country && country !== "SN") score += 15;
      expect(score).toBe(35);
    });

    it("no penalty for SN country", () => {
      const country = "SN";
      let score = 20;
      if (country && country !== "SN") score += 15;
      expect(score).toBe(20);
    });

    it("no penalty for empty country header", () => {
      const country = "";
      let score = 20;
      if (country && country !== "SN") score += 15;
      expect(score).toBe(20);
    });
  });
});

describe("Lead CPL Economics", () => {
  const ECHO_LEAD_SHARE_PERCENT = 75;

  describe("Echo earnings from CPL", () => {
    it("75% of 500 FCFA CPL = 375 FCFA", () => {
      const cpl = 500;
      const echoEarnings = Math.floor(cpl * ECHO_LEAD_SHARE_PERCENT / 100);
      expect(echoEarnings).toBe(375);
    });

    it("75% of 200 FCFA CPL (minimum) = 150 FCFA", () => {
      const cpl = 200;
      const echoEarnings = Math.floor(cpl * ECHO_LEAD_SHARE_PERCENT / 100);
      expect(echoEarnings).toBe(150);
    });

    it("75% of 5000 FCFA CPL (maximum) = 3750 FCFA", () => {
      const cpl = 5000;
      const echoEarnings = Math.floor(cpl * ECHO_LEAD_SHARE_PERCENT / 100);
      expect(echoEarnings).toBe(3750);
    });

    it("floors fractional earnings (no fractions of FCFA)", () => {
      const cpl = 333;
      const echoEarnings = Math.floor(cpl * ECHO_LEAD_SHARE_PERCENT / 100);
      expect(echoEarnings).toBe(249);
      expect(Number.isInteger(echoEarnings)).toBe(true);
    });

    it("Tamtam gets 25% (remainder)", () => {
      const cpl = 500;
      const echoEarnings = Math.floor(cpl * ECHO_LEAD_SHARE_PERCENT / 100);
      const tamtamEarnings = cpl - echoEarnings;
      expect(tamtamEarnings).toBe(125);
    });
  });

  describe("Budget exhaustion", () => {
    it("debit succeeds when budget has room", () => {
      const budget = 15000;
      const spent = 10000;
      const cpl = 500;
      const canDebit = spent + cpl <= budget;
      expect(canDebit).toBe(true);
    });

    it("debit fails when budget would be exceeded", () => {
      const budget = 15000;
      const spent = 14800;
      const cpl = 500;
      const canDebit = spent + cpl <= budget;
      expect(canDebit).toBe(false);
    });

    it("debit succeeds at exact budget boundary", () => {
      const budget = 15000;
      const spent = 14500;
      const cpl = 500;
      const canDebit = spent + cpl <= budget;
      expect(canDebit).toBe(true);
      expect(spent + cpl).toBe(budget);
    });

    it("auto-completes campaign when spent >= budget", () => {
      const budget = 15000;
      const spent = 15000;
      const shouldComplete = spent >= budget;
      expect(shouldComplete).toBe(true);
    });
  });

  describe("Setup fee + budget total cost", () => {
    const LEAD_GEN_SETUP_FEE_FCFA = 5000;

    it("total cost is budget + setup fee", () => {
      const budget = 15000;
      const totalCost = budget + LEAD_GEN_SETUP_FEE_FCFA;
      expect(totalCost).toBe(20000);
    });

    it("minimum total cost = 15000 + 5000 = 20000", () => {
      const minBudget = 15000;
      const totalCost = minBudget + LEAD_GEN_SETUP_FEE_FCFA;
      expect(totalCost).toBe(20000);
    });

    it("balance must cover budget + setup fee", () => {
      const balance = 19000;
      const budget = 15000;
      const totalCost = budget + LEAD_GEN_SETUP_FEE_FCFA;
      expect(balance >= totalCost).toBe(false); // 19000 < 20000
    });
  });

  describe("Dual debit model (CPC + CPL from same budget)", () => {
    it("click CPC and lead CPL both debit from campaigns.spent", () => {
      let spent = 0;
      const budget = 15000;
      const cpc = 25;
      const cpl = 500;

      // Simulate 100 clicks
      for (let i = 0; i < 100; i++) {
        if (spent + cpc <= budget) spent += cpc;
      }
      expect(spent).toBe(2500); // 100 * 25

      // Simulate 5 verified leads
      for (let i = 0; i < 5; i++) {
        if (spent + cpl <= budget) spent += cpl;
      }
      expect(spent).toBe(5000); // 2500 + 5*500

      // Budget remaining
      const remaining = budget - spent;
      expect(remaining).toBe(10000);
    });

    it("campaign completes when mixed CPC+CPL exhaust budget", () => {
      let spent = 0;
      const budget = 1000;
      const cpc = 25;
      const cpl = 500;

      // 20 clicks = 500
      for (let i = 0; i < 20; i++) {
        if (spent + cpc <= budget) spent += cpc;
      }
      expect(spent).toBe(500);

      // 1 lead = 500 → exactly at budget
      if (spent + cpl <= budget) spent += cpl;
      expect(spent).toBe(1000);
      expect(spent >= budget).toBe(true);
    });
  });
});

describe("Lead Dedup Logic", () => {
  it("same phone + same landing page within 24h = duplicate", () => {
    const existingLeads = [
      { phone: "+221771234567", landing_page_id: "lp-1", created_at: new Date().toISOString() },
    ];
    const newPhone = "+221771234567";
    const newLpId = "lp-1";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const isDuplicate = existingLeads.some(
      (l) =>
        l.phone === newPhone &&
        l.landing_page_id === newLpId &&
        new Date(l.created_at) >= twentyFourHoursAgo
    );
    expect(isDuplicate).toBe(true);
  });

  it("same phone + different landing page = NOT duplicate", () => {
    const existingLeads = [
      { phone: "+221771234567", landing_page_id: "lp-1", created_at: new Date().toISOString() },
    ];
    const newPhone = "+221771234567";
    const newLpId = "lp-2";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const isDuplicate = existingLeads.some(
      (l) =>
        l.phone === newPhone &&
        l.landing_page_id === newLpId &&
        new Date(l.created_at) >= twentyFourHoursAgo
    );
    expect(isDuplicate).toBe(false);
  });

  it("same phone + same LP but older than 24h = NOT duplicate", () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const existingLeads = [
      { phone: "+221771234567", landing_page_id: "lp-1", created_at: oldDate },
    ];
    const newPhone = "+221771234567";
    const newLpId = "lp-1";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const isDuplicate = existingLeads.some(
      (l) =>
        l.phone === newPhone &&
        l.landing_page_id === newLpId &&
        new Date(l.created_at) >= twentyFourHoursAgo
    );
    expect(isDuplicate).toBe(false);
  });
});

describe("Conversion Flag Logic", () => {
  const MIN_CLICKS_THRESHOLD = 50;
  const LOW_CONVERSION_RATE = 0.02;

  function shouldFlag(spent: number, cpc: number, leads: number): boolean {
    const estimatedClicks = cpc > 0 ? Math.floor(spent / cpc) : 0;
    if (estimatedClicks < MIN_CLICKS_THRESHOLD) return false;
    const conversionRate = leads / estimatedClicks;
    return conversionRate < LOW_CONVERSION_RATE;
  }

  it("flags campaign with 0 leads and 100 clicks", () => {
    expect(shouldFlag(2500, 25, 0)).toBe(true);
  });

  it("flags campaign with 1 lead / 100 clicks (1%)", () => {
    expect(shouldFlag(2500, 25, 1)).toBe(true);
  });

  it("does NOT flag campaign with 2 leads / 100 clicks (2%)", () => {
    expect(shouldFlag(2500, 25, 2)).toBe(false);
  });

  it("does NOT flag campaign with 3 leads / 100 clicks (3%)", () => {
    expect(shouldFlag(2500, 25, 3)).toBe(false);
  });

  it("skips campaigns under 50 clicks threshold", () => {
    expect(shouldFlag(1000, 25, 0)).toBe(false); // 40 clicks
  });

  it("handles zero CPC without division error", () => {
    expect(shouldFlag(5000, 0, 5)).toBe(false); // 0 estimated clicks → skip
  });

  it("flags at exactly 50 clicks with 0 leads", () => {
    expect(shouldFlag(1250, 25, 0)).toBe(true); // exactly 50 clicks
  });
});
