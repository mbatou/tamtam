export type ProfileForm = {
  name: string;
  phone: string;
  city: string;
  mobile_money_provider: string;
};

export type ProfileStats = {
  totalClicks: number;
  activeCampaigns: number;
  totalEarned: number;
};

export type InterestItem = {
  id: string;
  emoji: string;
  name_fr: string;
};
