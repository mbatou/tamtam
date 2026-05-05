import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch line items for each invoice
  const invoiceIds = (invoices || []).map((inv) => inv.id);

  let lineItems: Record<string, unknown[]> = {};
  if (invoiceIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("invoice_line_items")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("created_at", { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Group line items by invoice_id
    lineItems = (items || []).reduce((acc, item) => {
      if (!acc[item.invoice_id]) {
        acc[item.invoice_id] = [];
      }
      acc[item.invoice_id].push(item);
      return acc;
    }, {} as Record<string, unknown[]>);
  }

  const result = (invoices || []).map((invoice) => ({
    ...invoice,
    line_items: lineItems[invoice.id] || [],
  }));

  return NextResponse.json(result);
}
