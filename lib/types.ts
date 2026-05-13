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
  team_position?: string | null;
  team_permissions?: string[] | null;
  crm_stage?: "onboarding" | "active" | "at_risk" | "churned";
  crm_tags?: string[];
  terms_accepted_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deletion_reason?: string | null;
  original_email?: string | null;
  interests_completed_at?: string | null;
  is_founding_echo?: boolean;
  interests_prompt_dismissed_at?: string | null;
  signup_tm_ref?: string | null;
  created_at: string;
}

export type CampaignObjective = "awareness" | "traffic" | "lead_generation";

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
  objective: CampaignObjective;
  moderation_status?: "pending" | "approved" | "rejected";
  moderation_reason?: string | null;
  moderated_by?: string | null;
  moderated_at?: string | null;
  starts_at: string | null;
  ends_at: string | null;
  target_cities: string[] | null;
  created_at: string;
  // Lead generation fields (only for objective === 'lead_generation')
  cost_per_lead_fcfa?: number | null;
  leads_captured_count?: number;
  setup_fee_paid?: boolean;
  setup_fee_amount_fcfa?: number | null;
  landing_page_id?: string | null;
  low_conversion_flagged?: boolean;
  pixel_id?: string | null;
  tracked_events?: string[];
  deleted_at?: string | null;
}

export type LandingPageStatus = "draft" | "active" | "archived";

export interface LandingPageFormField {
  label: string;
  type: "text" | "phone" | "email" | "select";
  required: boolean;
  options?: string[]; // for select type
}

export interface LandingPage {
  id: string;
  campaign_id: string;
  batteur_id: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  description: string | null;
  cta_text: string;
  brand_color: string;
  brand_accent_color: string | null;
  logo_url: string | null;
  form_fields: LandingPageFormField[];
  notification_phone: string | null;
  notification_email: string | null;
  ai_generation_id: string | null;
  status: LandingPageStatus;
  created_at: string;
  deleted_at: string | null;
}

export type LeadStatus = "pending" | "verified" | "rejected" | "flagged";
export type LeadPayoutStatus = "pending" | "paid" | "failed";

export interface Lead {
  id: string;
  landing_page_id: string;
  campaign_id: string;
  tracked_link_id: string | null;
  echo_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  custom_fields: Record<string, string> | null;
  ip_address: string | null;
  user_agent: string | null;
  consent_given: boolean;
  fraud_score: number;
  status: LeadStatus;
  rejection_reason: string | null;
  verified_at: string | null;
  payout_amount: number | null;
  payout_status: LeadPayoutStatus | null;
  created_at: string;
  deleted_at: string | null;
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
  status: "pending" | "processing" | "sent" | "failed";
  created_at: string;
  completed_at?: string | null;
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

export interface Pixel {
  id: string;
  brand_id: string;
  name: string;
  pixel_id: string;
  platform: "app" | "web" | "both";
  allowed_events: string[];
  webhook_url: string | null;
  is_active: boolean;
  total_conversions: number;
  last_conversion_at: string | null;
  last_test_at: string | null;
  test_status: "pending" | "success" | "failed";
  test_count: number;
  last_test_error: string | null;
  last_test_latency_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface Conversion {
  id: string;
  pixel_id: string;
  brand_id: string;
  campaign_id: string | null;
  echo_id: string | null;
  tracked_link_id: string | null;
  event: string;
  event_name: string | null;
  value_amount: number | null;
  value_currency: string;
  tm_ref: string | null;
  attributed: boolean;
  attribution_type: "direct" | "assisted" | "unattributed" | null;
  click_to_conversion_seconds: number | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
