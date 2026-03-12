import EchoBottomNav from "@/components/EchoBottomNav";
import SoundWave from "@/components/ui/SoundWave";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function EchoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black gradient-text">Tamtam</span>
          <SoundWave bars={4} className="h-3.5 opacity-50" />
        </div>
      </header>
      <main>{children}</main>
      <InstallPrompt />
      <EchoBottomNav />
    </div>
  );
}
