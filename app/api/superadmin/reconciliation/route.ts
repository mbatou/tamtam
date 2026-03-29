import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabaseAdmin = createServiceClient();

  const { data: currentUser } = await supabaseAdmin
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // 1. BALANCE INTEGRITY — compare wallet_balance vs sum of transactions
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, company_name, role, wallet_balance")
    .gt("wallet_balance", 0)
    .order("wallet_balance", { ascending: false });

  const balanceMismatches = [];

  for (const user of users || []) {
    const { data: transactions } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .eq("user_id", user.id);

    const expectedBalance = (transactions || []).reduce((sum: number, t: { amount: number | null }) => sum + (t.amount || 0), 0);
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
        transactionCount: (transactions || []).length,
      });
    }
  }

  // 2. CAMPAIGN BUDGET RECONCILIATION
  const { data: campaigns } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, budget, spent, cpc, status, moderation_status, user_id");

  const campaignIssues = [];

  for (const campaign of campaigns || []) {
    const { data: links } = await supabaseAdmin
      .from("tracked_links")
      .select("id")
      .eq("campaign_id", campaign.id);

    const linkIds = (links || []).map((l: { id: string }) => l.id);

    let validClicks = 0;
    if (linkIds.length > 0) {
      const { count } = await supabaseAdmin
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .eq("is_valid", true)
        .in("link_id", linkIds);
      validClicks = count || 0;
    }

    const expectedSpent = validClicks * campaign.cpc;
    const actualSpent = campaign.spent || 0;
    const diff = Math.round(actualSpent - expectedSpent);

    const { count: debitCount } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*", { count: "exact", head: true })
      .eq("source_id", campaign.id)
      .eq("type", "campaign_budget_debit");

    const { count: refundCount } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*", { count: "exact", head: true })
      .eq("source_id", campaign.id)
      .eq("type", "campaign_budget_refund");

    const hasIssue = Math.abs(diff) > 1 || (debitCount || 0) > 1 || (refundCount || 0) > 1 ||
      (campaign.status === "draft" && (debitCount || 0) > 0);

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
        debitCount: debitCount || 0,
        refundCount: refundCount || 0,
        issue: (debitCount || 0) > 1 ? "DUPLICATE_DEBIT" :
               (refundCount || 0) > 1 ? "DUPLICATE_REFUND" :
               campaign.status === "draft" && (debitCount || 0) > 0 ? "DRAFT_DEBITED" :
               Math.abs(diff) > 1 ? "SPEND_MISMATCH" : "UNKNOWN",
      });
    }
  }

  // 3. REFUND AUDIT
  const { data: allRefunds } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id, user_id, amount, source_id, type, description, created_at")
    .eq("type", "campaign_budget_refund")
    .order("created_at", { ascending: false });

  const refundAudit = [];
  const seenCampaigns = new Set();

  for (const refund of allRefunds || []) {
    const isDuplicate = seenCampaigns.has(refund.source_id);
    seenCampaigns.add(refund.source_id);

    // Look for any negative transaction with same source_id (debit may have different type)
    const { count: matchingDebit } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*", { count: "exact", head: true })
      .eq("source_id", refund.source_id)
      .lt("amount", 0);

    refundAudit.push({
      ...refund,
      isDuplicate,
      hasMatchingDebit: (matchingDebit || 0) > 0,
      issue: isDuplicate ? "DUPLICATE" : (matchingDebit || 0) === 0 ? "ORPHAN" : null,
    });
  }

  // 4. PLATFORM P&L
  const { data: moneyIn } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount, type")
    .in("type", ["wallet_recharge", "welcome_bonus", "payment"]);

  const totalMoneyIn = (moneyIn || []).reduce((sum: number, t: { amount: number | null }) => sum + Math.abs(t.amount || 0), 0);

  const { data: moneyOut } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount, type")
    .in("type", ["withdrawal", "payout"]);

  const totalMoneyOut = (moneyOut || []).reduce((sum: number, t: { amount: number | null }) => sum + Math.abs(t.amount || 0), 0);

  const { data: allBalances } = await supabaseAdmin
    .from("users")
    .select("wallet_balance, role")
    .not("wallet_balance", "is", null);

  // Use Number() casting to handle potential text/string wallet_balance values
  // Filter as: everything NOT echo = brand-side, echo = echo-side
  const totalBrandBalances = (allBalances || [])
    .filter((u: { role: string }) => u.role !== "echo")
    .reduce((sum: number, u: { wallet_balance: number | string | null }) => sum + (Number(u.wallet_balance) || 0), 0);

  const totalEchoBalances = (allBalances || [])
    .filter((u: { role: string }) => u.role === "echo")
    .reduce((sum: number, u: { wallet_balance: number | string | null }) => sum + (Number(u.wallet_balance) || 0), 0);

  // 5. ADVICE CARDS
  const advice = [];

  if (balanceMismatches.length > 0) {
    advice.push({
      severity: "red",
      title: `${balanceMismatches.length} compte(s) avec des soldes incohérents`,
      detail: `Les transactions ne correspondent pas au solde affiché. Vérifiez manuellement.`,
    });
  }

  const duplicateRefunds = refundAudit.filter(r => r.isDuplicate);
  if (duplicateRefunds.length > 0) {
    const totalDuplicateAmount = duplicateRefunds.reduce((s, r) => s + Math.abs(r.amount), 0);
    advice.push({
      severity: "red",
      title: `${duplicateRefunds.length} remboursement(s) en double détecté(s)`,
      detail: `Montant total en double: ${totalDuplicateAmount.toLocaleString("fr-FR")} FCFA. Ajustement manuel recommandé.`,
    });
  }

  const draftDebited = campaignIssues.filter(c => c.issue === "DRAFT_DEBITED");
  if (draftDebited.length > 0) {
    advice.push({
      severity: "red",
      title: `${draftDebited.length} brouillon(s) avec budget débité`,
      detail: `Des campagnes en brouillon ont été débitées du portefeuille. Bug identifié et corrigé (LUP-95).`,
    });
  }

  if (advice.length === 0) {
    advice.push({
      severity: "green",
      title: "Plateforme saine",
      detail: "Tous les soldes correspondent aux transactions. Aucune anomalie détectée.",
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
