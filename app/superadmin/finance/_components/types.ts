export interface StuckCampaign {
  id: string;
  title: string;
  status: string;
  echos: number;
  total_fcfa: number;
}

export interface StuckEarningsData {
  stuck: number;
  total_fcfa: number;
  campaigns: StuckCampaign[];
}

export interface FixResult {
  dry_run: boolean;
  fixed: number;
  total_fcfa: number;
  campaigns: { campaign_id: string; title: string; echos_unlocked: number }[];
}

export interface PayoutRow {
  id: string;
  echo_id: string;
  amount: number;
  provider: string;
  status: string;
  created_at: string;
  users: { name: string; phone: string | null } | null;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  provider: string;
  payment_method: string | null;
  created_at: string;
  users: { name: string } | null;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  clicks: number;
}

export interface FinanceData {
  grossRevenue: number;
  platformCut: number;
  feePercent: number;
  sentTotal: number;
  pendingTotal: number;
  validClicks: number;
  payouts: PayoutRow[];
  payments: PaymentRow[];
  dailyRevenue?: DailyRevenue[];
}

export type FinanceTab = "payout_requests" | "payout_history" | "payments" | "pending_recharges";

export interface ConfirmPayoutAction {
  payout: PayoutRow;
  action: "approve" | "reject";
  reason?: string;
}

export const PAGE_SIZE = 30;
