import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BOT_PATTERNS = /curl|python|bot|spider|scrapy|headless|phantom|selenium|wget|httpclient|java\/|go-http|node-fetch|axios/i;

interface ClickValidation {
  valid: boolean;
  reason?: string;
}

export async function validateClick(
  ip: string,
  userAgent: string,
  linkId: string,
): Promise<ClickValidation> {
  // 1. Blocked IP check
  const { data: blocked } = await supabaseAdmin
    .from("blocked_ips")
    .select("id")
    .eq("ip_address", ip)
    .limit(1);
  if (blocked?.length) return { valid: false, reason: "blocked_ip" };

  // 2. Bot detection
  if (!userAgent || userAgent.length < 10) return { valid: false, reason: "missing_user_agent" };
  if (BOT_PATTERNS.test(userAgent)) return { valid: false, reason: "bot_detected" };

  // 3. IP cooldown: same IP + same link = 1 valid click per 24h
  const { count: recentSameLink } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", linkId)
    .eq("ip_address", ip)
    .eq("is_valid", true)
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());
  if (recentSameLink && recentSameLink > 0) return { valid: false, reason: "ip_duplicate_24h" };

  // 4. Rate limit: max clicks per link per hour
  const { count: hourlyClicks } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", linkId)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (hourlyClicks && hourlyClicks > 50) return { valid: false, reason: "link_rate_limit" };

  // 5. Global IP rate limit: max 20 clicks from same IP across ALL links per hour
  const { count: ipHourly } = await supabaseAdmin
    .from("clicks")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (ipHourly && ipHourly > 20) return { valid: false, reason: "ip_global_rate_limit" };

  return { valid: true };
}
