"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLandingStats } from "./_components/useLandingStats";

export default function EntrySelector() {
  const [hover, setHover] = useState<"brand" | "echo" | null>(null);
  const [mounted, setMounted] = useState(false);
  const { stats, loaded } = useLandingStats();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden relative bg-[#0F0F1F]">
      {/* Brand side */}
      <Link
        href="/marques"
        className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out relative ${
          hover === "brand"
            ? "md:flex-[1.3]"
            : hover === "echo"
              ? "md:flex-[0.7]"
              : "flex-1"
        } ${mounted ? "translate-x-0 opacity-100" : "md:-translate-x-full md:opacity-0 -translate-y-full opacity-0 md:translate-y-0"}`}
        style={{
          background: "linear-gradient(135deg, #D35400 0%, #E67E22 100%)",
        }}
        onMouseEnter={() => setHover("brand")}
        onMouseLeave={() => setHover(null)}
      >
        <div className="text-center px-8 max-w-md">
          <div className="text-6xl mb-6">📢</div>
          <h2 className="text-white text-4xl md:text-5xl font-black mb-4 uppercase tracking-tight">
            Je suis une Marque
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Je veux être vu par des milliers de personnes au Sénégal
          </p>
          <div
            className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur px-6 py-3 rounded-full text-white font-bold text-lg transition-all duration-300 ${
              hover === "brand" ? "scale-110 bg-white/30" : ""
            }`}
          >
            Découvrir →
          </div>
        </div>
      </Link>

      {/* Écho side */}
      <Link
        href="/echos"
        className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out relative ${
          hover === "echo"
            ? "md:flex-[1.3]"
            : hover === "brand"
              ? "md:flex-[0.7]"
              : "flex-1"
        } ${mounted ? "translate-x-0 opacity-100" : "md:translate-x-full md:opacity-0 translate-y-full opacity-0 md:translate-y-0"}`}
        style={{
          background: "linear-gradient(135deg, #0F8C69 0%, #1ABC9C 100%)",
        }}
        onMouseEnter={() => setHover("echo")}
        onMouseLeave={() => setHover(null)}
      >
        <div className="text-center px-8 max-w-md">
          <div className="text-6xl mb-6">💰</div>
          <h2 className="text-white text-4xl md:text-5xl font-black mb-4 uppercase tracking-tight">
            Je suis un Écho
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Je veux gagner de l&apos;argent avec mon statut WhatsApp
          </p>
          <div
            className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur px-6 py-3 rounded-full text-white font-bold text-lg transition-all duration-300 ${
              hover === "echo" ? "scale-110 bg-white/30" : ""
            }`}
          >
            Découvrir →
          </div>
        </div>
      </Link>

      {/* Center logo overlay */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        {/* Ripple rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full border border-orange-500/30 animate-[ripple_3s_ease-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full border border-teal-500/30 animate-[ripple_3s_ease-out_1s_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/10 animate-[ripple_3s_ease-out_2s_infinite]" />

        <div className="relative bg-[#0F0F1F] rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center shadow-2xl border-4 border-white/20 animate-[pulse_3s_ease-in-out_infinite]">
          <span className="text-3xl md:text-4xl">🥁</span>
        </div>
        <div className="text-center mt-3">
          <span className="text-white font-black text-xl tracking-wider drop-shadow-lg">
            TAMTAM
          </span>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/30 backdrop-blur-sm py-3">
        <div className="flex justify-center gap-4 md:gap-8 text-white/70 text-xs md:text-sm font-medium">
          <span>{loaded ? stats.echos : "552"}+ Échos</span>
          <span>·</span>
          <span>{loaded ? stats.batteurs : "27"}+ Marques</span>
          <span>·</span>
          <span>
            {loaded
              ? stats.totalPaid.toLocaleString("fr-FR")
              : "56 010"}{" "}
            FCFA versés
          </span>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
