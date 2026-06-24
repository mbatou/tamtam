export type SmsType =
  | "new_campaign"
  | "payout"
  | "share_reminder"
  | "reengagement"
  | "streak_danger"
  | "campaign_ending"
  | "welcome"
  | "custom";

interface TemplateVars {
  firstName: string;
  city?: string | null;
  cpc?: number;
  amount?: number;
  hoursLeft?: number;
  customMessage?: string;
}

function stripAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'");
}

export function buildSmsMessage(type: SmsType, vars: TemplateVars): string {
  const { firstName, city, cpc, amount, hoursLeft, customMessage } = vars;
  const cityPart = city && city !== "null" ? ` a ${city}` : "";

  let msg = "";

  switch (type) {
    case "new_campaign":
      msg = `TamTam: Salut ${firstName}! Nouvelle campagne disponible${cityPart}. ${cpc || 50} FCFA par clic verifie sur Wave. Rejoins -> tamma.me/echo/rythmes STOP 36180`;
      break;
    case "payout":
      msg = `TamTam: ${firstName}, ${amount?.toLocaleString("fr-FR")} FCFA viennent d'etre envoyes sur ton Wave! Continue a partager -> tamma.me/echo`;
      break;
    case "share_reminder":
      msg = `TamTam: ${firstName}, t'as rejoint une campagne mais pas encore partage. Chaque clic = ${cpc || 50} FCFA sur Wave. Lance-toi -> tamma.me/echo STOP 36180`;
      break;
    case "reengagement":
      msg = `TamTam: Salut ${firstName}! Tu avais bien commence sur Tamtam. Une campagne t'attend${cityPart}. Reprends -> tamma.me/echo/rythmes STOP 36180`;
      break;
    case "streak_danger":
      msg = `TamTam: Salut ${firstName}! Ta serie est en danger. Partage aujourd'hui pour garder ton streak et tes bonus -> tamma.me/echo STOP 36180`;
      break;
    case "campaign_ending":
      msg = `TamTam: ${firstName}, plus que ${hoursLeft || 24}h sur ta campagne! Partage un max avant la fin. Chaque clic compte -> tamma.me/echo STOP 36180`;
      break;
    case "welcome":
      msg = `TamTam: Bienvenue ${firstName}! Gagne de l'argent en partageant des liens sur ton Status. Premiere campagne -> tamma.me/echo/rythmes STOP 36180`;
      break;
    case "custom":
      msg = (customMessage || "")
        .replace("{{firstName}}", firstName)
        .replace("{{city}}", city || "");
      break;
  }

  return stripAccents(msg);
}
