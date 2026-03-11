import EchoBottomNav from "@/components/EchoBottomNav";
import SoundWave from "@/components/ui/SoundWave";

export default function EchoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={4} className="h-4 opacity-50" />
        </div>
      </header>
      <main>{children}</main>
      <EchoBottomNav />
    </div>
  );
}
