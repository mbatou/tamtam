import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * LUP-113 — Source Code Pattern Audit Tests
 * Scans actual source files to verify critical patterns are followed
 * across all lead generation APIs.
 */

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(path.resolve(filePath), "utf-8");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Landing Pages API Route
// ---------------------------------------------------------------------------

describe("POST /api/landing-pages — Pattern Audit", () => {
  const src = readFile("app/api/landing-pages/route.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("uses getEffectiveBrandId (not raw session.user.id for campaigns)", () => {
    expect(src).toContain("getEffectiveBrandId");
  });

  it("validates input with createLeadCampaignSchema", () => {
    expect(src).toContain("createLeadCampaignSchema");
  });

  it("checks session auth before processing", () => {
    expect(src).toContain("auth.getSession");
    expect(src).toContain("status: 401");
  });

  it("uses LEAD_GEN_SETUP_FEE_FCFA constant (not hardcoded)", () => {
    expect(src).toContain("LEAD_GEN_SETUP_FEE_FCFA");
  });

  it("logs wallet transactions for budget debit", () => {
    expect(src).toContain("logWalletTransaction");
    expect(src).toContain("campaign_budget_debit");
  });

  it("creates campaign with objective = lead_generation", () => {
    expect(src).toContain('"lead_generation"');
  });

  it("generates slug for landing page", () => {
    expect(src).toContain("generateSlug");
  });

  it("calls generateLandingPageContent for AI content", () => {
    expect(src).toContain("generateLandingPageContent");
  });

  it("links campaign to landing page (sets landing_page_id)", () => {
    expect(src).toContain("landing_page_id");
  });

  it("handles draft mode (save_as_draft)", () => {
    expect(src).toContain("save_as_draft");
  });

  it("checks balance covers budget + setup fee", () => {
    expect(src).toContain("totalCost");
    expect(src).toContain("INSUFFICIENT_BALANCE");
  });

  it("rollbacks on campaign creation failure", () => {
    // Should restore balance if campaign insert fails
    expect(src).toContain("batteur.balance");
  });

  it("notifies superadmin about new lead gen campaign", () => {
    expect(src).toContain("support@tamma.me");
    expect(src).toContain("sendEmail");
  });
});

// ---------------------------------------------------------------------------
// Lead Submission API Route
// ---------------------------------------------------------------------------

describe("POST /api/leads/submit — Pattern Audit", () => {
  const src = readFile("app/api/leads/submit/route.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("applies rate limiting", () => {
    expect(src).toContain("rateLimit");
    expect(src).toContain("lead_submit:");
  });

  it("validates input with submitLeadSchema", () => {
    expect(src).toContain("submitLeadSchema");
  });

  it("checks landing page is active", () => {
    expect(src).toContain('status !== "active"');
  });

  it("checks campaign is active", () => {
    expect(src).toContain('campaign.status !== "active"');
  });

  it("performs phone dedup within 24h", () => {
    expect(src).toContain("twentyFourHoursAgo");
    expect(src).toContain("phone");
    expect(src).toContain("landing_page_id");
  });

  it("resolves echo attribution via tracked_link short_code", () => {
    expect(src).toContain("short_code");
    expect(src).toContain("tracked_links");
    expect(src).toContain("echo_id");
  });

  it("runs fraud scoring via scoreLead", () => {
    expect(src).toContain("scoreLead");
  });

  it("adds country penalty at route level", () => {
    expect(src).toContain("x-vercel-ip-country");
    expect(src).toContain('!== "SN"');
    expect(src).toContain("+= 15");
  });

  it("uses debit_campaign_for_lead RPC for atomic CPL debit", () => {
    expect(src).toContain("debit_campaign_for_lead");
  });

  it("uses ECHO_LEAD_SHARE_PERCENT constant", () => {
    expect(src).toContain("ECHO_LEAD_SHARE_PERCENT");
  });

  it("logs wallet transaction for echo earnings", () => {
    expect(src).toContain("logWalletTransaction");
    expect(src).toContain("lead_earning");
  });

  it("handles budget exhaustion gracefully", () => {
    expect(src).toContain("budget_exhausted");
  });

  it("notifies brand on verified leads", () => {
    expect(src).toContain("notifyNewLead");
  });

  it("returns silent success (does not leak fraud status)", () => {
    // The response should always be { success: true } to avoid leaking info
    expect(src).toContain('{ success: true }');
  });

  it("does NOT require auth (public endpoint)", () => {
    expect(src).not.toContain("auth.getSession");
  });

  it("uses supabaseAdmin (not user-scoped client)", () => {
    expect(src).toContain("supabaseAdmin");
  });
});

// ---------------------------------------------------------------------------
// Brand Leads API Route
// ---------------------------------------------------------------------------

describe("GET/PUT /api/admin/campaigns/leads — Pattern Audit", () => {
  const src = readFile("app/api/admin/campaigns/leads/route.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("requires auth", () => {
    expect(src).toContain("auth.getSession");
    expect(src).toContain("status: 401");
  });

  it("uses getEffectiveBrandId", () => {
    expect(src).toContain("getEffectiveBrandId");
  });

  it("verifies campaign ownership (or admin role)", () => {
    expect(src).toContain("batteur_id");
    expect(src).toContain("superadmin");
  });

  it("supports CSV export format", () => {
    expect(src).toContain("text/csv");
    expect(src).toContain("Content-Disposition");
    expect(src).toContain(".csv");
  });

  it("returns summary stats (total, verified, rejected, flagged)", () => {
    expect(src).toContain("summary");
    expect(src).toContain("verified");
    expect(src).toContain("rejected");
    expect(src).toContain("flagged");
  });

  it("supports manual lead verification (verify/reject)", () => {
    expect(src).toContain('"verify"');
    expect(src).toContain('"reject"');
  });

  it("triggers CPL payment on manual verification", () => {
    expect(src).toContain("debit_campaign_for_lead");
    expect(src).toContain("lead_earning");
  });

  it("filters by deleted_at IS NULL", () => {
    expect(src).toContain("deleted_at");
  });
});

// ---------------------------------------------------------------------------
// Lead Fraud Scorer
// ---------------------------------------------------------------------------

describe("lib/lead-fraud-scorer.ts — Pattern Audit", () => {
  const src = readFile("lib/lead-fraud-scorer.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("queries leads table for IP multi-page check", () => {
    expect(src).toContain('.from("leads")');
    expect(src).toContain("ip_address");
    expect(src).toContain("landing_page_id");
  });

  it("checks bot user agent patterns", () => {
    expect(src).toContain("BOT_UA_PATTERNS");
    expect(src).toContain("bot_ua");
  });

  it("checks submission speed (honeypot)", () => {
    expect(src).toContain("page_load_ts");
    expect(src).toContain("5000");
  });

  it("checks phone reuse across campaigns", () => {
    expect(src).toContain("phone_reuse");
    expect(src).toContain('"verified"');
  });

  it("returns score, factors, and decision", () => {
    expect(src).toContain("score");
    expect(src).toContain("factors");
    expect(src).toContain("decision");
  });

  it("uses correct threshold values", () => {
    expect(src).toContain(">= 70");
    expect(src).toContain(">= 30");
  });
});

// ---------------------------------------------------------------------------
// AI Landing Page Generator
// ---------------------------------------------------------------------------

describe("lib/ai/landing-page-generator.ts — Pattern Audit", () => {
  const src = readFile("lib/ai/landing-page-generator.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("uses server-only import guard", () => {
    expect(src).toContain('"server-only"');
  });

  it("implements SHA-256 input caching", () => {
    expect(src).toContain("sha256");
    expect(src).toContain("input_hash");
    expect(src).toContain("ai_generation_cache");
  });

  it("has 15-second timeout", () => {
    expect(src).toContain("15000");
    expect(src).toContain("AbortController");
  });

  it("uses correct Anthropic API endpoint", () => {
    expect(src).toContain("api.anthropic.com/v1/messages");
  });

  it("uses claude-sonnet-4-6 as primary model", () => {
    expect(src).toContain("claude-sonnet-4-6");
  });

  it("falls back to Haiku when global cap exceeded", () => {
    expect(src).toContain("claude-haiku-4-5-20251001");
    expect(src).toContain("useHaiku");
  });

  it("has global monthly cap of $50", () => {
    expect(src).toContain("50");
    expect(src).toContain("MONTHLY_GLOBAL_CAP_USD");
  });

  it("has brand monthly cap of $2", () => {
    expect(src).toContain("MONTHLY_BRAND_CAP_USD");
  });

  it("validates generated content (safety)", () => {
    expect(src).toContain("validateGeneratedContent");
    expect(src).toContain("PROHIBITED_WORDS");
  });

  it("provides fallback content on failure", () => {
    expect(src).toContain("getFallbackContent");
  });

  it("system prompt is in French for Senegalese market", () => {
    expect(src).toContain("senegalais");
    expect(src).toContain("francais");
  });

  it("tracks cost per call (input + output tokens)", () => {
    expect(src).toContain("input_tokens");
    expect(src).toContain("output_tokens");
    expect(src).toContain("cost_usd");
  });
});

// ---------------------------------------------------------------------------
// Lead Notification Service
// ---------------------------------------------------------------------------

describe("lib/notifications/lead-notification.ts — Pattern Audit", () => {
  const src = readFile("lib/notifications/lead-notification.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("uses sendEmailSafe (non-throwing)", () => {
    expect(src).toContain("sendEmailSafe");
  });

  it("includes wa.me deep link", () => {
    expect(src).toContain("wa.me");
  });

  it("skips when no notification email", () => {
    expect(src).toContain("if (!notificationEmail) return");
  });

  it("strips + from phone for wa.me link", () => {
    expect(src).toContain('replace(/^\\+/, "")');
  });

  it("includes campaign title in email subject", () => {
    expect(src).toContain("campaignTitle");
    expect(src).toContain("subject:");
  });
});

// ---------------------------------------------------------------------------
// Conversion Flag Cron
// ---------------------------------------------------------------------------

describe("Cron: lead-conversion-flag — Pattern Audit", () => {
  const src = readFile("app/api/cron/lead-conversion-flag/route.ts");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("queries only lead_generation campaigns", () => {
    expect(src).toContain('"lead_generation"');
  });

  it("queries only active, unflagged campaigns", () => {
    expect(src).toContain('"active"');
    expect(src).toContain("low_conversion_flagged");
  });

  it("uses 50-click minimum threshold", () => {
    expect(src).toContain("MIN_CLICKS_THRESHOLD");
    expect(src).toContain("50");
  });

  it("uses 2% conversion rate threshold", () => {
    expect(src).toContain("LOW_CONVERSION_RATE");
    expect(src).toContain("0.02");
  });

  it("estimates clicks from spent/cpc", () => {
    expect(src).toContain("campaign.spent");
    expect(src).toContain("campaign.cpc");
  });

  it("returns count of checked and flagged campaigns", () => {
    expect(src).toContain("checked");
    expect(src).toContain("flagged");
  });
});

// ---------------------------------------------------------------------------
// Landing Page Template (Dakar Night)
// ---------------------------------------------------------------------------

describe("Dakar Night Template — Pattern Audit", () => {
  const pageSrc = readFile("app/l/[slug]/page.tsx");
  const formSrc = readFile("app/l/[slug]/lead-form.tsx");

  it("page.tsx exists", () => {
    expect(pageSrc.length).toBeGreaterThan(0);
  });

  it("lead-form.tsx exists", () => {
    expect(formSrc.length).toBeGreaterThan(0);
  });

  it("page uses dynamic rendering", () => {
    expect(pageSrc).toContain('force-dynamic');
  });

  it("page checks slug and returns notFound", () => {
    expect(pageSrc).toContain("notFound");
    expect(pageSrc).toContain("slug");
  });

  it("page only shows active pages (status check)", () => {
    expect(pageSrc).toContain('"active"');
  });

  it("page filters soft-deleted pages", () => {
    expect(pageSrc).toContain("deleted_at");
  });

  it("form is a client component", () => {
    expect(formSrc).toContain('"use client"');
  });

  it("form records page_load_ts for honeypot", () => {
    expect(formSrc).toContain("pageLoadTs");
    expect(formSrc).toContain("Date.now()");
  });

  it("form requires consent checkbox", () => {
    expect(formSrc).toContain("consent");
    expect(formSrc).toContain("consent_given");
  });

  it("form posts to /api/leads/submit", () => {
    expect(formSrc).toContain("/api/leads/submit");
  });

  it("form passes ref (tracked_link attribution)", () => {
    expect(formSrc).toContain("ref");
  });

  it("form validates Senegalese phone format", () => {
    expect(formSrc).toContain("7[0-8]");
  });

  it("form shows success state after submission", () => {
    expect(formSrc).toContain("submitted");
    expect(formSrc).toContain("Merci");
  });

  it("page includes Tamtam attribution footer", () => {
    expect(pageSrc).toContain("Tamtam");
    expect(pageSrc).toContain("tamma.me");
  });
});

// ---------------------------------------------------------------------------
// Lead Gen Campaign Form (Brand Side)
// ---------------------------------------------------------------------------

describe("Lead Gen Campaign Form — Pattern Audit", () => {
  const src = readFile("app/admin/campaigns/lead-gen/page.tsx");

  it("file exists and is non-empty", () => {
    expect(src.length).toBeGreaterThan(0);
  });

  it("is a client component", () => {
    expect(src).toContain('"use client"');
  });

  it("uses BRAND_INDUSTRIES from validations", () => {
    expect(src).toContain("BRAND_INDUSTRIES");
  });

  it("uses LEAD_GEN_SETUP_FEE_FCFA and LEAD_GEN_MIN_BUDGET_FCFA constants", () => {
    expect(src).toContain("LEAD_GEN_SETUP_FEE_FCFA");
    expect(src).toContain("LEAD_GEN_MIN_BUDGET_FCFA");
  });

  it("posts to /api/landing-pages", () => {
    expect(src).toContain("/api/landing-pages");
  });

  it("supports draft saving", () => {
    expect(src).toContain("save_as_draft");
  });

  it("has multi-step flow (brand, form, budget, confirm)", () => {
    expect(src).toContain('"brand"');
    expect(src).toContain('"form"');
    expect(src).toContain('"budget"');
    expect(src).toContain('"confirm"');
  });

  it("limits form fields to max 5", () => {
    expect(src).toContain("formFields.length >= 5");
  });

  it("shows total cost breakdown (budget + setup fee)", () => {
    expect(src).toContain("totalCost");
  });
});

// ---------------------------------------------------------------------------
// Objective Selector Integration
// ---------------------------------------------------------------------------

describe("Campaigns Page — Lead Gen Objective", () => {
  const src = readFile("app/admin/campaigns/page.tsx");

  it("includes lead_generation in objective selector", () => {
    expect(src).toContain("lead_generation");
  });

  it("links to /admin/campaigns/lead-gen for lead gen flow", () => {
    expect(src).toContain("/admin/campaigns/lead-gen");
  });

  it("shows purple badge for lead_generation objective", () => {
    expect(src).toContain("purple");
  });
});
