export type EchoLang = "fr" | "en";

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

const strings: Record<EchoLang, EchoStrings> = {
  fr: {
    push: {
      newCampaign: {
        title: "Nouvelle campagne disponible !",
        body: (cpc: number) => `Une nouvelle campagne est disponible à ${cpc} FCFA/clic. Ouvre l'app pour participer.`,
      },
      payout: {
        title: "Paiement envoyé !",
        body: (amount: number) => `${amount} FCFA ont été envoyés sur ton compte. Merci pour ton engagement !`,
      },
      streakDanger: {
        title: "Ta série est en danger !",
        body: (days: number) => `Tu as une série de ${days} jours. Partage aujourd'hui pour ne pas la perdre !`,
      },
      streakMilestone: {
        title: "Bravo, objectif atteint !",
        body: (days: number, reward: number) => `${days} jours de série ! Tu as gagné un bonus de ${reward} FCFA.`,
      },
      custom: {
        defaultTitle: "Tamtam",
      },
    },
    leaderboard: {
      title: "Classement",
      weekly: "Cette semaine",
      monthly: "Ce mois",
      rank: "Rang",
      clicks: "Clics",
      campaigns: "Campagnes",
      yourRank: "Ton classement",
      notRanked: "Non classé",
      foundingEcho: "Écho fondateur",
      tier: (tier: string) => {
        const labels: Record<string, string> = {
          echo: "Écho",
          argent: "Argent",
          or: "Or",
          diamant: "Diamant",
        };
        return labels[tier] || tier;
      },
    },
  },
  en: {
    push: {
      newCampaign: {
        title: "New campaign available!",
        body: (cpc: number) => `A new campaign is available at ${cpc} FCFA/click. Open the app to participate.`,
      },
      payout: {
        title: "Payment sent!",
        body: (amount: number) => `${amount} FCFA have been sent to your account. Thanks for your engagement!`,
      },
      streakDanger: {
        title: "Your streak is at risk!",
        body: (days: number) => `You have a ${days}-day streak. Share today to keep it going!`,
      },
      streakMilestone: {
        title: "Congratulations, milestone reached!",
        body: (days: number, reward: number) => `${days}-day streak! You earned a ${reward} FCFA bonus.`,
      },
      custom: {
        defaultTitle: "Tamtam",
      },
    },
    leaderboard: {
      title: "Leaderboard",
      weekly: "This week",
      monthly: "This month",
      rank: "Rank",
      clicks: "Clicks",
      campaigns: "Campaigns",
      yourRank: "Your rank",
      notRanked: "Not ranked",
      foundingEcho: "Founding Echo",
      tier: (tier: string) => {
        const labels: Record<string, string> = {
          echo: "Echo",
          argent: "Silver",
          or: "Gold",
          diamant: "Diamond",
        };
        return labels[tier] || tier;
      },
    },
  },
};

export function getEchoStrings(lang: EchoLang): EchoStrings {
  return strings[lang] || strings.fr;
}
