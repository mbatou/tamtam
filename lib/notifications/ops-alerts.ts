import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOpsEmail } from "./email-router";

/**
 * Alerts to the platform team.
 *
 * These are the emails whose absence stops the business: a campaign nobody
 * approves, a recharge nobody releases, a payout nobody processes, a lead
 * nobody calls. They have no recipient user row, are never suppressible, and
 * every send/failure lands in `sent_emails` — so "I stopped getting the
 * approval emails" becomes a query instead of a guess.
 */

const SUPPORT_EMAIL = "support@tamma.me";

function opsRecipient(): string {
  return process.env.ADMIN_ALERT_EMAIL || SUPPORT_EMAIL;
}

function row(label: string, value: string, shaded = false): string {
  return `<tr${shaded ? ' style="background: #f9f9f9;"' : ""}>
    <td style="padding: 8px; font-weight: bold; color: #666;">${label}</td>
    <td style="padding: 8px;">${value}</td>
  </tr>`;
}

function shell(heading: string, intro: string, rows: string, cta: { href: string; label: string }): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #D35400;">${heading}</h2>
      <p>${intro}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${rows}</table>
      <p style="margin-top: 20px;">
        <a href="${cta.href}" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">${cta.label}</a>
      </p>
    </div>`;
}

export async function alertRechargeRequest(opts: {
  brandName: string;
  amount: number;
  paymentMethod: string;
  refCommand: string;
}): Promise<void> {
  await sendOpsEmail(createServiceClient(), {
    event: "recharge_request",
    to: opsRecipient(),
    subject: `💰 Demande de recharge : ${opts.amount.toLocaleString("fr-FR")} FCFA — ${opts.brandName}`,
    html: shell(
      "Nouvelle demande de recharge",
      "Un batteur vient de soumettre une demande de recharge Wave. Vérifie le paiement sur le dashboard Wave puis valide dans le backoffice.",
      row("Batteur", opts.brandName) +
        row("Montant", `<strong style="font-size:18px;color:#D35400;">${opts.amount.toLocaleString("fr-FR")} FCFA</strong>`, true) +
        row("Méthode", opts.paymentMethod) +
        row("Référence", `<code style="font-size:12px;">${opts.refCommand}</code>`, true) +
        row("Date", new Date().toLocaleString("fr-SN")),
      { href: "https://www.tamma.me/superadmin/finance", label: "Voir les recharges" },
    ),
  });
}

export async function alertPayoutRequest(opts: {
  echoName: string;
  echoPhone: string;
  amount: number;
  provider: string;
}): Promise<void> {
  await sendOpsEmail(createServiceClient(), {
    event: "payout_request",
    to: opsRecipient(),
    subject: `🏧 Demande de retrait : ${opts.amount.toLocaleString("fr-FR")} FCFA — ${opts.echoName}`,
    html: shell(
      "Nouvelle demande de retrait",
      "Un Écho vient de demander un retrait de ses gains. Traite cette demande dans le backoffice.",
      row("Écho", opts.echoName) +
        row("Téléphone", opts.echoPhone, true) +
        row("Montant", `<strong style="font-size:18px;color:#D35400;">${opts.amount.toLocaleString("fr-FR")} FCFA</strong>`) +
        row("Fournisseur", opts.provider === "wave" ? "Wave" : "Orange Money", true) +
        row("Date", new Date().toLocaleString("fr-SN")),
      { href: "https://www.tamma.me/superadmin/finance", label: "Voir les demandes" },
    ),
  });
}

export async function alertBatteurLeadReceived(opts: {
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp?: string | null;
  message?: string | null;
}): Promise<void> {
  const whatsappLink = opts.whatsapp
    ? `<a href="https://wa.me/221${opts.whatsapp.replace(/\s/g, "")}">${opts.whatsapp}</a>`
    : "Non fourni";

  await sendOpsEmail(createServiceClient(), {
    event: "batteur_lead_received",
    to: SUPPORT_EMAIL,
    subject: `🥁 Nouveau Batteur intéressé: ${opts.business_name}`,
    html: shell(
      "Nouveau lead Batteur",
      "Réponds dans les 24h.",
      row("Entreprise", opts.business_name) +
        row("Contact", opts.contact_name, true) +
        row("Email", `<a href="mailto:${opts.email}">${opts.email}</a>`) +
        row("WhatsApp", whatsappLink, true) +
        row("Message", opts.message || "Aucun message") +
        row("Date", new Date().toLocaleString("fr-SN"), true),
      { href: "https://www.tamma.me/superadmin", label: "Voir le lead" },
    ),
  });
}

/**
 * A campaign is waiting for approval.
 *
 * Fires from EVERY path that leaves a campaign in moderation_status "pending" —
 * direct creation, draft submission, lead-gen launch. Draft submissions used to
 * send nothing at all, which is how campaigns sat unapproved with nobody
 * notified.
 */
export async function alertCampaignPendingApproval(opts: {
  campaignTitle: string;
  brandName: string | null;
  budget: number;
  pricingLabel: string;
  pricingAmount: number | null;
  source: "creation" | "submission" | "lead_gen";
  campaignId?: string | null;
}): Promise<void> {
  const sourceLabel =
    opts.source === "submission"
      ? "Soumise depuis un brouillon"
      : opts.source === "lead_gen"
        ? "Campagne lead generation"
        : "Nouvelle création";

  await sendOpsEmail(createServiceClient(), {
    event: "campaign_pending_approval",
    to: opsRecipient(),
    campaignId: opts.campaignId ?? null,
    subject: `Nouvelle campagne à valider: ${opts.campaignTitle}`,
    html: shell(
      "Nouvelle campagne à valider",
      sourceLabel,
      row("Marque", opts.brandName || "—") +
        row("Campagne", opts.campaignTitle, true) +
        row("Budget", `<strong>${opts.budget.toLocaleString("fr-FR")} FCFA</strong>`) +
        (opts.pricingAmount !== null
          ? row(opts.pricingLabel, `${opts.pricingAmount.toLocaleString("fr-FR")} FCFA`, true)
          : ""),
      { href: "https://www.tamma.me/superadmin/campaigns", label: "Valider maintenant →" },
    ),
  });
}

/**
 * An Écho's withdrawal bounced.
 *
 * Wave returned the payout, the funds went back on their balance, and until
 * now nobody was told — not the Écho, not ops. A failed payout was
 * indistinguishable from a slow one, so the only way to find them was the
 * reconciliation dashboard.
 */
export async function alertPayoutFailed(opts: {
  echoName: string;
  echoPhone: string | null;
  amount: number;
  reason: string | null;
  payoutId: string;
}): Promise<void> {
  await sendOpsEmail(createServiceClient(), {
    event: "payout_failed_admin",
    to: opsRecipient(),
    subject: `⚠️ Retrait échoué : ${opts.amount.toLocaleString("fr-FR")} FCFA — ${opts.echoName}`,
    html: shell(
      "Un retrait a échoué",
      "Wave a rejeté ce paiement. Le montant a été recrédité sur le solde de l'Écho — vérifiez le numéro puis relancez.",
      row("Écho", opts.echoName) +
        row("Téléphone", opts.echoPhone || "—", true) +
        row("Montant", `<strong style="font-size:18px;color:#e74c3c;">${opts.amount.toLocaleString("fr-FR")} FCFA</strong>`) +
        row("Motif Wave", opts.reason || "Non précisé", true) +
        row("Référence", `<code style="font-size:12px;">${opts.payoutId}</code>`),
      { href: "https://www.tamma.me/superadmin/wave-reconciliation", label: "Voir les retraits" },
    ),
  });
}

/**
 * A lead-generation campaign is waiting for approval.
 *
 * Delegates to the shared pending-approval alert so lead-gen campaigns cannot
 * drift onto a different template with a different recipient — which is
 * exactly what had happened: the two landing-page paths hardcoded
 * support@tamma.me and ignored ADMIN_ALERT_EMAIL entirely, so setting that
 * variable silently stopped delivering half the approval alerts.
 */
export async function alertLeadGenPendingApproval(opts: {
  campaignTitle: string;
  brandName: string | null;
  budget: number;
  costPerLead: number | null;
  campaignId?: string | null;
}): Promise<void> {
  await alertCampaignPendingApproval({
    campaignTitle: opts.campaignTitle,
    brandName: opts.brandName,
    budget: opts.budget,
    pricingLabel: "Coût par lead",
    pricingAmount: opts.costPerLead,
    source: "lead_gen",
    campaignId: opts.campaignId,
  });
}
