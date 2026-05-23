export interface TourStep {
  target: string;
  message: { fr: string; en: string };
  position: "top" | "bottom" | "left" | "right";
}

export interface Tour {
  id: string;
  page: string;
  steps: TourStep[];
}

export const TOURS: Tour[] = [
  {
    id: "overview",
    page: "overview",
    steps: [
      {
        target: "[data-tour='stat-cards']",
        message: {
          fr: "Voici vos KPIs principaux : portée, clics réels, budget et coût par clic. Ils se mettent à jour en temps réel.",
          en: "Here are your main KPIs: reach, real clicks, budget, and cost per click. They update in real time.",
        },
        position: "bottom",
      },
      {
        target: "[data-tour='campaign-results']",
        message: {
          fr: "Vos campagnes récentes avec leurs performances. Cliquez sur une campagne pour voir les détails.",
          en: "Your recent campaigns and their performance. Click any campaign for details.",
        },
        position: "top",
      },
      {
        target: "[data-tour='wallet-card']",
        message: {
          fr: "Votre solde wallet. Appuyez sur + pour recharger via Wave et lancer vos campagnes.",
          en: "Your wallet balance. Tap + to top up via Wave and launch your campaigns.",
        },
        position: "left",
      },
      {
        target: "[data-tour='top-echos']",
        message: {
          fr: "Vos meilleurs Échos — les personnes qui partagent vos campagnes. Plus ils partagent, plus ils gagnent !",
          en: "Your top Échos — people who share your campaigns. The more they share, the more they earn!",
        },
        position: "left",
      },
      {
        target: "[data-tour='new-rythme-btn']",
        message: {
          fr: "Prêt à lancer ? Cliquez ici pour créer votre premier Rythme !",
          en: "Ready to launch? Click here to create your first Rythme!",
        },
        position: "bottom",
      },
    ],
  },
  {
    id: "campaigns",
    page: "campaigns",
    steps: [
      {
        target: "[data-tour='campaign-list']",
        message: {
          fr: "Voici toutes vos campagnes. Cliquez sur une campagne pour voir ses performances détaillées.",
          en: "Here are all your campaigns. Click any campaign to see detailed performance.",
        },
        position: "bottom",
      },
      {
        target: "[data-tour='new-campaign-btn']",
        message: {
          fr: "Créez un nouveau Rythme ici. Vous choisirez d'abord votre objectif.",
          en: "Create a new Rythme here. You'll choose your objective first.",
        },
        position: "bottom",
      },
    ],
  },
  {
    id: "campaigns-objective",
    page: "campaigns",
    steps: [
      {
        target: "[data-tour='objective-grid']",
        message: {
          fr: "Choisissez votre objectif : Trafic pour des visites, Notoriété pour la visibilité, Leads pour collecter des contacts.",
          en: "Choose your objective: Traffic for visits, Awareness for visibility, Leads to collect contacts.",
        },
        position: "bottom",
      },
      {
        target: "[data-tour='objective-traffic']",
        message: {
          fr: "Trafic : envoyez des visiteurs réels vers votre site. Idéal pour les promotions et lancements.",
          en: "Traffic: send real visitors to your site. Ideal for promotions and launches.",
        },
        position: "right",
      },
      {
        target: "[data-tour='objective-awareness']",
        message: {
          fr: "Notoriété : maximisez la visibilité de votre marque sur les Status WhatsApp.",
          en: "Awareness: maximize your brand visibility on WhatsApp Status.",
        },
        position: "right",
      },
      {
        target: "[data-tour='objective-leads']",
        message: {
          fr: "Leads : collectez des contacts qualifiés avec un formulaire intégré. Parfait pour le B2B.",
          en: "Leads: collect qualified contacts with an embedded form. Perfect for B2B.",
        },
        position: "right",
      },
    ],
  },
  {
    id: "wallet",
    page: "wallet",
    steps: [
      {
        target: "[data-tour='wallet-balance']",
        message: {
          fr: "Votre solde disponible. C'est le montant que vous pouvez utiliser pour vos campagnes.",
          en: "Your available balance. This is the amount you can use for your campaigns.",
        },
        position: "bottom",
      },
      {
        target: "[data-tour='recharge-btn']",
        message: {
          fr: "Rechargez votre wallet ici via Wave. Minimum 1 000 FCFA, nous recommandons 10 000+ FCFA.",
          en: "Top up your wallet here via Wave. Minimum 1,000 FCFA, we recommend 10,000+ FCFA.",
        },
        position: "left",
      },
      {
        target: "[data-tour='transactions']",
        message: {
          fr: "Historique de toutes vos transactions : recharges, dépenses de campagnes, et remboursements.",
          en: "History of all your transactions: top-ups, campaign spending, and refunds.",
        },
        position: "top",
      },
    ],
  },
  {
    id: "pixel",
    page: "pixel",
    steps: [
      {
        target: "[data-tour='pixel-status']",
        message: {
          fr: "L'état de votre Pixel. Vert = actif et fonctionnel. Suivez les conversions après le clic.",
          en: "Your Pixel status. Green = active and working. Track conversions after the click.",
        },
        position: "bottom",
      },
      {
        target: "[data-tour='pixel-guide']",
        message: {
          fr: "Le guide technique pour installer le Pixel en 5 étapes. Partagez-le avec votre développeur.",
          en: "The technical guide to install the Pixel in 5 steps. Share it with your developer.",
        },
        position: "top",
      },
    ],
  },
  {
    id: "settings",
    page: "settings",
    steps: [
      {
        target: "[data-tour='settings-tabs']",
        message: {
          fr: "Naviguez entre Profil, Sécurité et Équipe pour gérer votre compte.",
          en: "Navigate between Profile, Security, and Team to manage your account.",
        },
        position: "bottom",
      },
      {
        target: "[data-tour='profile-form']",
        message: {
          fr: "Mettez à jour votre profil et ajoutez votre logo pour personnaliser vos campagnes.",
          en: "Update your profile and add your logo to personalize your campaigns.",
        },
        position: "top",
      },
    ],
  },
];
