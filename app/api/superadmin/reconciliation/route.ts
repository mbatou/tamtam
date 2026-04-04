import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();

  const { data: currentUser } = await supabaseAdmin
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // =====================================================================
  // SINGLE BATCH: Fetch all needed data in parallel (was N+1 per user/campaign)
  // =====================================================================
  const [
    usersResult,
    allTransactionsResult,
    allCampaignsResult,
    allCampaignTransactionsResult,
    allCampaignClicksResult,
    allRefundsResult,
    allDebitTransactionsResult,
    moneyInResult,
    moneyOutResult,
    allBalancesResult,
  ] = await Promise.all([
    // 1. Users with positive balance
    supabaseAdmin.from("users")
      .select("id, name, company_name, role, wallet_balance")
      .gt("wallet_balance", 0)
      .is("deleted_at", null)
      .order("wallet_balance", { ascending: false }),
    // 2. All wallet transactions (for balance check — single query replaces N per-user queries)
    supabaseAdmin.from("wallet_transactions")
      .select("user_id, amount")
      .limit(100000),
    // 3. All campaigns
    supabaseAdmin.from("campaigns")
      .select("id, name, budget, spent, cpc, status, moderation_status, user_id"),
    // 4. Campaign budget transactions (replaces N per-campaign queries)
    supabaseAdmin.from("wallet_transactions")
      .select("source_id, type, amount")
      .in("type", ["campaign_budget_debit", "campaign_budget_refund"])
      .limit(100000),
    // 5. Valid clicks with campaign link (replaces N per-campaign click queries)
    supabaseAdmin.from("clicks")
      .select("link_id, is_valid, tracked_links!inner(campaign_id)")
      .eq("is_valid", true)
      .limit(100000),
    // 6. Refund audit
    supabaseAdmin.from("wallet_transactions")
      .select("id, user_id, amount, source_id, type, description, created_at")
      .eq("type", "campaign_budget_refund")
      .order("created_at", { ascending: false }),
    // 7. All negative transactions (for refund matching — replaces N per-refund queries)
    supabaseAdmin.from("wallet_transactions")
      .select("source_id, amount")
      .lt("amount", 0)
      .limit(100000),
    // 8. Platform P&L
    supabaseAdmin.from("wallet_transactions")
      .select("amount, type")
      .in("type", ["wallet_recharge", "welcome_bonus", "payment"]),
    supabaseAdmin.from("wallet_transactions")
      .select("amount, type")
      .in("type", ["withdrawal", "payout"]),
    supabaseAdmin.from("users")
      .select("wallet_balance, role")
      .not("wallet_balance", "is", null)
      .is("deleted_at", null),
  ]);

  // =====================================================================
  // 1. BALANCE INTEGRITY — computed in memory (was N+1 per user)
  // =====================================================================
  const transactionsByUser: Record<string, number> = {};
  const transactionCountByUser: Record<string, number> = {};
  for (const t of allTransactionsResult.data || []) {
    if (!transactionsByUser[t.user_id]) {
      transactionsByUser[t.user_id] = 0;
      transactionCountByUser[t.user_id] = 0;
    }
    transactionsByUser[t.user_id] += Number(t.amount) || 0;
    transactionCountByUser[t.user_id]++;
  }

  const balanceMismatches = [];
  for (const user of usersResult.data || []) {
    const expectedBalance = transactionsByUser[user.id] || 0;
    const actualBalance = user.wallet_balance || 0;
    const diff = Math.round(actualBalance - expectedBalance);

    if (Math.abs(diff) > 1) {
      balanceMismatches.push({
        userId: user.id,
        name: user.company_name || user.name,
        role: user.role,
        expectedBalance: Math.round(expectedBalance),
        actualBalance: Math.round(actualBalance),
        difference: diff,
        transactionCount: transactionCountByUser[user.id] || 0,
      });
    }
  }

  // =====================================================================
  // 2. CAMPAIGN BUDGET RECONCILIATION — computed in memory (was N+1 per campaign)
  // =====================================================================

  // Group campaign transactions by source_id (campaign_id)
  const txByCampaign: Record<string, { debitCount: number; refundCount: number }> = {};
  for (const tx of allCampaignTransactionsResult.data || []) {
    if (!tx.source_id) continue;
    if (!txByCampaign[tx.source_id]) {
      txByCampaign[tx.source_id] = { debitCount: 0, refundCount: 0 };
    }
    if (tx.type === "campaign_budget_debit") {
      txByCampaign[tx.source_id].debitCount++;
    }
    if (tx.type === "campaign_budget_refund") {
      txByCampaign[tx.source_id].refundCount++;
    }
  }

  // Group valid clicks by campaign
  const clicksByCampaign: Record<string, number> = {};
  for (const click of allCampaignClicksResult.data || []) {
    const cid = (click.tracked_links as unknown as { campaign_id: string } | null)?.campaign_id;
    if (cid) clicksByCampaign[cid] = (clicksByCampaign[cid] || 0) + 1;
  }

  const campaignIssues = [];
  for (const campaign of allCampaignsResult.data || []) {
    const validClicks = clicksByCampaign[campaign.id] || 0;
    const expectedSpent = validClicks * campaign.cpc;
    const actualSpent = campaign.spent || 0;
    const diff = Math.round(actualSpent - expectedSpent);

    const tx = txByCampaign[campaign.id] || { debitCount: 0, refundCount: 0 };

    const hasIssue = Math.abs(diff) > 1 || tx.debitCount > 1 || tx.refundCount > 1 ||
      (campaign.status === "draft" && tx.debitCount > 0);

    if (hasIssue) {
      campaignIssues.push({
        campaignId: campaign.id,
        name: campaign.name,
        budget: campaign.budget,
        actualSpent: actualSpent,
        expectedSpent: expectedSpent,
        difference: diff,
        validClicks,
        cpc: campaign.cpc,
        status: campaign.status,
        moderationStatus: campaign.moderation_status,
        debitCount: tx.debitCount,
        refundCount: tx.refundCount,
        issue: tx.debitCount > 1 ? "DUPLICATE_DEBIT" :
               tx.refundCount > 1 ? "DUPLICATE_REFUND" :
               campaign.status === "draft" && tx.debitCount > 0 ? "DRAFT_DEBITED" :
               Math.abs(diff) > 1 ? "SPEND_MISMATCH" : "UNKNOWN",
      });
    }
  }

  // =====================================================================
  // 3. REFUND AUDIT — computed in memory (was N+1 per refund)
  // =====================================================================

  // Build set of source_ids that have negative transactions (debits)
  const sourceIdsWithDebit = new Set<string>();
  for (const t of allDebitTransactionsResult.data || []) {
    if (t.source_id) sourceIdsWithDebit.add(t.source_id);
  }

  const refundAudit = [];
  const seenCampaigns = new Set();

  for (const refund of allRefundsResult.data || []) {
    const isDuplicate = seenCampaigns.has(refund.source_id);
    seenCampaigns.add(refund.source_id);

    const hasMatchingDebit = sourceIdsWithDebit.has(refund.source_id);

    refundAudit.push({
      ...refund,
      isDuplicate,
      hasMatchingDebit,
      issue: isDuplicate ? "DUPLICATE" : !hasMatchingDebit ? "ORPHAN" : null,
    });
  }

  // =====================================================================
  // 4. PLATFORM P&L — computed from parallel queries
  // =====================================================================
  const totalMoneyIn = (moneyInResult.data || []).reduce((sum: number, t: { amount: number | null }) => sum + Math.abs(t.amount || 0), 0);
  const totalMoneyOut = (moneyOutResult.data || []).reduce((sum: number, t: { amount: number | null }) => sum + Math.abs(t.amount || 0), 0);

  const totalBrandBalances = (allBalancesResult.data || [])
    .filter((u: { role: string }) => u.role !== "echo")
    .reduce((sum: number, u: { wallet_balance: number | string | null }) => sum + (Number(u.wallet_balance) || 0), 0);

  const totalEchoBalances = (allBalancesResult.data || [])
    .filter((u: { role: string }) => u.role === "echo")
    .reduce((sum: number, u: { wallet_balance: number | string | null }) => sum + (Number(u.wallet_balance) || 0), 0);

  // 5. ADVICE CARDS
  const advice = [];

  if (balanceMismatches.length > 0) {
    advice.push({
      severity: "red",
      title: `${balanceMismatches.length} account(s) with inconsistent balances`,
      detail: `Transactions do not match displayed balance. Verify manually.`,
    });
  }

  const duplicateRefunds = refundAudit.filter(r => r.isDuplicate);
  if (duplicateRefunds.length > 0) {
    const totalDuplicateAmount = duplicateRefunds.reduce((s, r) => s + Math.abs(r.amount), 0);
    advice.push({
      severity: "red",
      title: `${duplicateRefunds.length} duplicate refund(s) detected`,
      detail: `Total duplicate amount: ${totalDuplicateAmount.toLocaleString("fr-FR")} FCFA. Manual adjustment recommended.`,
    });
  }

  const draftDebited = campaignIssues.filter(c => c.issue === "DRAFT_DEBITED");
  if (draftDebited.length > 0) {
    advice.push({
      severity: "red",
      title: `${draftDebited.length} draft campaign(s) with debited budget`,
      detail: `Draft campaigns were debited from wallet. Bug identified and fixed (LUP-95).`,
    });
  }

  if (advice.length === 0) {
    advice.push({
      severity: "green",
      title: "Platform healthy",
      detail: "All balances match transactions. No anomalies detected.",
    });
  }

  return NextResponse.json({
    balanceMismatches,
    campaignIssues,
    refundAudit,
    platformPnL: {
      totalMoneyIn: Math.round(totalMoneyIn),
      totalMoneyOut: Math.round(totalMoneyOut),
      totalBrandBalances: Math.round(totalBrandBalances),
      totalEchoBalances: Math.round(totalEchoBalances),
    },
    advice,
  });
}
