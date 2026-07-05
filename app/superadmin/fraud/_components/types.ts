import {
  ShieldAlert, MousePointerClick, Users, Settings, Globe,
} from "lucide-react";

// ── Types ──

export interface ClickRow {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_valid: boolean;
  country: string | null;
  created_at: string;
  link_id: string;
  rejection_reason: string | null;
  tracked_links: {
    short_code: string;
    echo_id: string;
    campaign_id: string;
    users: { name: string } | null;
    campaigns: { title: string } | null;
  } | null;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  block_type: string;
  expires_at: string | null;
  carrier_ip: boolean;
  created_at: string;
}

export interface CarrierRange {
  id: string;
  carrier: string;
  ip_prefix: string;
  country: string;
}

export interface IPAnalysis {
  ip_address: string;
  total_clicks: number;
  valid_clicks: number;
  invalid_clicks: number;
  unique_links: number;
  active_days: number;
  first_click: string;
  last_click: string;
  time_span_seconds: number;
  risk_assessment: string;
  is_carrier_ip: boolean;
  carrier: string | null;
}

export interface EchoAnalysis {
  echo_id: string;
  name: string;
  phone: string | null;
  links_created: number;
  total_clicks: number;
  valid_clicks: number;
  invalid_clicks: number;
  valid_rate_pct: number;
  suspicious_repeat_ips: number;
  risk_level: string;
}

export interface IPDetailClick {
  id: string;
  ip_address: string;
  is_valid: boolean;
  created_at: string;
  rejection_reason: string | null;
  tracked_links: { short_code: string; users: { name: string } | null } | null;
}

export interface IPDetails {
  clicks: IPDetailClick[];
  carrier: string | null;
  carrier_notes: string | null;
  is_carrier_ip: boolean;
}

export interface FraudData {
  totalClicks: number;
  validClicks: number;
  flaggedClicks: number;
  rejectionRate: number;
  rejectionBreakdown: Record<string, number>;
  revenueSaved: number;
  recentClicks: ClickRow[];
  blockedIPs: BlockedIP[];
  carrierRanges: CarrierRange[];
  ipAnalysis: IPAnalysis[];
  echoAnalysis: EchoAnalysis[];
}

export type IpSortKey = "total_clicks" | "valid_clicks" | "active_days";

// ── Helpers ──

export const REJECTION_LABELS: Record<string, { label: string; isFraud: boolean }> = {
  ip_cooldown_24h: { label: "Cooldown IP (24h dédup)", isFraud: false },
  ip_daily_limit: { label: "Limite IP journalière", isFraud: false },
  link_rate_limit: { label: "Limite lien/heure", isFraud: false },
  bot_useragent: { label: "User-agent bot", isFraud: true },
  speed_bot: { label: "Vitesse (<3s)", isFraud: true },
  blocked_bot: { label: "IP bloquée (bot)", isFraud: true },
  blocked_datacenter: { label: "IP datacenter", isFraud: true },
  blocked_manual: { label: "IP bloquée (manuel)", isFraud: true },
  missing_user_agent: { label: "UA manquant", isFraud: true },
  manual_invalidation: { label: "Invalidation manuelle", isFraud: true },
  ip_duplicate_24h: { label: "Cooldown IP (24h dédup)", isFraud: false },
  blocked_ip: { label: "IP bloquée", isFraud: true },
  bot_detected: { label: "Bot détecté", isFraud: true },
  ip_global_rate_limit: { label: "Limite IP globale", isFraud: false },
};

export const RISK_STYLES: Record<string, { color: string; label: string }> = {
  bot: { color: "text-red-400", label: "Bot" },
  targeted_abuse: { color: "text-red-400", label: "Abus ciblé" },
  suspicious: { color: "text-yellow-400", label: "Suspect" },
  likely_carrier_ip: { color: "text-blue-400", label: "IP Opérateur" },
  normal: { color: "text-white/40", label: "Normal" },
};

export function formatTimeSpan(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)} jours`;
}

export type Section = "overview" | "ips" | "echos" | "clicks" | "settings";

export const SECTION_TABS: { key: Section; label: string; icon: typeof ShieldAlert }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: ShieldAlert },
  { key: "ips", label: "Analyse IP", icon: Globe },
  { key: "echos", label: "Analyse Échos", icon: Users },
  { key: "clicks", label: "Journal clics", icon: MousePointerClick },
  { key: "settings", label: "Paramètres", icon: Settings },
];
