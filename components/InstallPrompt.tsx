"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if user dismissed before
    const dismissed = localStorage.getItem("tamtam_install_dismissed");
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime();
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      if (dismissedAt > threeDaysAgo) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("tamtam_install_dismissed", new Date().toISOString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed z-50 left-3 right-3 animate-slide-up" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="bg-gradient-primary rounded-2xl p-4 flex items-center gap-3 shadow-[0_8px_32px_rgba(211,84,0,0.4)]">
        <div className="text-2xl shrink-0">📲</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white">Installe Tamtam</p>
          <p className="text-xs text-white/80 mt-0.5">Acces rapide depuis ton ecran d&apos;accueil</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 bg-white/20 border border-white/30 rounded-xl px-3.5 py-2 text-white font-bold text-xs"
        >
          Installer
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/60 text-lg leading-none p-1"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
