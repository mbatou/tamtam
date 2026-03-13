import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = "Tamtam <noreply@tamma.me>";
const SUPPORT_EMAIL = "support@tamma.me";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

export async function sendLeadNotification({
  business_name,
  contact_name,
  email,
  whatsapp,
  message,
}: {
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp?: string | null;
  message?: string | null;
}) {
  const whatsappLink = whatsapp
    ? `<a href="https://wa.me/221${whatsapp.replace(/\s/g, '')}">${whatsapp}</a>`
    : "Non fourni";

  return sendEmail({
    to: SUPPORT_EMAIL,
    subject: `🥁 Nouveau Batteur intéressé: ${business_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Nouveau lead Batteur!</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Entreprise</td>
            <td style="padding: 8px;">${business_name}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Contact</td>
            <td style="padding: 8px;">${contact_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Email</td>
            <td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">WhatsApp</td>
            <td style="padding: 8px;">${whatsappLink}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Message</td>
            <td style="padding: 8px;">${message || "Aucun message"}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Date</td>
            <td style="padding: 8px;">${new Date().toLocaleString("fr-SN")}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          Réponds dans les 24h. Accède au lead dans le
          <a href="https://www.tamma.me/superadmin">dashboard superadmin</a>.
        </p>
      </div>
    `,
  });
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
          Besoin d'aide ? Contactez-nous à support@tamma.me
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
          Besoin d'aide ? Contactez-nous à support@tamma.me
        </p>
      </div>
    `,
  });
}
