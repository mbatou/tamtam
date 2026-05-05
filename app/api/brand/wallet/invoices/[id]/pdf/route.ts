import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { formatFCFA } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  // Fetch invoice
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("brand_id", brandId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("created_at", { ascending: true });

  // Fetch brand name
  const { data: brand } = await supabase
    .from("users")
    .select("name")
    .eq("id", brandId)
    .single();

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });

  doc.setFontSize(14);
  doc.text(invoice.invoice_number, pageWidth / 2, 35, { align: "center" });

  // Brand info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${brand?.name || "—"}`, 20, 50);
  doc.text(
    `Période: ${new Date(invoice.period_start).toLocaleDateString("fr-FR")} — ${new Date(invoice.period_end).toLocaleDateString("fr-FR")}`,
    20,
    58
  );
  doc.text(`Date d'émission: ${new Date(invoice.created_at).toLocaleDateString("fr-FR")}`, 20, 66);

  // Separator
  doc.setLineWidth(0.5);
  doc.line(20, 72, pageWidth - 20, 72);

  // Table header
  let y = 82;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const colX = [20, 70, 100, 118, 136, 154, 175];
  const headers = ["Campagne", "Objectif", "Clics", "Leads", "CPC", "CPL", "Total"];

  headers.forEach((h, i) => {
    doc.text(h, colX[i], y);
  });

  doc.setLineWidth(0.3);
  y += 3;
  doc.line(20, y, pageWidth - 20, y);
  y += 7;

  // Table rows
  doc.setFont("helvetica", "normal");
  const items = lineItems || [];

  for (const item of items) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    const campaignName = item.campaign_name.length > 22
      ? item.campaign_name.substring(0, 22) + "..."
      : item.campaign_name;

    doc.text(campaignName, colX[0], y);
    doc.text(item.objective || "—", colX[1], y);
    doc.text(String(item.clicks || 0), colX[2], y);
    doc.text(String(item.leads || 0), colX[3], y);
    doc.text(item.cpc_fcfa ? `${item.cpc_fcfa}` : "—", colX[4], y);
    doc.text(item.cpl_fcfa ? `${item.cpl_fcfa}` : "—", colX[5], y);
    doc.text(formatFCFA(item.total_spend_fcfa), colX[6], y);
    y += 8;
  }

  // Summary section
  y += 10;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Récapitulatif", 20, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  const summaryItems = [
    ["Total recharges", formatFCFA(invoice.total_recharges_fcfa)],
    ["Total dépenses", formatFCFA(invoice.total_spend_fcfa)],
    ["Total remboursements", formatFCFA(invoice.total_refunds_fcfa)],
    ["Montant net", formatFCFA(invoice.net_amount_fcfa)],
  ];

  for (const [label, value] of summaryItems) {
    doc.text(`${label}:`, 25, y);
    doc.text(value, 100, y);
    y += 8;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Tamtam — Lupandu SARL — Dakar, Sénégal — tamma.me", pageWidth / 2, footerY, { align: "center" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
    },
  });
}
