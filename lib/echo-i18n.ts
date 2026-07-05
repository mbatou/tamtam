import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

export type EchoLang = "fr" | "en";

const messages: Record<EchoLang, Record<string, unknown>> = { fr, en };

// Same lookup semantics as lib/i18n.tsx: dot-path keys, silent fallback to the raw key.
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === "string" ? current : path;
}

/**
 * Server-side translation lookup over the same messages/*.json catalogs used by
 * lib/i18n.tsx (which is client-only React context). Same {placeholder} syntax.
 */
export function t(
  lang: EchoLang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let value = getNestedValue(messages[lang] || messages.fr, key);
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }
  return value;
}

interface EchoStrings {
  // Push notification strings
  push: {
    newCampaign: {
      title: string;
      body: (cpc: number) => string;
    };
    payout: {
      title: string;
      body: (amount: number) => string;
    };
    streakDanger: {
      title: string;
      body: (days: number) => string;
    };
    streakMilestone: {
      title: string;
      body: (days: number, reward: number) => string;
    };
    custom: {
      defaultTitle: string;
    };
    shareReminder: {
      title: string;
      body: (campaignTitle: string, cpc: number) => string;
    };
    inactivity: {
      title: (amount: number) => string;
      body: string;
    };
    campaignEnding: {
      title: (hoursLeft: number) => string;
      body: (campaignTitle: string) => string;
    };
  };
  // Leaderboard strings
  leaderboard: {
    title: string;
    weekly: string;
    monthly: string;
    rank: string;
    clicks: string;
    campaigns: string;
    yourRank: string;
    notRanked: string;
    foundingEcho: string;
    tier: (tier: string) => string;
  };
}

export function getEchoStrings(lang: EchoLang): EchoStrings {
  const l: EchoLang = lang === "en" ? "en" : "fr";
  return {
    push: {
      newCampaign: {
        title: t(l, "push.newCampaign.title"),
        body: (cpc: number) => t(l, "push.newCampaign.body", { cpc }),
      },
      payout: {
        title: t(l, "push.payout.title"),
        body: (amount: number) => t(l, "push.payout.body", { amount }),
      },
      streakDanger: {
        title: t(l, "push.streakDanger.title"),
        body: (days: number) => t(l, "push.streakDanger.body", { days }),
      },
      streakMilestone: {
        title: t(l, "push.streakMilestone.title"),
        body: (days: number, reward: number) =>
          t(l, "push.streakMilestone.body", { days, reward }),
      },
      custom: {
        defaultTitle: t(l, "push.custom.defaultTitle"),
      },
      shareReminder: {
        title: t(l, "push.shareReminder.title"),
        body: (campaignTitle: string, cpc: number) =>
          t(l, "push.shareReminder.body", { campaignTitle, cpc }),
      },
      inactivity: {
        title: (amount: number) =>
          t(l, "push.inactivity.title", {
            amount: amount.toLocaleString(l === "fr" ? "fr-FR" : "en"),
          }),
        body: t(l, "push.inactivity.body"),
      },
      campaignEnding: {
        title: (hoursLeft: number) => t(l, "push.campaignEnding.title", { hoursLeft }),
        body: (campaignTitle: string) =>
          t(l, "push.campaignEnding.body", { campaignTitle }),
      },
    },
    leaderboard: {
      title: t(l, "leaderboard.title"),
      weekly: t(l, "leaderboard.weekly"),
      monthly: t(l, "leaderboard.monthly"),
      rank: t(l, "leaderboard.rank"),
      clicks: t(l, "leaderboard.clicks"),
      campaigns: t(l, "leaderboard.campaigns"),
      yourRank: t(l, "leaderboard.yourRank"),
      notRanked: t(l, "leaderboard.notRanked"),
      foundingEcho: t(l, "leaderboard.foundingEcho"),
      tier: (tier: string) => {
        const key = `leaderboard.tier.${tier}`;
        const label = t(l, key);
        return label === key ? tier : label;
      },
    },
  };
}
