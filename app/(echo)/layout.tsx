import EchoBottomNav from "@/components/EchoBottomNav";

export default function EchoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <span className="text-xl font-black gradient-text">Tamtam</span>
      </header>
      <main>{children}</main>
      <EchoBottomNav />
    </div>
  );
}
