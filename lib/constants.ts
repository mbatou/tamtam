export const PLATFORM_FEE_PERCENT = 25;
export const ECHO_SHARE_PERCENT = 75;
export const ECHO_LEAD_SHARE_PERCENT = 75; // LUP-113: Echo gets 75% of CPL on verified leads
export const MIN_PAYOUT_AMOUNT = 1000; // FCFA
export const LEAD_GEN_SETUP_FEE_FCFA = 5000; // LUP-113: flat setup fee for lead generation campaigns
export const LEAD_GEN_MIN_BUDGET_FCFA = 15000; // LUP-113: minimum total budget

export const ANTI_FRAUD = {
  IP_COOLDOWN_HOURS: 24,
  LINK_HOURLY_LIMIT: 30,
  IP_DAILY_VALID_LIMIT: 8,
  SPEED_CHECK_SECONDS: 3,
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
