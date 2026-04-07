import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runLiveReconciliation } from "@/lib/reconciliation/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  try {
    const startTime = Date.now();
    const issues = await runLiveReconciliation();
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      issues,
      total: issues.length,
      critical: issues.filter((i) => i.severity === "critical").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
      durationMs,
    });
  } catch (err) {
    console.error("Live reconciliation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
