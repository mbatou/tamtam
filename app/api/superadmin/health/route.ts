import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  details?: string;
}

interface TableInfo {
  name: string;
  count: number;
}

async function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const checks: HealthCheck[] = [];

  // 1. Database connectivity & latency
  try {
    const { latencyMs } = await measureLatency(async () =>
      await supabase.from("users").select("id", { count: "exact", head: true })
    );
    checks.push({
      name: "Base de données",
      status: latencyMs < 500 ? "healthy" : latencyMs < 2000 ? "degraded" : "down",
      latencyMs,
    });
  } catch {
    checks.push({ name: "Base de données", status: "down", latencyMs: 0, details: "Connexion échouée" });
  }

  // 2. Auth service
  try {
    const { latencyMs } = await measureLatency(() =>
      supabase.auth.getSession()
    );
    checks.push({
      name: "Authentification",
      status: latencyMs < 500 ? "healthy" : latencyMs < 2000 ? "degraded" : "down",
      latencyMs,
    });
  } catch {
    checks.push({ name: "Authentification", status: "down", latencyMs: 0, details: "Service auth indisponible" });
  }

  // 3. Storage (check creatives bucket)
  try {
    const { latencyMs } = await measureLatency(() =>
      supabase.storage.from("creatives").list("", { limit: 1 })
    );
    checks.push({
      name: "Stockage fichiers",
      status: latencyMs < 1000 ? "healthy" : latencyMs < 3000 ? "degraded" : "down",
      latencyMs,
    });
  } catch {
    checks.push({ name: "Stockage fichiers", status: "down", latencyMs: 0, details: "Bucket inaccessible" });
  }

  // 4. Table counts (data integrity overview)
  const tables = ["users", "campaigns", "clicks", "tracked_links", "payouts", "brand_leads", "security_events"];
  const tableCounts: TableInfo[] = [];
  for (const table of tables) {
    try {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      tableCounts.push({ name: table, count: count || 0 });
    } catch {
      tableCounts.push({ name: table, count: -1 });
    }
  }

  // 5. Recent security events
  const { data: recentSecurityEvents } = await supabase
    .from("security_events")
    .select("id, event_type, severity, ip_address, created_at, details")
    .order("created_at", { ascending: false })
    .limit(20);

  // 6. Security event counts (last 24h, 7d)
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { count: secEvents24h },
    { count: secEvents7d },
    { count: criticalEvents24h },
    { count: highEvents24h },
  ] = await Promise.all([
    supabase.from("security_events").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    supabase.from("security_events").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("security_events").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo).eq("severity", "critical"),
    supabase.from("security_events").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo).eq("severity", "high"),
  ]);

  // 7. Anomaly detection
  const anomalies: { type: string; severity: "warning" | "critical"; message: string }[] = [];

  // Check for high fraud rate
  const { count: totalClicks } = await supabase.from("clicks").select("*", { count: "exact", head: true });
  const { count: fraudClicks } = await supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false);
  const fraudRate = (totalClicks || 0) > 0 ? ((fraudClicks || 0) / (totalClicks || 1)) * 100 : 0;
  if (fraudRate > 20) {
    anomalies.push({ type: "fraud", severity: "critical", message: `Taux de fraude critique: ${fraudRate.toFixed(1)}%` });
  } else if (fraudRate > 10) {
    anomalies.push({ type: "fraud", severity: "warning", message: `Taux de fraude élevé: ${fraudRate.toFixed(1)}%` });
  }

  // Check for pending payouts backlog
  const { count: pendingPayouts } = await supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending");
  if ((pendingPayouts || 0) > 10) {
    anomalies.push({ type: "payouts", severity: "warning", message: `${pendingPayouts} paiements en attente` });
  }

  // Check for campaigns with overspend
  const { data: overspentCampaigns } = await supabase
    .from("campaigns")
    .select("id, title, spent, budget")
    .eq("status", "active");
  const overspent = (overspentCampaigns || []).filter((c) => c.spent > c.budget);
  if (overspent.length > 0) {
    anomalies.push({ type: "budget", severity: "critical", message: `${overspent.length} campagne(s) ont dépassé leur budget` });
  }

  // Check for critical security events in last 24h
  if ((criticalEvents24h || 0) > 0) {
    anomalies.push({ type: "security", severity: "critical", message: `${criticalEvents24h} événement(s) critiques dans les 24h` });
  }
  if ((highEvents24h || 0) > 5) {
    anomalies.push({ type: "security", severity: "warning", message: `${highEvents24h} événements haute sévérité dans les 24h` });
  }

  // 8. Recent admin activity
  const { data: recentActivity } = await supabase
    .from("admin_activity_log")
    .select("id, admin_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  const overallStatus = checks.some((c) => c.status === "down")
    ? "down"
    : checks.some((c) => c.status === "degraded")
    ? "degraded"
    : "healthy";

  return NextResponse.json({
    overallStatus,
    checks,
    tableCounts,
    securitySummary: {
      events24h: secEvents24h || 0,
      events7d: secEvents7d || 0,
      critical24h: criticalEvents24h || 0,
      high24h: highEvents24h || 0,
    },
    recentSecurityEvents: recentSecurityEvents || [],
    anomalies,
    recentActivity: recentActivity || [],
    checkedAt: new Date().toISOString(),
  });
}
