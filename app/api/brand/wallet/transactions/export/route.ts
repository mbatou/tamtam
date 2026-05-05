import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { formatFCFA } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  wallet_recharge: "Recharge Wave",
  campaign_budget_debit: "Budget campagne",
  campaign_budget_refund: "Remboursement campagne",
  click_earning: "Gains clics",
  lead_earning: "Gains leads",
  manual_credit: "Crédit manuel",
  manual_debit: "Débit manuel",
};

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", brandId);

  if (type) {
    query = query.eq("type", type);
  }
  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = data || [];

  // Build CSV
  const csvHeader = "Date,Type,Description,Montant,Statut,Référence";
  const csvRows = transactions.map((tx) => {
    const date = new Date(tx.created_at).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const typeLabel = TYPE_LABELS[tx.type] || tx.type;
    const description = (tx.description || "").replace(/"/g, '""');
    const amount = formatFCFA(tx.amount);
    const status = tx.status || "completed";
    const reference = tx.source_id || "";

    return `"${date}","${typeLabel}","${description}","${amount}","${status}","${reference}"`;
  });

  const csv = [csvHeader, ...csvRows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${brandId}.csv"`,
    },
  });
}
