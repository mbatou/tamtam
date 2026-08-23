import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Backfill for the "stuck pending earnings" bug.
//
// Echo earnings are credited to users.pending_balance (atomically, in
// increment_click / process_cpa_conversion), but were mirrored into the
// pending_earnings table only best-effort AFTER the HTTP response. The unlock
// cron settles ONLY from pending_earnings, so any pending_balance without a
// matching pending_earnings row never becomes withdrawable.
//
// This route surfaces and settles that drift: for each echo it moves the
// unbacked portion of pending_balance into available_balance (via
// transfer_pending_to_available) and writes an auditable wallet_transactions
// row. It does NOT touch the legacy `balance` column (a stale duplicate that
// is not owed money — paying it would double-pay echos who already withdrew).
//
// GET            -> report (dry-run view)
// POST {dry_run} -> dry_run:true (default) reports; dry_run:false executes.
// Idempotent: after execution each echo's drift is 0, so re-running is a no-op.
// ---------------------------------------------------------------------------

interface DriftRow {
  echo_id: string;
  echo_name: string | null;
  pending_balance: number;
  backed: number;
  drift: number;
}

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();
  if (!authUser) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", authUser.id).single();
  if (!user || user.role !== "superadmin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { supabase, authUserId: authUser.id };
}

async function loadDrift(supabase: ReturnType<typeof createServiceClient>): Promise<DriftRow[]> {
  const { data } = await supabase.rpc("echo_pending_drift");
  return (data as DriftRow[] | null)?.filter((r) => r.drift > 0) || [];
}

function summarize(rows: DriftRow[]) {
  return {
    echos: rows.length,
    total_fcfa: rows.reduce((s, r) => s + r.drift, 0),
  };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const rows = await loadDrift(auth.supabase);
  return NextResponse.json({
    ...summarize(rows),
    echos_detail: rows.map((r) => ({
      echo_id: r.echo_id,
      name: r.echo_name,
      pending_balance: r.pending_balance,
      backed_by_pending_earnings: r.backed,
      stuck_fcfa: r.drift,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;
  const { supabase, authUserId } = auth;

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // default: dry-run

  const rows = await loadDrift(supabase);

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      ...summarize(rows),
      message: "Send POST with { \"dry_run\": false } to execute",
      echos_detail: rows.map((r) => ({
        echo_id: r.echo_id,
        name: r.echo_name,
        stuck_fcfa: r.drift,
      })),
    });
  }

  let settledEchos = 0;
  let settledTotal = 0;
  const failures: { echo_id: string; error: string }[] = [];

  for (const r of rows) {
    if (r.drift <= 0) continue;

    const { error: transferError } = await supabase.rpc("transfer_pending_to_available", {
      p_user_id: r.echo_id,
      p_amount: r.drift,
    });

    if (transferError) {
      failures.push({ echo_id: r.echo_id, error: transferError.message });
      continue;
    }

    await logWalletTransaction({
      supabase,
      userId: r.echo_id,
      amount: r.drift,
      // Neutral reconciliation type — this is NOT new earnings (already counted
      // in total_earned at click time), just moving stuck pending -> available.
      type: "legacy_reconciliation",
      description: "Régularisation gains bloqués (pending non débloqués)",
      sourceType: "reconciliation",
      createdBy: authUserId,
    });

    settledEchos++;
    settledTotal += r.drift;
  }

  return NextResponse.json({
    dry_run: false,
    settled_echos: settledEchos,
    settled_fcfa: settledTotal,
    failures,
  });
}
