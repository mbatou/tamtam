export type UserRole = "echo" | "batteur" | "admin";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string | null;
  city: string | null;
  mobile_money_provider: "wave" | "orange_money" | null;
  balance: number;
  total_earned: number;
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
  status: "draft" | "active" | "paused" | "completed";
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
