import { sendEmailSafe } from "@/lib/email";

// ---------------------------------------------------------------------------
// LUP-113: Lead Notification Service
// Sends email + wa.me deep link when a new verified lead is captured.
// No WhatsApp API — just a wa.me link in the email body.
// ---------------------------------------------------------------------------

interface LeadNotificationInput {
  leadName: string;
  leadPhone: string;
  leadEmail?: string | null;
  campaignTitle: string;
  brandName: string;
  notificationEmail?: string | null;
  notificationPhone?: string | null;
}

/**
 * Notify the brand about a new verified lead via email (with wa.me deep link).
 * Non-blocking — failures are logged but don't propagate.
 */
export async function notifyNewLead(input: LeadNotificationInput): Promise<void> {
  const { leadName, leadPhone, leadEmail, campaignTitle, brandName, notificationEmail, notificationPhone } = input;

  if (!notificationEmail) return;

  // Build wa.me deep link for the lead's phone
  const cleanPhone = leadPhone.replace(/^\+/, "").replace(/\s/g, "");
  const waLink = `https://wa.me/${cleanPhone}`;

  // Build wa.me link for the brand to message the lead
  const whatsappSection = notificationPhone
    ? `<p style="margin-top: 12px; font-size: 13px; color: #666;">
        Vous recevez cette notification sur votre numero: ${notificationPhone}
      </p>`
    : "";

  const result = await sendEmailSafe({
    to: notificationEmail,
    subject: `Nouveau lead: ${leadName} — ${campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Nouveau lead capture!</h2>
        <p>Un nouveau prospect a rempli votre formulaire pour la campagne <strong>${campaignTitle}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Nom</td>
            <td style="padding: 8px;">${leadName}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Telephone</td>
            <td style="padding: 8px;"><a href="tel:${leadPhone}">${leadPhone}</a></td>
          </tr>
          ${leadEmail ? `<tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Email</td>
            <td style="padding: 8px;"><a href="mailto:${leadEmail}">${leadEmail}</a></td>
          </tr>` : ""}
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Campagne</td>
            <td style="padding: 8px;">${campaignTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Date</td>
            <td style="padding: 8px;">${new Date().toLocaleString("fr-SN")}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="${waLink}" style="display: inline-block; padding: 12px 24px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Contacter sur WhatsApp</a>
        </p>
        <p style="margin-top: 12px;">
          <a href="https://www.tamma.me/admin/campaigns" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir mes leads</a>
        </p>
        ${whatsappSection}
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          ${brandName} via Tamtam — <a href="mailto:support@tamma.me" style="color:#888;">support@tamma.me</a>
        </p>
      </div>
    `,
    tags: [{ name: "type", value: "lead_notification" }],
  });

  if (!result.success) {
    console.error(`Lead notification email failed for ${notificationEmail}:`, result.error);
  }
}
