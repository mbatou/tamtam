import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  runLiveReconciliation,
  checkCheckoutFlowIntegrity,
  checkPayoutFlowIntegrity,
  type Issue,
} from "@/lib/reconciliation/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Live reconciliation scan.
 *
 * With no `?check=`, runs every live check — used by the collapsed technical
 * details panel, which only fetches when a human opens it.
 *
 * With `?check=`, runs just the checks one fix card needs, so each card on the
 * page stays self-contained without four full scans on page load:
 *   wave_sync       — stale checkouts + payouts stuck in processing (resyncable)
 *   failed_payouts  — failed payouts the user was never refunded for
 *   orphan_credits  — completed checkouts with no wallet transaction
 */
const SCOPES = ["wave_sync", "failed_payouts", "orphan_credits"] as const;
type Scope = (typeof SCOPES)[number];

async function runScope(scope: Scope): Promise<Issue[]> {
  switch (scope) {
    case "wave_sync": {
      const [checkouts, payouts] = await Promise.all([
        checkCheckoutFlowIntegrity(),
        checkPayoutFlowIntegrity(),
      ]);
      return [...checkouts, ...payouts].filter((i) => i.suggestedAction === "refetch_wave");
    }
    case "failed_payouts": {
      const payouts = await checkPayoutFlowIntegrity();
      return payouts.filter((i) => i.suggestedAction === "refund");
    }
    case "orphan_credits": {
      const checkouts = await checkCheckoutFlowIntegrity();
      return checkouts.filter((i) => i.category === "flow_orphan");
    }
  }
}

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", authUser.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const requested = new URL(request.url).searchParams.get("check");
  if (requested && !SCOPES.includes(requested as Scope)) {
    return NextResponse.json({ error: `Unknown check: ${requested}` }, { status: 400 });
  }

  try {
    const issues = requested
      ? await runScope(requested as Scope)
      : await runLiveReconciliation();

    return NextResponse.json({ issues, checkedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Live reconciliation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
