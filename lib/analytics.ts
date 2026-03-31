import { track } from "@vercel/analytics";

export const trackEvent = {
  // Echo events
  echoSignup: (city?: string) => track("echo_signup", { city: city || "unknown" }),
  echoAcceptCampaign: (campaignId: string) => track("echo_accept_campaign", { campaignId }),
  echoShareLink: (method: "whatsapp" | "copy" | "native") => track("echo_share_link", { method }),
  echoCrackEgg: (tier: string, amount: number) => track("echo_crack_egg", { tier, amount }),
  echoWithdraw: (amount: number) => track("echo_withdraw", { amount }),

  // Brand events
  brandSignup: (source?: string) => track("brand_signup", { source: source || "direct" }),
  brandCreateCampaign: (budget: number, cpc: number) => track("brand_create_campaign", { budget, cpc }),
  brandLaunchCampaign: (campaignId: string) => track("brand_launch_campaign", { campaignId }),
  brandRecharge: (amount: number, method: string) => track("brand_recharge", { amount, method }),

  // Landing page events
  landingCTA: (page: "marques" | "echos", action: string) => track("landing_cta", { page, action }),
  languageSwitch: (lang: "fr" | "en") => track("language_switch", { lang }),
};
