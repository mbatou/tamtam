export interface AwaMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AwaBrandData {
  walletBalance: number;
  totalSpent: number;
  activeCampaigns: number;
  totalCampaigns: number;
  totalClicks: number;
  language: string;
  brandName: string;
}
