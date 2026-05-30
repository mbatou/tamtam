import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || !["superadmin", "admin"].includes(user.role)) return null;
  return { session, supabase };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    pendingRes,
    sentTodayRes,
    suppressedTodayRes,
    sent7dRes,
    suppressedRes,
    failedRes,
    pushSubsRes,
    byTypeRes,
    recentRes,
    weekDataRes,
  ] = await Promise.all([
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", `${today}T00:00:00Z`),
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "suppressed")
      .gte("created_at", `${today}T00:00:00Z`),
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", sevenDaysAgo),
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "suppressed")
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("notification_queue")
      .select("type, status")
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("notification_queue")
      .select("id, echo_id, type, status, scheduled_for, sent_at, suppression_reason, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notification_queue")
      .select("status, created_at")
      .gte("created_at", sevenDaysAgo),
  ]);

  // Aggregate by type
  const typeStats: Record<string, { sent: number; suppressed: number; failed: number; pending: number }> = {};
  if (byTypeRes.data) {
    for (const row of byTypeRes.data) {
      if (!typeStats[row.type]) {
        typeStats[row.type] = { sent: 0, suppressed: 0, failed: 0, pending: 0 };
      }
      const s = row.status as string;
      if (s in typeStats[row.type]) {
        typeStats[row.type][s as keyof typeof typeStats[typeof row.type]]++;
      }
    }
  }

  // Build daily chart data for last 7 days
  const dailyChart: { date: string; sent: number; suppressed: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    dailyChart.push({ date: dateStr, sent: 0, suppressed: 0, failed: 0 });
  }
  if (weekDataRes.data) {
    for (const row of weekDataRes.data) {
      const dateStr = new Date(row.created_at).toISOString().split("T")[0];
      const entry = dailyChart.find((d) => d.date === dateStr);
      if (entry) {
        if (row.status === "sent") entry.sent++;
        else if (row.status === "suppressed") entry.suppressed++;
        else if (row.status === "failed") entry.failed++;
      }
    }
  }

  // Delivery rate
  const total7d = (sent7dRes.count || 0) + (suppressedRes.count || 0) + (failedRes.count || 0);
  const deliveryRate = total7d > 0 ? Math.round(((sent7dRes.count || 0) / total7d) * 100) : 100;

  return NextResponse.json({
    pending: pendingRes.count || 0,
    sentToday: sentTodayRes.count || 0,
    suppressedToday: suppressedTodayRes.count || 0,
    sent7d: sent7dRes.count || 0,
    suppressed7d: suppressedRes.count || 0,
    failed7d: failedRes.count || 0,
    pushSubscribers: pushSubsRes.count || 0,
    deliveryRate,
    byType: typeStats,
    dailyChart,
    recent: recentRes.data || [],
  });
}
