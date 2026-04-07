import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { runFullReconciliation } from "@/lib/reconciliation/engine";
import { runAutoHeal } from "@/lib/reconciliation/auto-heal";
import { sendReconciliationAlerts } from "@/lib/reconciliation/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifyCronSecret(authHeader: string | null): boolean {
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!authHeader || authHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Run full reconciliation (all checks + persist snapshot)
    const snapshot = await runFullReconciliation();

    // 2. Auto-heal eligible issues (read-only sync)
    const healResults = await runAutoHeal(snapshot.issues);

    // 3. Send email alerts for critical issues
    await sendReconciliationAlerts(snapshot);

    return NextResponse.json({
      ok: true,
      issues: snapshot.issues.length,
      critical: snapshot.issues.filter((i) => i.severity === "critical").length,
      warnings: snapshot.issues.filter((i) => i.severity === "warning").length,
      healed: healResults.filter((r) => r.success).length,
      healFailed: healResults.filter((r) => !r.success).length,
      durationMs: snapshot.computeDurationMs,
    });
  } catch (err) {
    console.error("Reconciliation cron error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
