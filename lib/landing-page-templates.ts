import type { LandingPageTemplate } from "@/lib/types";

export interface TemplateDefinition {
  id: LandingPageTemplate;
  name: string;
  description: string;
  icon: string;
  defaultLayout: {
    showHeroImage: boolean;
    showSubheadline: boolean;
    showDescription: boolean;
    formPosition: "below" | "side";
    showBulletPoints: boolean;
  };
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "simple",
    name: "Simple",
    description: "Titre, description et formulaire. Direct et efficace.",
    icon: "📄",
    defaultLayout: {
      showHeroImage: false,
      showSubheadline: true,
      showDescription: true,
      formPosition: "below",
      showBulletPoints: false,
    },
  },
  {
    id: "product",
    name: "Produit",
    description: "Image produit en vedette avec details et formulaire.",
    icon: "🛍️",
    defaultLayout: {
      showHeroImage: true,
      showSubheadline: true,
      showDescription: true,
      formPosition: "below",
      showBulletPoints: true,
    },
  },
  {
    id: "event",
    name: "Evenement",
    description: "Pour conferences, webinaires, lancements.",
    icon: "🎉",
    defaultLayout: {
      showHeroImage: true,
      showSubheadline: true,
      showDescription: true,
      formPosition: "below",
      showBulletPoints: false,
    },
  },
  {
    id: "app",
    name: "Application",
    description: "Ideal pour applications mobiles et SaaS.",
    icon: "📱",
    defaultLayout: {
      showHeroImage: true,
      showSubheadline: true,
      showDescription: true,
      formPosition: "below",
      showBulletPoints: true,
    },
  },
  {
    id: "contact",
    name: "Contact",
    description: "Formulaire de contact avec message libre.",
    icon: "💬",
    defaultLayout: {
      showHeroImage: false,
      showSubheadline: true,
      showDescription: false,
      formPosition: "below",
      showBulletPoints: false,
    },
  },
];

export function getTemplate(id: LandingPageTemplate): TemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
