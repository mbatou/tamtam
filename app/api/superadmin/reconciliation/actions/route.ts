import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { healCheckoutSync, healPayoutSync } from "@/lib/reconciliation/auto-heal";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import type { Issue } from "@/lib/reconciliation/engine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, issueId, subjectType, subjectId, metadata } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  try {
    switch (action) {
      case "resolve": {
        if (!issueId) {
          return NextResponse.json({ error: "Missing issueId" }, { status: 400 });
        }

        await supabase
          .from("reconciliation_issues")
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: session.user.id,
            resolution_note: body.note || "Manually resolved",
          })
          .eq("id", issueId);

        return NextResponse.json({ ok: true, action: "resolved" });
      }

      case "refetch_wave": {
        const issue: Issue = {
          severity: "warning",
          category: "wave_sync",
          subjectType: subjectType || "wave_checkout",
          subjectId: subjectId || "",
          description: "Manual refetch",
          suggestedAction: "refetch_wave",
          autoHealable: true,
          metadata: metadata || {},
        };

        const result =
          issue.subjectType === "wave_payout"
            ? await healPayoutSync(issue)
            : await healCheckoutSync(issue);

        // If the issue was in the DB, mark it resolved on success
        if (issueId && result.success) {
          await supabase
            .from("reconciliation_issues")
            .update({
              resolved: true,
              resolved_at: new Date().toISOString(),
              resolved_by: session.user.id,
              resolution_note: `Auto-healed: ${result.action}`,
            })
            .eq("id", issueId);
        }

        return NextResponse.json({ ok: result.success, ...result });
      }

      case "refund": {
        // Refund a failed payout — credits the user's wallet
        if (!subjectId) {
          return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });
        }

        const { data: wavePayout } = await supabase
          .from("wave_payouts")
          .select("user_id, amount, payout_status")
          .eq("id", subjectId)
          .single();

        if (!wavePayout) {
          return NextResponse.json({ error: "Payout not found" }, { status: 404 });
        }

        if (wavePayout.payout_status !== "failed") {
          return NextResponse.json(
            { error: "Can only refund failed payouts" },
            { status: 400 }
          );
        }

        // Refund via atomic RPC
        const { data: refunded } = await supabase.rpc("refund_wallet_from_payout", {
          p_user_id: wavePayout.user_id,
          p_amount: wavePayout.amount,
        });

        if (!refunded) {
          return NextResponse.json({ error: "Refund RPC failed" }, { status: 500 });
        }

        await logWalletTransaction({
          supabase,
          userId: wavePayout.user_id,
          amount: wavePayout.amount,
          type: "withdrawal_refund",
          description: `Refund for failed payout (manual) — ${wavePayout.amount} FCFA`,
          sourceType: "wave_payout",
          sourceId: subjectId,
          createdBy: session.user.id,
        });

        // Mark issue resolved if provided
        if (issueId) {
          await supabase
            .from("reconciliation_issues")
            .update({
              resolved: true,
              resolved_at: new Date().toISOString(),
              resolved_by: session.user.id,
              resolution_note: "Refunded manually",
            })
            .eq("id", issueId);
        }

        return NextResponse.json({ ok: true, action: "refunded", amount: wavePayout.amount });
      }

      case "manual_credit": {
        // Credit a user manually (for orphan checkout scenarios)
        const userId = body.userId;
        const amount = body.amount;

        if (!userId || !amount || amount <= 0) {
          return NextResponse.json({ error: "Missing userId or invalid amount" }, { status: 400 });
        }

        // Update balance
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();

        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await supabase
          .from("users")
          .update({ balance: (user.balance || 0) + amount })
          .eq("id", userId);

        await logWalletTransaction({
          supabase,
          userId,
          amount,
          type: "manual_credit",
          description: `Manual credit (reconciliation) — ${amount} FCFA`,
          sourceType: body.sourceType || "reconciliation",
          sourceId: body.sourceId || null,
          createdBy: session.user.id,
        });

        if (issueId) {
          await supabase
            .from("reconciliation_issues")
            .update({
              resolved: true,
              resolved_at: new Date().toISOString(),
              resolved_by: session.user.id,
              resolution_note: `Manual credit: ${amount} FCFA`,
            })
            .eq("id", issueId);
        }

        return NextResponse.json({ ok: true, action: "credited", amount });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("Reconciliation action error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
