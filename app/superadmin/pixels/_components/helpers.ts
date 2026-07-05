import type { PixelHealth, PixelRow } from "./types";

export function getPixelHealth(pixel: PixelRow): PixelHealth {
  if (!pixel.is_active) return "inactive";
  if (pixel.test_count === 0) return "untested";
  if (pixel.last_test_latency_ms && pixel.last_test_latency_ms > 500)
    return "slow";
  if (pixel.test_status === "failed") return "error";
  return "active";
}

export const STATUS_CONFIG: Record<
  PixelHealth,
  { label: string; bg: string; color: string; dot: string }
> = {
  active: {
    label: "Actif",
    bg: "rgba(29,158,117,0.12)",
    color: "#5DCAA5",
    dot: "#1D9E75",
  },
  inactive: {
    label: "Inactif",
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.35)",
    dot: "rgba(255,255,255,0.2)",
  },
  untested: {
    label: "Non testé",
    bg: "rgba(211,84,0,0.10)",
    color: "#F0997B",
    dot: "#D35400",
  },
  slow: {
    label: "Lent",
    bg: "rgba(240,153,123,0.12)",
    color: "#F0997B",
    dot: "#F0997B",
  },
  error: {
    label: "Erreur",
    bg: "rgba(240,149,149,0.12)",
    color: "#F09595",
    dot: "#E24B4A",
  },
};

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
