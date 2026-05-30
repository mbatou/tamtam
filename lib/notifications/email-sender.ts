import { sendEmailSafe } from "@/lib/email";

export async function sendNotificationEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return sendEmailSafe({
    to,
    subject,
    html,
    tags: [{ name: "type", value: "notification" }],
  });
}

export function buildReengagementEmail(
  echoName: string,
  daysSince: number,
  lang: "fr" | "en",
): string {
  if (lang === "en") {
    return `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #0A0A1A; padding: 32px; text-align: center;">
          <img src="https://tamma.me/brand/tamtam-horizontal-orange.png" height="28" alt="Tamtam" />
        </div>
        <div style="padding: 32px; background: #F5F3EE;">
          <h2 style="color: #0A0A1A; font-size: 20px; margin-bottom: 16px;">Hey ${echoName}</h2>
          <p style="color: #333; line-height: 1.6;">Echos in Dakar are earning up to 15,000 FCFA/month &mdash; just by sharing links on their Status.</p>
          <p style="color: #333; line-height: 1.6;">You signed up ${daysSince} days ago but haven't joined a campaign yet.</p>
          <a href="https://tamma.me/rythmes" style="background: #D35400; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px; font-weight: bold;">
            Join your first campaign
          </a>
        </div>
        <div style="padding: 16px; text-align: center; color: #999; font-size: 11px;">
          Tamtam &middot; tamma.me
        </div>
      </div>
    `;
  }
  return `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: #0A0A1A; padding: 32px; text-align: center;">
        <img src="https://tamma.me/brand/tamtam-horizontal-orange.png" height="28" alt="Tamtam" />
      </div>
      <div style="padding: 32px; background: #F5F3EE;">
        <h2 style="color: #0A0A1A; font-size: 20px; margin-bottom: 16px;">H&eacute; ${echoName}</h2>
        <p style="color: #333; line-height: 1.6;">Des &Eacute;chos &agrave; Dakar gagnent jusqu'&agrave; 15 000 FCFA/mois &mdash; juste en partageant des liens sur leur Status.</p>
        <p style="color: #333; line-height: 1.6;">Tu t'es inscrit il y a ${daysSince} jours mais tu n'as pas encore rejoint de campagne.</p>
        <a href="https://tamma.me/rythmes" style="background: #D35400; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px; font-weight: bold;">
          Rejoindre ma premi&egrave;re campagne
        </a>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 11px;">
        Tamtam &middot; tamma.me
      </div>
    </div>
  `;
}

export function buildCustomNotificationEmail(
  echoName: string,
  subject: string,
  body: string,
): string {
  return `
    <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: #0A0A1A; padding: 32px; text-align: center;">
        <img src="https://tamma.me/brand/tamtam-horizontal-orange.png" height="28" alt="Tamtam" />
      </div>
      <div style="padding: 32px; background: #F5F3EE;">
        <h2 style="color: #0A0A1A; font-size: 20px; margin-bottom: 16px;">${subject}</h2>
        <div style="color: #333; line-height: 1.6;">${body.replace("{{name}}", echoName)}</div>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 11px;">
        Tamtam &middot; tamma.me
      </div>
    </div>
  `;
}
