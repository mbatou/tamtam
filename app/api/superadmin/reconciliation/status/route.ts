import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get latest snapshot
  const { data: latestSnapshot } = await supabase
    .from("reconciliation_snapshots")
    .select("*")
    .order("computed_at", { ascending: false })
    .limit(1)
    .single();

  // Get unresolved issues count
  const { count: unresolvedCount } = await supabase
    .from("reconciliation_issues")
    .select("*", { count: "exact", head: true })
    .eq("resolved", false);

  // Get critical unresolved issues
  const { data: criticalIssues } = await supabase
    .from("reconciliation_issues")
    .select("*")
    .eq("severity", "critical")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    snapshot: latestSnapshot,
    unresolvedCount: unresolvedCount || 0,
    criticalIssues: criticalIssues || [],
    hasIssues: (unresolvedCount || 0) > 0,
    hasCritical: (criticalIssues || []).length > 0,
  });
}
