import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("notification_queue")
    .select("id, echo_id, type, status, campaign_id, scheduled_for, sent_at, suppression_reason, payload, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get echo names for display
  const echoIds = Array.from(new Set((data || []).map((n) => n.echo_id)));
  const echoMap: Record<string, { name: string; city: string | null }> = {};
  if (echoIds.length > 0) {
    const { data: echos } = await supabase
      .from("users")
      .select("id, name, city")
      .in("id", echoIds.slice(0, 200));
    if (echos) {
      for (const e of echos) {
        echoMap[e.id] = { name: e.name, city: e.city };
      }
    }
  }

  // Bulk stats
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [totalSentRes, totalSuppressedRes, totalFailedRes] = await Promise.all([
    supabase.from("notification_queue").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", thirtyDaysAgo),
    supabase.from("notification_queue").select("id", { count: "exact", head: true }).eq("status", "suppressed").gte("created_at", thirtyDaysAgo),
    supabase.from("notification_queue").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", thirtyDaysAgo),
  ]);

  const totalAll = (totalSentRes.count || 0) + (totalSuppressedRes.count || 0) + (totalFailedRes.count || 0);
  const deliveryRate30d = totalAll > 0 ? Math.round(((totalSentRes.count || 0) / totalAll) * 100) : 100;

  return NextResponse.json({
    notifications: (data || []).map((n) => ({
      ...n,
      echo_name: echoMap[n.echo_id]?.name || "—",
      echo_city: echoMap[n.echo_id]?.city || null,
    })),
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    bulkStats: {
      totalSent: totalSentRes.count || 0,
      deliveryRate: deliveryRate30d,
      totalSuppressed: totalSuppressedRes.count || 0,
      totalFailed: totalFailedRes.count || 0,
    },
  });
}
