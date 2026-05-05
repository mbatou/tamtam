import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

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
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("wallet_transactions")
    .select("*", { count: "exact" })
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

  const start = (page - 1) * limit;
  const end = start + limit - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count || 0;
  const pages = Math.ceil(total / limit);

  const transactions = (data || []).map((tx) => ({
    ...tx,
    type_label: TYPE_LABELS[tx.type] || tx.type,
  }));

  return NextResponse.json({ transactions, total, page, pages });
}
