import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// LUP-113: Lead Fraud Scoring (0-100)
// Thresholds: <30 auto-verify, 30-70 flag for review, >70 reject
// ---------------------------------------------------------------------------

export interface FraudScoringInput {
  ip_address: string;
  user_agent: string;
  phone: string;
  landing_page_id: string;
  page_load_ts?: number; // Unix ms timestamp when page was loaded
}

export interface FraudScoringResult {
  score: number;
  factors: string[];
  decision: "verify" | "flag" | "reject";
}

// Bot-like user agent patterns
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /headless/i, /phantom/i,
  /selenium/i, /puppeteer/i, /playwright/i, /curl/i, /wget/i,
  /python-requests/i, /httpx/i, /axios/i, /node-fetch/i,
];

export async function scoreLead(
  supabase: SupabaseClient,
  input: FraudScoringInput
): Promise<FraudScoringResult> {
  let score = 0;
  const factors: string[] = [];

  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // Factor 1: IP submitted to 3+ different landing pages in 24h (+30)
  const { count: ipLandingPages } = await supabase
    .from("leads")
    .select("landing_page_id", { count: "exact", head: true })
    .eq("ip_address", input.ip_address)
    .gte("created_at", twentyFourHoursAgo)
    .neq("landing_page_id", input.landing_page_id);

  if ((ipLandingPages || 0) >= 3) {
    score += 30;
    factors.push(`ip_multi_page:${ipLandingPages}`);
  }

  // Factor 2: Bot-like user agent (+20)
  const isBot = BOT_UA_PATTERNS.some((p) => p.test(input.user_agent));
  if (isBot || !input.user_agent || input.user_agent.length < 20) {
    score += 20;
    factors.push("bot_ua");
  }

  // Factor 3: Submission too fast (< 5s after page load) (+15)
  if (input.page_load_ts && input.page_load_ts > 0) {
    const elapsedMs = now - input.page_load_ts;
    if (elapsedMs < 5000) {
      score += 15;
      factors.push(`speed:${Math.round(elapsedMs / 1000)}s`);
    }
  }

  // Factor 4: Phone already verified on 5+ other campaigns (+20)
  const { count: phoneVerified } = await supabase
    .from("leads")
    .select("campaign_id", { count: "exact", head: true })
    .eq("phone", input.phone)
    .eq("status", "verified");

  if ((phoneVerified || 0) >= 5) {
    score += 20;
    factors.push(`phone_reuse:${phoneVerified}`);
  }

  // Factor 5: IP from outside Senegal (+15)
  // This is checked via x-vercel-ip-country header at the route level
  // and passed in as a flag. For now, we skip this here and handle it
  // in the route. The route adds 15 to the score if country !== "SN".

  // Determine decision
  let decision: "verify" | "flag" | "reject";
  if (score >= 70) {
    decision = "reject";
  } else if (score >= 30) {
    decision = "flag";
  } else {
    decision = "verify";
  }

  return { score, factors, decision };
}
