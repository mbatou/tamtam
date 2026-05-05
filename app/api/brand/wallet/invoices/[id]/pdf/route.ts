import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";
import { formatFCFA } from "@/lib/utils";
import {
  drawFlagRibbon,
  drawHeader,
  drawInfoSection,
  drawDivider,
  drawSectionTitle,
  drawSummaryBox,
  drawFooter,
} from "@/lib/pdf-branded";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("brand_id", brandId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("created_at", { ascending: true });

  const { data: brand } = await supabase
    .from("users")
    .select("name")
    .eq("id", brandId)
    .single();

  const brandEmail = session.user.email || "";

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // 1. Top flag ribbon
  drawFlagRibbon(doc, 0);

  // 2. Header
  drawHeader(doc, "Facture", invoice.invoice_number);

  // 3. Info section
  const periodStart = new Date(invoice.period_start).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const periodEnd = new Date(invoice.period_end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const emissionDate = new Date(invoice.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const leftFields = [
    { label: "Période", value: `Du ${periodStart} au ${periodEnd}` },
    { label: "Date d'émission", value: emissionDate },
    { label: "Client", value: brand?.name || "—" },
    { label: "Numéro de facture", value: invoice.invoice_number },
  ];

  let y = drawInfoSection(
    doc,
    leftFields,
    invoice.status === "final" ? "Finalisée" : "Brouillon",
    formatFCFA(invoice.net_amount_fcfa),
    `${invoice.campaign_count} campagne${invoice.campaign_count !== 1 ? "s" : ""} — ${invoice.click_count} clics`,
  );

  // 4. Divider
  y = drawDivider(doc, y + 4);

  // 5. Campaign table
  const items = lineItems || [];
  if (items.length > 0) {
    y = drawSectionTitle(doc, y, "Détails par campagne");

    // Table header
    const colX = { name: 15, obj: 75, clicks: 105, leads: 122, cpc: 137, cpl: 155, total: 173 };

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("CAMPAGNE", colX.name, y);
    doc.text("OBJECTIF", colX.obj, y);
    doc.text("CLICS", colX.clicks, y);
    doc.text("LEADS", colX.leads, y);
    doc.text("CPC", colX.cpc, y);
    doc.text("CPL", colX.cpl, y);
    doc.text("TOTAL", colX.total, y);
    y += 2;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(15, y, w - 15, y);
    y += 5;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (const item of items) {
      if (y > 230) {
        drawFooter(doc, brand?.name, brandEmail, brandId);
        doc.addPage();
        drawFlagRibbon(doc, 0);
        y = 10;
      }

      doc.setTextColor(26, 26, 26);
      const name = item.campaign_name.length > 25
        ? item.campaign_name.substring(0, 25) + "..."
        : item.campaign_name;
      doc.text(name, colX.name, y);

      doc.setTextColor(107, 114, 128);
      const objLabels: Record<string, string> = { traffic: "Trafic", awareness: "Visibilité", lead_generation: "Leads" };
      doc.text(objLabels[item.objective] || item.objective || "—", colX.obj, y);
      doc.text(String(item.clicks || 0), colX.clicks, y);
      doc.text(String(item.leads || 0), colX.leads, y);
      doc.text(item.cpc_fcfa ? formatFCFA(item.cpc_fcfa) : "—", colX.cpc, y);
      doc.text(item.cpl_fcfa ? formatFCFA(item.cpl_fcfa) : "—", colX.cpl, y);

      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.text(formatFCFA(item.total_spend_fcfa), colX.total, y);
      doc.setFont("helvetica", "normal");

      y += 7;

      // Period sub-row
      if (item.period) {
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(item.period, colX.name + 3, y);
        y += 5;
        doc.setFontSize(8);
      }

      // Dotted separator between items
      doc.setDrawColor(229, 231, 235);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(15, y, w - 15, y);
      doc.setLineDashPattern([], 0);
      y += 4;
    }
  } else {
    y = drawSectionTitle(doc, y, "Détails");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Aucune ligne de facturation pour cette période.", 20, y);
    y += 10;
  }

  // 6. Summary box
  y += 4;
  y = drawSummaryBox(doc, y, [
    { label: "Total recharges", value: formatFCFA(invoice.total_recharges_fcfa) },
    { label: "Total dépenses", value: formatFCFA(invoice.total_spend_fcfa) },
    { label: "Remboursements", value: formatFCFA(invoice.total_refunds_fcfa) },
    { label: "Montant net", value: formatFCFA(invoice.net_amount_fcfa), bold: true },
  ]);

  // 7. Footer
  drawFooter(doc, brand?.name, brandEmail, brandId);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
    },
  });
}
