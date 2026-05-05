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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { data: transaction, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", brandId)
    .single();

  if (error || !transaction) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Reçu de paiement — Tamtam", pageWidth / 2, 30, { align: "center" });

  // Separator
  doc.setLineWidth(0.5);
  doc.line(20, 38, pageWidth - 20, 38);

  // Transaction details
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  let y = 55;
  const lineHeight = 10;

  const details = [
    ["Transaction ID", transaction.id],
    ["Date", new Date(transaction.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })],
    ["Montant", formatFCFA(Math.abs(transaction.amount))],
    ["Type", TYPE_LABELS[transaction.type] || transaction.type],
    ["Description", transaction.description || "—"],
    ["Référence", transaction.source_id || "—"],
    ["Statut", transaction.status || "completed"],
  ];

  for (const [label, value] of details) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 25, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 75, y);
    y += lineHeight;
  }

  // Footer
  doc.setLineWidth(0.3);
  doc.line(20, 260, pageWidth - 20, 260);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Tamtam — Lupandu SARL — Dakar, Sénégal — tamma.me", pageWidth / 2, 270, { align: "center" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${transaction.id}.pdf"`,
    },
  });
}
