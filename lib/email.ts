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
    console.error("RESEND_API_KEY not set — cannot send email to:", to);
    throw new Error("RESEND_API_KEY not configured");
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (result.error) {
    console.error("Resend API error:", result.error);
    throw new Error(result.error.message || "Email send failed");
  }

  return result;
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

// --- Admin notification emails ---

export async function sendRechargeRequestNotification({
  brandName,
  amount,
  paymentMethod,
  refCommand,
}: {
  brandName: string;
  amount: number;
  paymentMethod: string;
  refCommand: string;
}) {
  return sendEmail({
    to: SUPPORT_EMAIL,
    subject: `💰 Demande de recharge : ${amount} FCFA — ${brandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Nouvelle demande de recharge</h2>
        <p>Un batteur vient de soumettre une demande de recharge Wave.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Batteur</td>
            <td style="padding: 8px;">${brandName}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Montant</td>
            <td style="padding: 8px; font-weight: bold; font-size: 18px; color: #D35400;">${amount} FCFA</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Methode</td>
            <td style="padding: 8px;">${paymentMethod}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Reference</td>
            <td style="padding: 8px; font-family: monospace; font-size: 12px;">${refCommand}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Date</td>
            <td style="padding: 8px;">${new Date().toLocaleString("fr-SN")}</td>
          </tr>
        </table>
        <p>Verifie le paiement sur le dashboard Wave puis valide dans le backoffice :</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/superadmin/finance" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir les recharges</a>
        </p>
      </div>
    `,
  });
}

export async function sendPayoutRequestNotification({
  echoName,
  echoPhone,
  amount,
  provider,
}: {
  echoName: string;
  echoPhone: string;
  amount: number;
  provider: string;
}) {
  return sendEmail({
    to: SUPPORT_EMAIL,
    subject: `🏧 Demande de retrait : ${amount} FCFA — ${echoName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Nouvelle demande de retrait</h2>
        <p>Un echo vient de demander un retrait de ses gains.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Echo</td>
            <td style="padding: 8px;">${echoName}</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Telephone</td>
            <td style="padding: 8px;">${echoPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Montant</td>
            <td style="padding: 8px; font-weight: bold; font-size: 18px; color: #D35400;">${amount} FCFA</td>
          </tr>
          <tr style="background: #f9f9f9;">
            <td style="padding: 8px; font-weight: bold; color: #666;">Fournisseur</td>
            <td style="padding: 8px;">${provider === "wave" ? "Wave" : "Orange Money"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #666;">Date</td>
            <td style="padding: 8px;">${new Date().toLocaleString("fr-SN")}</td>
          </tr>
        </table>
        <p>Traite cette demande dans le backoffice :</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/superadmin/finance" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir les demandes</a>
        </p>
      </div>
    `,
  });
}

// --- Engagement emails ---

export async function sendNewCampaignNotification({
  to,
  echoName,
  campaignTitle,
  cpc,
}: {
  to: string;
  echoName: string;
  campaignTitle: string;
  cpc: number;
}) {
  return sendEmail({
    to,
    subject: `🎵 Nouveau Rythme disponible : ${campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #D35400;">Salut ${echoName} !</h2>
        <p>Un nouveau Rythme vient d'être lancé sur Tamtam et attend tes partages.</p>
        <div style="background: #fef3e2; border-left: 4px solid #D35400; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-weight: bold; font-size: 16px;">${campaignTitle}</p>
          <p style="margin: 8px 0 0; color: #666;">Gagne <strong style="color: #D35400;">${cpc} FCFA</strong> par clic valide</p>
        </div>
        <p>Connecte-toi pour générer ton lien de partage et commencer à gagner :</p>
        <p style="margin-top: 20px;">
          <a href="https://www.tamma.me/rythmes" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir les Rythmes</a>
        </p>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          Tu reçois cet email car tu es Echo sur Tamtam. Besoin d'aide ? support@tamma.me
        </p>
      </div>
    `,
  });
}

export async function sendCampaignCompletedToEcho({
  to,
  echoName,
  campaignTitle,
  clickCount,
  earnings,
}: {
  to: string;
  echoName: string;
  campaignTitle: string;
  clickCount: number;
  earnings: number;
}) {
  return sendEmail({
    to,
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
          Tu reçois cet email car tu as participé à ce Rythme sur Tamtam.
        </p>
      </div>
    `,
  });
}

export async function sendCampaignLiveToBrand({
  to,
  brandName,
  campaignTitle,
  budget,
  cpc,
}: {
  to: string;
  brandName: string;
  campaignTitle: string;
  budget: number;
  cpc: number;
}) {
  return sendEmail({
    to,
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
          Besoin d'aide ? Contactez-nous à support@tamma.me
        </p>
      </div>
    `,
  });
}
