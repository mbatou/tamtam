export const PLATFORM_FEE_PERCENT = 25;
export const ECHO_SHARE_PERCENT = 75;
export const MIN_PAYOUT_AMOUNT = 1000; // FCFA

export const ANTI_FRAUD = {
  IP_COOLDOWN_HOURS: 24,
  LINK_HOURLY_LIMIT: 30,
  IP_DAILY_VALID_LIMIT: 8,
  SPEED_CHECK_SECONDS: 3,
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
