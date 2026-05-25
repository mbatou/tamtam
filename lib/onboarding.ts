import type { User } from "@/lib/types";

export function shouldShowOnboarding(user: User): boolean {
  if (user.role !== "batteur" && (user as { role: string }).role !== "echo") return false;

  const hasCompletedInterests = !!user.interests_completed_at;
  const hasPlatforms = Array.isArray(user.platforms) && user.platforms.length > 0;

  if (hasCompletedInterests && hasPlatforms) return false;

  if (user.interests_prompt_dismissed_at && hasPlatforms) return false;

  return true;
}

export function getPrimaryPlatform(platforms: string[]): string {
  const priority = ["whatsapp", "instagram", "tiktok", "facebook", "snapchat", "other"];
  return priority.find((p) => platforms.includes(p)) || platforms[0];
}

export const PLATFORM_LIST = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", bg: "rgba(37,211,102,0.1)", border: "rgba(37,211,102,0.3)" },
  { id: "instagram", label: "Instagram", color: "#E1306C", bg: "rgba(225,48,108,0.1)", border: "rgba(225,48,108,0.3)" },
  { id: "tiktok", label: "TikTok", color: "#ffffff", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.15)" },
  { id: "facebook", label: "Facebook", color: "#1877F2", bg: "rgba(24,119,242,0.1)", border: "rgba(24,119,242,0.3)" },
  { id: "snapchat", label: "Snapchat", color: "#FFFC00", bg: "rgba(255,252,0,0.08)", border: "rgba(255,252,0,0.25)" },
  { id: "other", label: "Autre", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
] as const;

export const AUDIENCE_SIZES = [
  { id: "small", label: "Moins de 200", sublabel: "Petite audience mais très engagée", emoji: "🌱" },
  { id: "medium", label: "200 — 500", sublabel: "Audience locale solide", emoji: "📱" },
  { id: "growing", label: "500 — 2 000", sublabel: "Bonne visibilité dans votre réseau", emoji: "🚀" },
  { id: "large", label: "2 000+", sublabel: "Large audience — forte valeur", emoji: "⭐" },
] as const;

export const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  snapchat: "Snapchat",
  other: "Autre",
};

export const AUDIENCE_LABELS: Record<string, string> = {
  small: "< 200",
  medium: "200–500",
  growing: "500–2 000",
  large: "2 000+",
};
