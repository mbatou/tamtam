"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLandingStats } from "./_components/useLandingStats";
import { useTranslation } from "@/lib/i18n";

export default function EntrySelector() {
  const [hover, setHover] = useState<"brand" | "echo" | null>(null);
  const [mounted, setMounted] = useState(false);
  const { stats, loaded } = useLandingStats();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden relative bg-[#0F0F1F]">
      {/* Brand side */}
      <Link
        href="/marques"
        className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out relative group ${
          hover === "brand"
            ? "md:flex-[1.4]"
            : hover === "echo"
              ? "md:flex-[0.6]"
              : "flex-1"
        } ${mounted ? "translate-x-0 opacity-100" : "md:-translate-x-full md:opacity-0 -translate-y-full opacity-0 md:translate-y-0"}`}
        style={{
          background: "linear-gradient(135deg, #D35400 0%, #E67E22 50%, #F39C12 100%)",
        }}
        onMouseEnter={() => setHover("brand")}
        onMouseLeave={() => setHover(null)}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="text-center px-8 max-w-md relative z-[1]">
          <div className="text-5xl md:text-6xl mb-4 transition-transform duration-300 group-hover:scale-110">📢</div>
          <h2 className="text-white text-3xl md:text-5xl font-black mb-3 uppercase tracking-tight leading-tight">
            {t("selector.brandTitle")}
          </h2>
          <p className="text-white/80 text-base md:text-lg mb-6 leading-relaxed">
            {t("selector.brandDesc")}
          </p>
          <div
            className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-8 py-3.5 rounded-full text-white font-bold text-lg transition-all duration-300 border border-white/20 ${
              hover === "brand" ? "scale-110 bg-white/30 shadow-lg shadow-orange-900/30" : ""
            }`}
          >
            {t("selector.discover")} →
          </div>
          <p className="text-white/50 text-xs mt-4">{t("selector.brandHint")}</p>
        </div>
      </Link>

      {/* Divider line */}
      <div className="hidden md:block w-px bg-white/10 relative z-[2]" />
      <div className="md:hidden h-px bg-white/10 relative z-[2]" />

      {/* Écho side */}
      <Link
        href="/echos"
        className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out relative group ${
          hover === "echo"
            ? "md:flex-[1.4]"
            : hover === "brand"
              ? "md:flex-[0.6]"
              : "flex-1"
        } ${mounted ? "translate-x-0 opacity-100" : "md:translate-x-full md:opacity-0 translate-y-full opacity-0 md:translate-y-0"}`}
        style={{
          background: "linear-gradient(135deg, #0D7A5F 0%, #1ABC9C 50%, #2ECC71 100%)",
        }}
        onMouseEnter={() => setHover("echo")}
        onMouseLeave={() => setHover(null)}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 80% 80%, white 1px, transparent 1px), radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="text-center px-8 max-w-md relative z-[1]">
          <div className="text-5xl md:text-6xl mb-4 transition-transform duration-300 group-hover:scale-110">💰</div>
          <h2 className="text-white text-3xl md:text-5xl font-black mb-3 uppercase tracking-tight leading-tight">
            {t("selector.echoTitle")}
          </h2>
          <p className="text-white/80 text-base md:text-lg mb-6 leading-relaxed">
            {t("selector.echoDesc")}
          </p>
          <div
            className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-8 py-3.5 rounded-full text-white font-bold text-lg transition-all duration-300 border border-white/20 ${
              hover === "echo" ? "scale-110 bg-white/30 shadow-lg shadow-teal-900/30" : ""
            }`}
          >
            {t("selector.discover")} →
          </div>
          <p className="text-white/50 text-xs mt-4">{t("selector.echoHint")}</p>
        </div>
      </Link>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-md py-3 border-t border-white/5">
        <div className="flex justify-center items-center gap-4 md:gap-8 text-white/60 text-xs md:text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            {loaded ? stats.echos : "552"}+ {t("selector.statEchos")}
          </span>
          <span className="text-white/20">·</span>
          <span>{loaded ? stats.batteurs : "27"}+ {t("selector.statBrands")}</span>
          <span className="text-white/20">·</span>
          <span>
            {loaded
              ? stats.totalPaid.toLocaleString("fr-FR")
              : "56 010"}{" "}
            {t("selector.statPaid")}
          </span>
        </div>
      </div>
    </div>
  );
}
