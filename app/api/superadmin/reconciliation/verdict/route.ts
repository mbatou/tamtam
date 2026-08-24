import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  checkCheckoutFlowIntegrity,
  checkPayoutFlowIntegrity,
  checkEchoPendingDrift,
  type Issue,
} from "@/lib/reconciliation/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export type VerdictStatus = "ok" | "warning" | "critical";

export interface Verdict {
  status: VerdictStatus;
  /** Money actually owed to a user, in FCFA. Never a sum of unrelated absolute values. */
  moneyOwedFcfa: number;
  actionableCount: number;
  checkedAt: string;
}

/**
 * The single source of truth for "is the money OK?".
 *
 * Built ONLY from issues a superadmin can act on today — exactly the set the
 * fix cards on /superadmin/wave-reconciliation expose, so a card can never be
 * amber while the hero above it is green:
 *   - completed checkouts credited to nobody (orphan credits)
 *   - checkouts and payouts Wave never told us the outcome of
 *   - failed payouts never refunded
 *   - écho pending earnings that can never unlock
 *
 * The platform-identity and legacy-column checks are deliberately excluded:
 * they are informational indicators of an incomplete accounting model, not
 * money. See lib/reconciliation/engine.ts.
 *
 * Both the page hero and the platform-wide banner read this endpoint, so they
 * can never show different numbers.
 */
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

  try {
    const [checkoutIssues, payoutIssues, driftIssues] = await Promise.all([
      checkCheckoutFlowIntegrity(),
      checkPayoutFlowIntegrity(),
      checkEchoPendingDrift(),
    ]);

    const actionable: Issue[] = [...checkoutIssues, ...payoutIssues, ...driftIssues];

    // Money owed to a real person: unrefunded failed payouts, credits a user
    // paid for but never received, and earnings frozen out of reach.
    const owedFrom = (i: Issue) =>
      i.category === "flow_orphan" ||
      i.subjectType === "echo_pending" ||
      i.suggestedAction === "refund";

    const moneyOwedFcfa = actionable
      .filter(owedFrom)
      .reduce((sum, i) => sum + Math.abs(i.discrepancy || 0), 0);

    const status: VerdictStatus = actionable.some((i) => i.severity === "critical")
      ? "critical"
      : actionable.length > 0
        ? "warning"
        : "ok";

    const verdict: Verdict = {
      status,
      moneyOwedFcfa,
      actionableCount: actionable.length,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(verdict);
  } catch (err) {
    console.error("Reconciliation verdict error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
