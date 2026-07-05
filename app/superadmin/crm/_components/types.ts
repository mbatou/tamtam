export interface BrandUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  city: string | null;
  role: string;
  balance: number;
  created_at: string;
  pipelineStage?: string;
  campaignCount?: number;
  activeCampaigns?: number;
  hasRecharged?: boolean;
  teamMembers?: number;
  crm_tags?: string[];
  crm_stage?: string;
}

export interface CRMNote {
  id: string;
  content: string;
  note_type: string;
  followup_date: string | null;
  created_at: string;
  author_id: string;
}

export interface BrandCampaign {
  id: string;
  title: string;
  status: string;
  budget: number;
  cpc: number;
  created_at: string;
  moderation_status: string;
  target_cities: string[] | null;
  echoCount: number;
}

export interface BrandPayment {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
}

export interface BrandTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export interface BrandDetail {
  campaigns: BrandCampaign[];
  payments: BrandPayment[];
  transactions: BrandTransaction[];
  totalSpent: number;
  totalRecharged: number;
}

export interface StageCounts {
  registered: number;
  recharged: number;
  first_campaign: number;
  repeat: number;
  vip: number;
}

export interface CRMData {
  users: BrandUser[];
  total: number;
  page: number;
  limit: number;
  stageCounts?: StageCounts;
}

export type DetailTab = "info" | "campaigns" | "finance";

export interface NotesSectionProps {
  notes: CRMNote[];
  loading: boolean;
  newNote: string;
  onNewNoteChange: (value: string) => void;
  newNoteType: string;
  onNewNoteTypeChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (noteId: string) => void;
}

export interface BrandTableSelection {
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}

export interface BrandTableRowActions {
  onOpenDetail: (user: BrandUser) => void;
  onEdit: (user: BrandUser) => void;
  onInvestigate: (userId: string) => void;
}

export interface BrandDetailDrawerActions {
  onTopup: () => void;
  onEdit: (user: BrandUser) => void;
  onInvestigate: (userId: string) => void;
}

export const AVAILABLE_TAGS = [
  "VIP", "Prioritaire", "Nouveau", "Inactif", "Suivi", "Fidèle",
  "Entreprise", "PME", "Startup", "E-commerce", "Service", "Média",
];

export const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vip: { label: "VIP", color: "#EAB308", bg: "rgba(234,179,8,0.12)" },
  repeat: { label: "Récurrent", color: "#5DCAA5", bg: "rgba(29,158,117,0.12)" },
  first_campaign: { label: "1ère campagne", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  recharged: { label: "Rechargé", color: "#C084FC", bg: "rgba(192,132,252,0.12)" },
  registered: { label: "Inscrit", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" },
};

export const NOTE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  note: { label: "Note", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" },
  call: { label: "Appel", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  email: { label: "Email", color: "#C084FC", bg: "rgba(192,132,252,0.12)" },
  followup: { label: "Suivi", color: "#D35400", bg: "rgba(211,84,0,0.12)" },
  meeting: { label: "Réunion", color: "#5DCAA5", bg: "rgba(29,158,117,0.12)" },
};
