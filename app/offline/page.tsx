"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-background text-foreground px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-3xl mb-6">
        ⚡
      </div>
      <h1 className="text-2xl font-black mb-2">Pas de connexion</h1>
      <p className="text-sm text-white/40 max-w-[300px] leading-relaxed mb-6">
        Tu es hors ligne. Verifie ta connexion internet et reessaie.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary text-sm px-8 py-3"
      >
        Reessayer
      </button>
    </div>
  );
}
