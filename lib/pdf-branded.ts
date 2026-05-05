import fs from "fs";
import path from "path";
import type { jsPDF } from "jspdf";

const COLORS = {
  navy: [10, 10, 26] as const,
  orange: [211, 84, 0] as const,
  textPrimary: [26, 26, 26] as const,
  textSecondary: [107, 114, 128] as const,
  border: [229, 231, 235] as const,
  statusGreen: [5, 150, 105] as const,
  white: [255, 255, 255] as const,
  bgLight: [249, 250, 251] as const,
  flagGreen: [0, 133, 63] as const,
  flagYellow: [253, 239, 66] as const,
  flagRed: [227, 27, 35] as const,
};

let cachedLogo: string | null = null;

function getLogoBase64(): string | null {
  if (cachedLogo) return cachedLogo;
  try {
    const logoPath = path.join(process.cwd(), "public", "brand", "tamtam-horizontal-orange.png");
    const buf = fs.readFileSync(logoPath);
    cachedLogo = `data:image/png;base64,${buf.toString("base64")}`;
    return cachedLogo;
  } catch {
    return null;
  }
}

export function drawFlagRibbon(doc: jsPDF, y: number) {
  const w = doc.internal.pageSize.getWidth();
  const third = w / 3;
  const h = 1.5;
  doc.setFillColor(...COLORS.flagGreen);
  doc.rect(0, y, third, h, "F");
  doc.setFillColor(...COLORS.flagYellow);
  doc.rect(third, y, third, h, "F");
  doc.setFillColor(...COLORS.flagRed);
  doc.rect(third * 2, y, third + 1, h, "F");
}

export function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();
  const headerH = 28;
  const headerY = 1.5;

  // Dark navy header bar
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, headerY, w, headerH, "F");

  // Logo
  const logo = getLogoBase64();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 15, headerY + 5, 50, 18);
    } catch {
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.orange);
      doc.setFont("helvetica", "bold");
      doc.text("TAMTAM", 15, headerY + 18);
    }
  } else {
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.orange);
    doc.setFont("helvetica", "bold");
    doc.text("TAMTAM", 15, headerY + 18);
  }

  // Right side: title + subtitle
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(title, w - 15, headerY + 13, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, w - 15, headerY + 20, { align: "right" });
}

export function drawInfoSection(
  doc: jsPDF,
  leftFields: { label: string; value: string }[],
  rightStatus: string,
  rightAmount: string,
  rightSubtext?: string,
  statusColor: readonly [number, number, number] = COLORS.statusGreen,
) {
  const w = doc.internal.pageSize.getWidth();
  let y = 42;

  // Left column
  for (const field of leftFields) {
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont("helvetica", "bold");
    doc.text(field.label.toUpperCase(), 15, y);
    y += 4.5;
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont("helvetica", "normal");
    doc.text(field.value, 15, y);
    y += 7;
  }

  // Right column — status badge
  const badgeW = 24;
  const badgeH = 8;
  const badgeX = w - 15 - badgeW;
  const badgeY = 40;
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(rightStatus, badgeX + badgeW / 2, badgeY + 5.5, { align: "center" });

  // Amount
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(rightAmount, w - 15, badgeY + 20, { align: "right" });

  // Subtext
  if (rightSubtext) {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(rightSubtext, w - 15, badgeY + 27, { align: "right" });
  }

  return Math.max(y, badgeY + 30);
}

export function drawDivider(doc: jsPDF, y: number) {
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, y, w - 15, y);
  return y + 6;
}

export function drawSectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFillColor(...COLORS.orange);
  doc.rect(15, y - 4, 1.5, 6, "F");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, y);
  return y + 8;
}

export function drawSummaryBox(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; bold?: boolean }[],
) {
  const w = doc.internal.pageSize.getWidth();
  const boxH = items.length * 8 + 8;

  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(w - 90, y, 75, boxH, 2, 2, "F");

  let itemY = y + 7;
  for (const item of items) {
    doc.setFontSize(9);
    doc.setFont("helvetica", item.bold ? "bold" : "normal");
    doc.setTextColor(item.bold ? COLORS.textPrimary[0] : COLORS.textSecondary[0], item.bold ? COLORS.textPrimary[1] : COLORS.textSecondary[1], item.bold ? COLORS.textPrimary[2] : COLORS.textSecondary[2]);
    doc.text(item.label, w - 87, itemY);
    doc.text(item.value, w - 18, itemY, { align: "right" });
    itemY += 8;
  }

  return y + boxH + 6;
}

export function drawFooter(
  doc: jsPDF,
  brandName?: string,
  brandEmail?: string,
  brandId?: string,
) {
  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Bottom flag ribbon
  drawFlagRibbon(doc, pageH - 1.5);

  // Divider above footer
  const footerTop = pageH - 38;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, footerTop, w - 15, footerTop);

  // Left: company info
  const y = footerTop + 6;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textSecondary);
  doc.setFont("helvetica", "bold");
  doc.text("Tamtam — Lupandu SARL", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text("Dakar, Sénégal", 15, y + 4);
  doc.text("tamma.me", 15, y + 8);
  doc.text("support@tamma.me", 15, y + 12);

  // Right: client info
  if (brandName) {
    doc.setFont("helvetica", "bold");
    doc.text(`Client : ${brandName}`, w - 15, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    if (brandEmail) doc.text(`Email : ${brandEmail}`, w - 15, y + 4, { align: "right" });
    if (brandId) doc.text(`Compte : ${brandId.slice(0, 8)}`, w - 15, y + 8, { align: "right" });
  }

  // Bottom center disclaimer
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Ce document est généré automatiquement par Tamtam et fait office de reçu de paiement.",
    w / 2,
    pageH - 5,
    { align: "center" },
  );
}
