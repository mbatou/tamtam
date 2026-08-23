import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = "Tamtam <noreply@tamma.me>";

export async function sendEmail({
  to,
  subject,
  html,
  tags,
}: {
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set — cannot send email to:", to);
    throw new Error("RESEND_API_KEY not configured");
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    tags,
  });

  if (result.error) {
    console.error("Resend API error:", result.error);
    throw new Error(result.error.message || "Email send failed");
  }

  return result;
}

/**
 * Non-throwing version of sendEmail for batch operations.
 * Returns { success, id } or { success: false, error }.
 */
export async function sendEmailSafe(options: {
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
}): Promise<{ success: true; id: string | undefined } | { success: false; error: string }> {
  try {
    const result = await sendEmail(options);
    return { success: true, id: result.data?.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function sendRoleUpgradeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  return sendEmail({
    to,
    subject: "Tamtam — Votre compte a été mis à jour !",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Bonne nouvelle, ${name} !</h2>
        <p>Votre compte Tamtam a été mis à jour. En plus de votre accès Echo, vous avez maintenant accès à l'espace <strong>Batteur (Marque)</strong>.</p>
        <p>Vous pouvez maintenant :</p>
        <ul>
          <li>Créer et gérer des campagnes publicitaires</li>
          <li>Recharger votre portefeuille</li>
          <li>Suivre les performances de vos campagnes</li>
        </ul>
        <p>Connectez-vous avec vos identifiants habituels :</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/login" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Se connecter</a>
        </p>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          Besoin d'aide ? <a href="mailto:support@tamma.me" style="color:#888888;text-decoration:none;">support@tamma.me</a> · <a href="https://wa.me/221762799393" style="color:#25D366;text-decoration:none;">WhatsApp</a>
        </p>
      </div>
    `,
  });
}

export async function sendBatteurWelcomeEmail({
  to,
  temporaryPassword,
  business_name,
}: {
  to: string;
  temporaryPassword: string;
  business_name: string;
}) {
  return sendEmail({
    to,
    subject: "🥁 Bienvenue sur Tamtam — Votre compte Batteur est prêt !",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Bienvenue sur Tamtam, ${business_name} !</h2>
        <p>Votre compte Batteur a été créé. Voici vos identifiants de connexion :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Email</td>
            <td style="padding: 8px;">${to}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Mot de passe temporaire</td>
            <td style="padding: 8px; font-family: monospace; font-size: 16px;">${temporaryPassword}</td>
          </tr>
        </table>
        <p><strong>Changez votre mot de passe</strong> dès votre première connexion.</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/login" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Se connecter</a>
        </p>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          Besoin d'aide ? <a href="mailto:support@tamma.me" style="color:#888888;text-decoration:none;">support@tamma.me</a> · <a href="https://wa.me/221762799393" style="color:#25D366;text-decoration:none;">WhatsApp</a>
        </p>
      </div>
    `,
  });
}

// --- Admin notification emails ---

// --- Engagement emails ---

export function buildCampaignCompletedToEcho({
  echoName,
  campaignTitle,
  clickCount,
  earnings,
}: {
  echoName: string;
  campaignTitle: string;
  clickCount: number;
  earnings: number;
}): { subject: string; html: string } {
  return {
    subject: `🏁 Rythme terminé : ${campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Bravo ${echoName} !</h2>
        <p>Le Rythme <strong>${campaignTitle}</strong> est maintenant terminé.</p>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-weight: bold; color: #16a34a;">Ton bilan</p>
          <table style="margin-top: 8px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">Clics valides</td>
              <td style="padding: 4px 0; font-weight: bold;">${clickCount}</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">Gains</td>
              <td style="padding: 4px 0; font-weight: bold; color: #16a34a;">${earnings} FCFA</td>
            </tr>
          </table>
        </div>
        <p>Tes gains ont été ajoutés à ton solde. Découvre d'autres Rythmes pour continuer à gagner !</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/rythmes" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir les Rythmes</a>
        </p>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
      </div>
    `,
  };
}

export function buildCampaignLiveEmail({
  brandName,
  campaignTitle,
  budget,
  cpc,
}: {
  brandName: string;
  campaignTitle: string;
  budget: number;
  cpc: number;
}): { subject: string; html: string } {
  return {
    subject: `✅ Votre campagne est en ligne : ${campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Bonne nouvelle, ${brandName} !</h2>
        <p>Votre campagne a été approuvée et est maintenant <strong style="color: #22c55e;">en ligne</strong>.</p>
        <div style="background: #fef3e2; border-left: 4px solid #D35400; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-weight: bold; font-size: 16px;">${campaignTitle}</p>
          <table style="margin-top: 8px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">Budget</td>
              <td style="padding: 4px 0; font-weight: bold;">${budget} FCFA</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">CPC</td>
              <td style="padding: 4px 0; font-weight: bold;">${cpc} FCFA</td>
            </tr>
          </table>
        </div>
        <p>Les Echos peuvent maintenant partager votre campagne. Suivez les performances en temps réel :</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/admin/campaigns" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir mes campagnes</a>
        </p>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          Besoin d'aide ? <a href="mailto:support@tamma.me" style="color:#888888;text-decoration:none;">support@tamma.me</a> · <a href="https://wa.me/221762799393" style="color:#25D366;text-decoration:none;">WhatsApp</a>
        </p>
      </div>
    `,
  };
}

/**
 * Campaign rejected — the brand-facing half of moderation.
 *
 * Before the channel policy this event was sent on NO channel at all: a brand
 * whose campaign was refused found out by refreshing the dashboard and seeing
 * a status chip, with the reason nowhere. Email is the only channel that can
 * carry a paragraph of explanation, which is exactly why it belongs here.
 */
export function buildCampaignRejectedEmail({
  brandName,
  campaignTitle,
  reason,
  refunded,
}: {
  brandName: string;
  campaignTitle: string;
  reason: string | null;
  refunded: number;
}): { subject: string; html: string } {
  return {
    subject: `Campagne non validée : ${campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Bonjour ${brandName},</h2>
        <p>Votre campagne <strong>${campaignTitle}</strong> n'a pas été validée par notre équipe.</p>
        ${
          reason
            ? `<div style="background:#fff5f5;border-left:4px solid #e74c3c;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
                 <p style="margin:0;font-weight:bold;color:#c0392b;">Motif</p>
                 <p style="margin:8px 0 0;color:#333;line-height:1.6;">${reason}</p>
               </div>`
            : `<p style="color:#666;">Aucun motif détaillé n'a été renseigné. Contactez-nous et nous vous expliquons.</p>`
        }
        ${
          refunded > 0
            ? `<p>Votre budget de <strong>${refunded.toLocaleString("fr-FR")} FCFA</strong> a été recrédité sur votre portefeuille. Rien n'a été dépensé.</p>`
            : `<p>Aucun budget n'a été débité.</p>`
        }
        <p>Corrigez les points ci-dessus et soumettez à nouveau — la plupart des campagnes repassent du premier coup.</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/admin/campaigns" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Modifier ma campagne</a>
        </p>
      </div>
    `,
  };
}

/**
 * Alert the platform team that a campaign is waiting for approval.
 *
 * Called from EVERY path that leaves a campaign in moderation_status
 * "pending" — direct creation, draft submission, and lead-gen launch.
 * (Draft submissions used to land silently, so campaigns sat unapproved
 * with nobody notified.)
 *
 * Failures are logged, never thrown: a missed alert must not fail the
 * brand's submission.
 */
