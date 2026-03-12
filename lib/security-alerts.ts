import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logSecurityEvent(
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown>,
  ip?: string,
  userId?: string
) {
  await supabaseAdmin.from("security_events").insert({
    event_type: eventType,
    severity,
    ip_address: ip || null,
    user_id: userId || null,
    details,
  });
}
