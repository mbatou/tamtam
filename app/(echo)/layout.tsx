import EchoBottomNav from "@/components/EchoBottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getActiveTheme, THEME_COLORS } from "@/lib/theme";
import InterestOnboardingWrapper from "@/components/echo/InterestOnboardingWrapper";

export default function EchoLayout({ children }: { children: React.ReactNode }) {
  const theme = getActiveTheme();
  const colors = THEME_COLORS[theme];

  return (
    <div
      className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
      style={{
        "--accent-color": colors.accent,
        "--accent-hover": colors.accentHover,
      } as React.CSSProperties}
    >
      {theme === "independence_day" && (
        <div className="h-1 flex">
          <div className="flex-1 bg-green-500" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-red-500" />
        </div>
      )}
      <main className="max-w-[560px] mx-auto">{children}</main>
      <InterestOnboardingWrapper />
      <InstallPrompt />
      <EchoBottomNav />
    </div>
  );
}
