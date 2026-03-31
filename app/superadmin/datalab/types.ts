export interface Suggestion {
  severity: "red" | "yellow" | "green";
  text: string;
}

export interface CityStats {
  city: string;
  echoCount: number;
  totalClicks: number;
  validClicks: number;
  validRate: number;
  clicksPerEcho: number;
}

export interface Cohort {
  week: string;
  registered: number;
  activeNow: number;
  retentionRate: number;
}

export interface WebAnalyticsData {
  summary: {
    totalClicks: number;
    validClicks: number;
    fraudRate: number;
    totalSignups: number;
    echoSignups: number;
    brandSignups: number;
  };
  clicksTrend: { date: string; total: number; valid: number }[];
  signupsTrend: { date: string; echos: number; brands: number }[];
  topCampaigns: { title: string; clicks: number }[];
  hourDistribution: number[];
  period: { from: string; to: string };
  error?: string;
}

export interface DataLabData {
  echoFunnel: {
    registered: number;
    acceptedCampaign: number;
    generatedClick: number;
    withdrew: number;
    activeWeek: number;
  };
  echoLifecycle: {
    new: number;
    active: number;
    dormant: number;
    churned: number;
    neverActive: number;
  };
  brandFunnel: {
    registered: number;
    recharged: number;
    launchedCampaign: number;
    repeatCampaign: number;
  };
  heatmap: number[][];
  cityStats: CityStats[];
  campaignStats: {
    avgBudget: number;
    avgCPC: number;
    totalCampaigns: number;
    completedCampaigns: number;
  };
  cohorts: Cohort[];
  suggestions: Suggestion[];
}

export interface AIInsight {
  severity: "red" | "yellow" | "green";
  title: string;
  observation: string;
  psychology: string;
  law: string;
  action: string;
  effort?: "facile" | "moyen" | "difficile";
  impact: string;
  claudePrompt?: string;
}

export interface AIAnalysis {
  insights: AIInsight[];
  summary: string;
  topPriority: string;
  topPriorityPrompt?: string;
}
