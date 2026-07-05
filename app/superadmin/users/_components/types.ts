export interface UserRow {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  role: string;
  status: string | null;
  risk_level: string | null;
  balance: number;
  total_earned: number;
  mobile_money_provider: string | null;
  created_at: string;
  click_stats: { total: number; valid: number; fraud: number; rate: number };
  referral_count: number;
  referred_by: string | null;
  referral_code: string | null;
  last_click_at: string | null;
  campaigns_joined: number;
  is_dual_role?: boolean;
  has_echo_activity?: boolean;
  has_batteur_activity?: boolean;
  platforms?: string[] | null;
  primary_platform?: string | null;
  audience_size_range?: string | null;
}

export interface CampaignHistory {
  campaign_id: string;
  title: string;
  status: string;
  cpc: number;
  clicks?: number;
  earned?: number;
  joined_at?: string;
  budget?: number;
  spent?: number;
  echos?: number;
  created_at?: string;
}

export interface PayoutHistory {
  id: string;
  amount: number;
  provider: string | null;
  status: string;
  created_at: string;
  failure_reason?: string | null;
  completed_at?: string | null;
}

export interface ApiStats {
  totalEchos: number;
  totalBrands: number;
  flagged: number;
  totalPaid: number;
}

export interface ApiTabs {
  all: number;
  verified: number;
  flagged: number;
  suspended: number;
}

export type HistoryTab = "echo" | "batteur" | "payouts";

export type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

export interface NewBrandForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
}

/** Grouped history state passed from the page down to the detail drawer. */
export interface HistoryState {
  echoCampaigns: CampaignHistory[];
  batteurCampaigns: CampaignHistory[];
  payouts: PayoutHistory[];
  loading: boolean;
  tab: HistoryTab;
  onTabChange: (tab: HistoryTab) => void;
}

/** Grouped payout approval/rejection state + handlers. */
export interface PayoutActionsState {
  actionLoading: string | null;
  rejectId: string | null;
  rejectReason: string;
  onRejectIdChange: (id: string | null) => void;
  onRejectReasonChange: (reason: string) => void;
  onAction: (payoutId: string, action: "approve" | "reject", reason?: string) => void;
}

/** Shared quality-score computation used by the users table and the detail drawer. */
export function qualityScore(user: UserRow): number {
  const validRatio = user.click_stats.total > 0 ? user.click_stats.valid / user.click_stats.total : 0;
  const campaignsJoined = Math.min(user.campaigns_joined / 5, 1);
  return Math.round((validRatio * 0.6 + campaignsJoined * 0.4) * 100);
}
