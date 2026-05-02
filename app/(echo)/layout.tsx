import Image from "next/image";
import EchoBottomNav from "@/components/EchoBottomNav";
import SoundWave from "@/components/ui/SoundWave";
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
      {/* Independence Day flag ribbon */}
      {theme === "independence_day" && (
        <div className="h-1 flex">
          <div className="flex-1 bg-green-500" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-red-500" />
        </div>
      )}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={120} height={32} priority className="h-7 w-auto" />
          <SoundWave bars={4} className="h-3.5 opacity-50" />
        </div>
      </header>
      <main>{children}</main>
      <InterestOnboardingWrapper />
      <InstallPrompt />
      <EchoBottomNav />
    </div>
  );
}
