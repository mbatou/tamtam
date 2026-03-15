export type UserRole = "echo" | "batteur" | "admin" | "superadmin";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string | null;
  city: string | null;
  mobile_money_provider: "wave" | "orange_money" | null;
  balance: number;
  total_earned: number;
  status?: "active" | "verified" | "flagged" | "suspended";
  risk_level?: "low" | "medium" | "high";
  tier?: "echo" | "argent" | "or" | "diamant";
  tier_bonus_percent?: number;
  total_valid_clicks?: number;
  total_campaigns_joined?: number;
  referred_by?: string | null;
  referral_count?: number;
  referral_code?: string | null;
  terms_accepted_at?: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  batteur_id: string;
  title: string;
  description: string | null;
  destination_url: string;
  creative_urls: string[];
  cpc: number;
  budget: number;
  spent: number;
  status: "draft" | "active" | "paused" | "completed" | "rejected";
  moderation_status?: "pending" | "approved" | "rejected";
  moderation_reason?: string | null;
  moderated_by?: string | null;
  moderated_at?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface TrackedLink {
  id: string;
  campaign_id: string;
  echo_id: string;
  short_code: string;
  click_count: number;
  created_at: string;
}

export interface Click {
  id: string;
  link_id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_valid: boolean;
  country: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  echo_id: string;
  amount: number;
  provider: "wave" | "orange_money" | null;
  status: "pending" | "sent" | "failed";
  created_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  blocked_by: string | null;
  block_type: "manual" | "bot" | "datacenter" | "temporary";
  expires_at: string | null;
  click_count: number;
  carrier_ip: boolean;
  created_at: string;
}

export interface CarrierIPRange {
  id: string;
  carrier: string;
  ip_prefix: string;
  country: string;
  notes: string | null;
  created_at: string;
}

export interface FraudIPAnalysis {
  ip_address: string;
  total_clicks: number;
  valid_clicks: number;
  invalid_clicks: number;
  unique_links: number;
  active_days: number;
  first_click: string;
  last_click: string;
  time_span_seconds: number;
  risk_assessment: "bot" | "targeted_abuse" | "likely_carrier_ip" | "suspicious" | "normal";
  is_carrier_ip: boolean;
}

export interface FraudEchoAnalysis {
  echo_id: string;
  name: string;
  phone: string | null;
  links_created: number;
  total_clicks: number;
  valid_clicks: number;
  invalid_clicks: number;
  valid_rate_pct: number;
  suspicious_repeat_ips: number;
  risk_level: "high_fraud_risk" | "moderate_risk" | "clean";
}

export interface PlatformSetting {
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  campaign_id: string | null;
  amount: number;
  ref_command: string;
  status: "pending" | "completed" | "cancelled" | "failed";
  payment_method: string | null;
  client_phone: string | null;
  paytech_token: string | null;
  completed_at: string | null;
  created_at: string;
}

// Join types
export interface TrackedLinkWithCampaign extends TrackedLink {
  campaigns: Campaign;
}

export interface TrackedLinkWithEcho extends TrackedLink {
  users: User;
}

export interface PayoutWithEcho extends Payout {
  users: User;
}

export interface CampaignWithBatteur extends Campaign {
  users: User;
}
