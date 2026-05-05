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
  drawFooter,
} from "@/lib/pdf-branded";

export const dynamic = "force-dynamic";

const TYPE_CONFIG: Record<string, { title: string; label: string }> = {
  wallet_recharge: { title: "Reçu de recharge", label: "Recharge Wave" },
  campaign_budget_debit: { title: "Reçu de paiement", label: "Budget campagne" },
  campaign_budget_refund: { title: "Avis de remboursement", label: "Remboursement campagne" },
  manual_credit: { title: "Reçu de crédit", label: "Crédit manuel" },
  manual_debit: { title: "Reçu de débit", label: "Débit manuel" },
  click_earning: { title: "Reçu", label: "Gains clics" },
  lead_earning: { title: "Reçu", label: "Gains leads" },
  setup_fee: { title: "Reçu de frais", label: "Frais de mise en place" },
};

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

  const { data: transaction, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", brandId)
    .single();

  if (error || !transaction) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  // Fetch brand info
  const { data: brand } = await supabase
    .from("users")
    .select("name")
    .eq("id", brandId)
    .single();

  // Fetch brand email from auth
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  let brandEmail = session.user.email || "";
  if (!brandEmail && authUsers?.[0]) brandEmail = authUsers[0].email || "";

  // If campaign-related, fetch campaign details
  let campaign: { title: string; cpc: number; spent: number; budget: number; created_at: string; status: string } | null = null;
  if (transaction.source_id && transaction.source_type === "campaign") {
    const { data } = await supabase
      .from("campaigns")
      .select("title, cpc, spent, budget, created_at, status")
      .eq("id", transaction.source_id)
      .single();
    campaign = data;
  }

  const config = TYPE_CONFIG[transaction.type] || { title: "Reçu", label: transaction.type };
  const isCredit = transaction.amount >= 0;
  const statusLabel = isCredit ? "Payé" : "Débité";
  const statusColor = isCredit ? ([5, 150, 105] as const) : ([211, 84, 0] as const);

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // 1. Top flag ribbon
  drawFlagRibbon(doc, 0);

  // 2. Header
  drawHeader(doc, config.title, `N° ${transaction.id.slice(0, 8).toUpperCase()}`);

  // 3. Info section
  const dateStr = new Date(transaction.created_at).toLocaleDateString("fr-FR", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const leftFields = [
    { label: "Date", value: dateStr },
    { label: "Méthode de paiement", value: transaction.type === "wallet_recharge" ? "Wave Mobile Money" : "Système Tamtam" },
    { label: "Référence", value: transaction.source_id || "—" },
    { label: "Transaction ID", value: transaction.id },
  ];

  let subtext: string | undefined;
  if (campaign) {
    subtext = `Campagne : ${campaign.title}`;
  } else if (transaction.type === "wallet_recharge") {
    subtext = "Recharge du wallet via Wave";
  }

  let y = drawInfoSection(
    doc,
    leftFields,
    statusLabel,
    formatFCFA(Math.abs(transaction.amount)),
    subtext,
    statusColor,
  );

  // 4. Divider
  y = drawDivider(doc, y + 4);

  // 5. Details section
  if (campaign) {
    y = drawSectionTitle(doc, y, "Détails de la campagne");

    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.text(campaign.title, 20, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(formatFCFA(Math.abs(transaction.amount)), w - 15, y, { align: "right" });
    y += 5;

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    const campaignDate = new Date(campaign.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Créée le ${campaignDate}`, 20, y);
    y += 5;

    if (campaign.cpc) {
      doc.text(`CPC : ${formatFCFA(campaign.cpc)}`, 20, y);
      const clicks = campaign.cpc > 0 ? Math.floor(Math.abs(transaction.amount) / campaign.cpc) : 0;
      if (clicks > 0) {
        doc.text(`${clicks} clic${clicks > 1 ? "s" : ""} × ${formatFCFA(campaign.cpc)} = ${formatFCFA(Math.abs(transaction.amount))}`, 20, y + 4);
        y += 4;
      }
      y += 5;
    }

    doc.text(`Budget total : ${formatFCFA(campaign.budget)} — Dépensé : ${formatFCFA(campaign.spent)}`, 20, y);
    y += 8;
  } else {
    y = drawSectionTitle(doc, y, "Détails");

    doc.setFontSize(11);
    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    const detailTitle = transaction.type === "wallet_recharge" ? "Recharge du wallet" : config.label;
    doc.text(detailTitle, 20, y);
    doc.text(formatFCFA(Math.abs(transaction.amount)), w - 15, y, { align: "right" });
    y += 5;

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    if (transaction.type === "wallet_recharge") {
      doc.text("Via Wave Mobile Money", 20, y);
    } else if (transaction.description) {
      doc.text(transaction.description, 20, y);
    }
    y += 10;
  }

  // 6. Summary box
  y = drawDivider(doc, y);

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(w - 90, y, 75, 30, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Sous-total :", w - 87, y + 8);
  doc.text(formatFCFA(Math.abs(transaction.amount)), w - 18, y + 8, { align: "right" });
  doc.text("Frais :", w - 87, y + 16);
  doc.text("0 FCFA", w - 18, y + 16, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 26);
  doc.text("Total :", w - 87, y + 24);
  doc.text(formatFCFA(Math.abs(transaction.amount)), w - 18, y + 24, { align: "right" });

  // 7. Footer
  drawFooter(doc, brand?.name, brandEmail, brandId);

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${transaction.id.slice(0, 8)}.pdf"`,
    },
  });
}
