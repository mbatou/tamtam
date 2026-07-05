export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  destination_url: string;
  budget: number;
  spent: number;
  cpc: number;
  status: string;
  objective: string | null;
  moderation_status: string | null;
  moderation_reason: string | null;
  created_at: string;
  echo_count: number;
  total_clicks: number;
  target_cities: string[] | null;
  users: { name: string; phone: string } | null;
  cost_per_lead_fcfa?: number | null;
  leads_captured_count?: number;
  setup_fee_paid?: boolean;
  setup_fee_amount_fcfa?: number | null;
  landing_page_id?: string | null;
  creative_urls?: string[] | null;
  deleted_at?: string | null;
  pricing_model?: string | null;
  cpa_amount?: number | null;
  cpa_event?: string | null;
}

export interface Batteur {
  id: string;
  name: string;
  balance: number;
}

export interface EchoActivity {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  joinedAt: string;
  totalClicks: number;
  validClicks: number;
  earnings: number;
}

export interface ClickLog {
  id: string;
  created_at: string;
  is_valid: boolean;
  ip_address: string | null;
  user_agent: string | null;
  tracked_links: {
    campaign_id: string;
    users: { name: string; city: string | null } | null;
  } | null;
}

export interface EchoData {
  echos: EchoActivity[];
  engagedCount: number;
  totalEchos: number;
  participationRate: number;
  recentClicks: ClickLog[];
}

export interface NotifyResult {
  total: number;
  emailSent: number;
  emailFailed: number;
  whatsappReady: number;
  unreachable: number;
  whatsappLinks: { name: string; phone: string; link: string }[];
}

export type DetailTab = "info" | "echos" | "clicks";

export interface NewCampaignForm {
  batteur_id: string;
  title: string;
  description: string;
  destination_url: string;
  cpc: string;
  budget: string;
  objective: string;
}

export const STATUS_MAP: Record<string, { label: string; badge: "active" | "pending" | "rejected" | "paused" | "finished" | "draft" }> = {
  approved: { label: "Approuvée", badge: "active" },
  pending: { label: "En attente", badge: "pending" },
  rejected: { label: "Rejetée", badge: "rejected" },
  paused: { label: "En pause", badge: "paused" },
  completed: { label: "Terminée", badge: "finished" },
  active: { label: "Active", badge: "active" },
  stopped: { label: "Stoppée", badge: "finished" },
};

export const OBJ_MAP: Record<string, { label: string; color: string; bg: string }> = {
  traffic: { label: "Traffic", color: "#5DCAA5", bg: "rgba(29,158,117,0.12)" },
  awareness: { label: "Awareness", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  lead_generation: { label: "Lead Gen", color: "#C084FC", bg: "rgba(192,132,252,0.12)" },
};
