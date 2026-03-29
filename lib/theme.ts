export type AppTheme = "default" | "independence_day";

export function getActiveTheme(): AppTheme {
  const now = new Date();
  const april1 = new Date("2026-04-01T00:00:00");
  const april7 = new Date("2026-04-07T00:00:00");

  if (now >= april1 && now < april7) {
    return "independence_day";
  }
  return "default";
}

export const THEME_COLORS = {
  default: {
    accent: "#1ABC9C",
    accentHover: "#16A085",
    gradient: "from-teal-500/20 to-teal-600/20",
  },
  independence_day: {
    accent: "#00853F",
    accentHover: "#006B32",
    secondary: "#FDEF42",
    tertiary: "#E31B23",
    gradient: "from-green-500/20 via-yellow-500/10 to-red-500/20",
  },
} as const;
