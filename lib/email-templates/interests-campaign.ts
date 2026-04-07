interface TemplateData {
  firstName: string;
  ctaUrl: string;
  deadlineText: string;
}

function wrapEmail(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tamtam</title>
</head>
<body style="margin:0;padding:0;background:#0F0F1F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0F0F1F;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#1A1A2E;border-radius:12px;overflow:hidden;max-width:600px;">
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#00853F;height:4px;width:33.33%"></td>
                  <td style="background:#FDEF42;height:4px;width:33.33%"></td>
                  <td style="background:#E31B23;height:4px;width:33.34%"></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <div style="color:#D35400;font-size:14px;font-weight:bold;letter-spacing:2px;">TAMTAM</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;color:#E5E5EA;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #2A2A3E;color:#8E8E93;font-size:12px;text-align:center;">
              Tamtam &mdash; Lupandu SARL<br>
              Dakar, S&eacute;n&eacute;gal<br>
              <a href="https://tamma.me" style="color:#1ABC9C;text-decoration:none;">tamma.me</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="background:#D35400;border-radius:8px;">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:16px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Template for ACTIVE Échos (seen in last 7 days).
 * Short, friendly nudge.
 */
export function activeEchoTemplate(data: TemplateData): { subject: string; html: string } {
  const subject = "\uD83E\uDD41 100 FCFA t'attendent sur Tamtam";
  const content = `
    <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 16px 0;">Salut ${data.firstName} \uD83D\uDC4B</h1>
    <p style="margin:0 0 16px 0;">On a ajout&eacute; quelque chose de nouveau sur Tamtam : tu peux maintenant choisir tes centres d'int&eacute;r&ecirc;t pour recevoir des campagnes qui te correspondent mieux.</p>
    <p style="margin:0 0 16px 0;">En bonus, tu fais partie des <strong style="color:#D35400;">1 152 premiers &Eacute;chos</strong>, donc on t'offre :</p>
    <ul style="margin:0 0 20px 20px;padding:0;color:#E5E5EA;">
      <li style="margin-bottom:6px;"><strong style="color:#FDEF42;">100 FCFA</strong> cr&eacute;dit&eacute;s instantan&eacute;ment</li>
      <li style="margin-bottom:6px;">Le badge <strong style="color:#FDEF42;">&quot;&Eacute;cho Fondateur&quot;</strong> (exclusif, jamais redonn&eacute;)</li>
    </ul>
    ${ctaButton(data.ctaUrl, "Choisir mes int\u00E9r\u00EAts \u2192")}
    <p style="margin:16px 0 0 0;color:#8E8E93;font-size:13px;"><em>Offre valable ${data.deadlineText}. 2 minutes max.</em></p>
  `;
  return { subject, html: wrapEmail(content, "100 FCFA t'attendent + badge \u00C9cho Fondateur exclusif") };
}

/**
 * Template for SEMI-ACTIVE Échos (8-30 days ago).
 * Medium length, "here's what's new" framing.
 */
export function semiActiveEchoTemplate(data: TemplateData): { subject: string; html: string } {
  const subject = `\u00C9cho Fondateur \u2014 offre limit\u00E9e ${data.deadlineText}`;
  const content = `
    <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 16px 0;">${data.firstName}, on a du nouveau pour toi</h1>
    <p style="margin:0 0 16px 0;">Pendant que tu &eacute;tais absent(e), Tamtam a grandi &mdash; on est pass&eacute;s de quelques centaines &agrave; <strong style="color:#D35400;">plus de 1 150 &Eacute;chos</strong> &agrave; travers le S&eacute;n&eacute;gal.</p>
    <p style="margin:0 0 16px 0;">Et on vient de lancer une nouvelle fonctionnalit&eacute; : les <strong>centres d'int&eacute;r&ecirc;t</strong>. Dis-nous ce que tu aimes (mode, tech, sport, cuisine...) et tu verras en priorit&eacute; les campagnes qui te correspondent.</p>
    <p style="margin:0 0 16px 0;">Parce que tu fais partie des <strong style="color:#D35400;">premiers &Eacute;chos de Tamtam</strong>, on t'offre :</p>
    <ul style="margin:0 0 20px 20px;padding:0;color:#E5E5EA;">
      <li style="margin-bottom:6px;"><strong style="color:#FDEF42;">100 FCFA</strong> cr&eacute;dit&eacute;s sur ton portefeuille</li>
      <li style="margin-bottom:6px;">Le badge <strong style="color:#FDEF42;">&quot;&Eacute;cho Fondateur&quot;</strong> &mdash; exclusif, limit&eacute; aux 1 152 premiers, jamais redonn&eacute;</li>
      <li style="margin-bottom:6px;">Des campagnes qui te ressemblent</li>
    </ul>
    ${ctaButton(data.ctaUrl, "Je compl\u00E8te mes int\u00E9r\u00EAts \u2192")}
    <p style="margin:16px 0 0 0;color:#8E8E93;font-size:13px;"><em>Offre valable ${data.deadlineText}. Apr&egrave;s cette date, le badge ne sera plus disponible.</em></p>
  `;
  return { subject, html: wrapEmail(content, "Tu fais partie des 1152 premiers \u00C9chos \u2014 r\u00E9clame ton badge Fondateur") };
}

/**
 * Template for DORMANT Échos (30+ days).
 * Longer, reactivation framing.
 */
export function dormantEchoTemplate(data: TemplateData): { subject: string; html: string } {
  const subject = `${data.firstName}, on t'a manqu\u00E9 \uD83E\uDD41`;
  const content = `
    <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 16px 0;">${data.firstName}, &ccedil;a fait longtemps</h1>
    <p style="margin:0 0 16px 0;">On a remarqu&eacute; que tu n'es pas pass&eacute;(e) sur Tamtam depuis un moment. Et on voulait te dire ce que tu as rat&eacute;.</p>
    <p style="margin:0 0 16px 0;">En quelques semaines, on est pass&eacute;s de quelques centaines &agrave; <strong style="color:#D35400;">plus de 1 150 &Eacute;chos</strong> dans 40+ villes du S&eacute;n&eacute;gal. Les marques arrivent, les campagnes aussi, et certains &Eacute;chos ont d&eacute;j&agrave; gagn&eacute; plus de 11 000 FCFA.</p>
    <p style="margin:0 0 16px 0;">Aujourd'hui, on lance les <strong>centres d'int&eacute;r&ecirc;t</strong> : dis-nous ce que tu aimes, et on te montre en priorit&eacute; les campagnes qui te correspondent. Mode, tech, cuisine, sport, religion &mdash; choisis ce qui te ressemble.</p>
    <p style="margin:0 0 16px 0;">Et parce que tu fais partie des <strong style="color:#D35400;">1 152 premiers &Eacute;chos</strong>, on te r&eacute;serve :</p>
    <ul style="margin:0 0 20px 20px;padding:0;color:#E5E5EA;">
      <li style="margin-bottom:6px;"><strong style="color:#FDEF42;">100 FCFA</strong> cr&eacute;dit&eacute;s imm&eacute;diatement quand tu termines</li>
      <li style="margin-bottom:6px;">Le badge <strong style="color:#FDEF42;">&quot;&Eacute;cho Fondateur&quot;</strong> &mdash; r&eacute;serv&eacute; aux tout premiers, jamais redistribu&eacute;</li>
      <li style="margin-bottom:6px;">Des campagnes choisies pour toi, pas au hasard</li>
    </ul>
    <p style="margin:0 0 16px 0;">On a grandi parce que des gens comme toi ont cru en Tamtam d&egrave;s le d&eacute;but. Et on ne l'oublie pas.</p>
    ${ctaButton(data.ctaUrl, "Revenir sur Tamtam \u2192")}
    <p style="margin:16px 0 0 0;color:#8E8E93;font-size:13px;"><em>Offre valable ${data.deadlineText}. Apr&egrave;s cette date, l'offre dispara&icirc;t et le badge ne sera plus disponible.</em></p>
  `;
  return { subject, html: wrapEmail(content, "On t'a manqu\u00E9 + 100 FCFA + badge \u00C9cho Fondateur") };
}

/**
 * Reminder template for non-clickers (sent 3 days after initial).
 * Short "last chance" framing.
 */
export function reminderTemplate(data: TemplateData): { subject: string; html: string } {
  const subject = "Derni\u00E8re chance \u2014 ton badge \u00C9cho Fondateur expire bient\u00F4t";
  const content = `
    <h1 style="color:#FFFFFF;font-size:24px;margin:0 0 16px 0;">Rappel rapide, ${data.firstName}</h1>
    <p style="margin:0 0 16px 0;">Il te reste quelques jours pour r&eacute;clamer ton <strong style="color:#FDEF42;">badge &quot;&Eacute;cho Fondateur&quot;</strong> et tes <strong style="color:#FDEF42;">100 FCFA</strong>.</p>
    <p style="margin:0 0 16px 0;">Apr&egrave;s ${data.deadlineText}, le badge dispara&icirc;t pour toujours. Il est r&eacute;serv&eacute; aux 1 152 premiers &Eacute;chos de Tamtam &mdash; et tu en fais partie.</p>
    ${ctaButton(data.ctaUrl, "R\u00E9clamer mon badge maintenant \u2192")}
    <p style="margin:16px 0 0 0;color:#8E8E93;font-size:13px;"><em>2 minutes, c'est tout.</em></p>
  `;
  return { subject, html: wrapEmail(content, "Derni\u00E8re chance pour ton badge \u00C9cho Fondateur") };
}

/**
 * Get the right template based on segment.
 */
export function getTemplateForSegment(
  segment: "active" | "semi_active" | "dormant",
  data: TemplateData
): { subject: string; html: string } {
  switch (segment) {
    case "active":
      return activeEchoTemplate(data);
    case "semi_active":
      return semiActiveEchoTemplate(data);
    case "dormant":
      return dormantEchoTemplate(data);
  }
}
