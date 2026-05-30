import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
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
    sent7dRes,
    suppressedRes,
    failedRes,
    byTypeRes,
    recentRes,
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
      .from("notification_queue")
      .select("type, status")
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("notification_queue")
      .select("id, echo_id, type, status, scheduled_for, sent_at, suppression_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
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

  return NextResponse.json({
    pending: pendingRes.count || 0,
    sentToday: sentTodayRes.count || 0,
    sent7d: sent7dRes.count || 0,
    suppressed7d: suppressedRes.count || 0,
    failed7d: failedRes.count || 0,
    byType: typeStats,
    recent: recentRes.data || [],
  });
}
