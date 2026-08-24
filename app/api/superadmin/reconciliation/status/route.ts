import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", authUser.id).single();
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

  // The "is the money OK?" verdict lives at /api/superadmin/reconciliation/verdict.
  // This endpoint only serves the cached snapshot numbers behind the technical
  // details panel — never a health signal.
  return NextResponse.json({
    snapshot: latestSnapshot,
    unresolvedCount: unresolvedCount || 0,
  });
}
