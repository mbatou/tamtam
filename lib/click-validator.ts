import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Social platform preview bots are legitimate — they fire when users share links
const SOCIAL_PREVIEW_BOTS = /snapchat|whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterestbot|instagram/i;

const BOT_PATTERNS = /bot|crawl|spider|headless|phantom|selenium|puppeteer|curl|python|scrapy|wget|httpclient|java\/|go-http|node-fetch|axios/i;

interface ClickValidation {
  valid: boolean;
  reason?: string;
}

export async function validateClick(
  ip: string,
  userAgent: string,
  linkId: string,
): Promise<ClickValidation> {
  // 1. Social platform preview bots (WhatsApp, Snapchat, etc.) — skip entirely
  if (SOCIAL_PREVIEW_BOTS.test(userAgent)) return { valid: false, reason: "social_preview" };

  // 2. Bot user-agent check
  if (!userAgent || userAgent.length < 10) return { valid: false, reason: "missing_user_agent" };
  if (BOT_PATTERNS.test(userAgent)) return { valid: false, reason: "bot_useragent" };

  // 3. Check if IP is permanently blocked (datacenter/confirmed bots only)
  const { data: blocked } = await supabaseAdmin
    .from("blocked_ips")
    .select("id, block_type, expires_at")
    .eq("ip_address", ip)
    .limit(1);

  if (blocked?.length) {
    const block = blocked[0];
    // If temporary block, check if expired
    if (block.expires_at && new Date(block.expires_at) < new Date()) {
      // Expired — remove block and continue
      await supabaseAdmin.from("blocked_ips").delete().eq("id", block.id);
    } else if (block.block_type === "bot" || block.block_type === "datacenter") {
      return { valid: false, reason: "blocked_" + block.block_type };
    } else {
      // 'manual' and 'temporary' blocks also reject
      return { valid: false, reason: "blocked_manual" };
    }
  }

  // 4. Speed check: if same IP clicked ANY link in last 3 seconds, reject
  const { count: speedCheck } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", new Date(Date.now() - 3000).toISOString());

  if (speedCheck && speedCheck > 0) return { valid: false, reason: "speed_bot" };

  // 5. IP cooldown: same IP + same link = 1 valid click per 24h
  const { count: recentSameLink } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", linkId)
    .eq("ip_address", ip)
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());

  if (recentSameLink && recentSameLink > 0) return { valid: false, reason: "ip_cooldown_24h" };

  // 6. Per-link rate limit: max 30 clicks per link per hour
  const { count: hourlyClicks } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", linkId)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());

  if (hourlyClicks && hourlyClicks >= 30) return { valid: false, reason: "link_rate_limit" };

  // 7. Per-IP daily global limit: max 8 valid clicks per IP per day across ALL links
  const { count: ipDaily } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("is_valid", true)
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());

  if (ipDaily && ipDaily >= 8) return { valid: false, reason: "ip_daily_limit" };

  return { valid: true };
}
