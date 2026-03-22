"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function LandingNav() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <nav className="flex items-center justify-between px-6 py-4 absolute top-0 left-0 right-0 z-20">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-orange-500 font-black text-xl">←</span>
        <span className="text-white font-bold">Tamtam</span>
      </Link>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
          className="text-white/50 hover:text-white text-xs font-medium transition-colors border border-white/10 rounded-full px-2.5 py-1"
        >
          {locale === "fr" ? "EN" : "FR"}
        </button>
        <Link
          href="/login"
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          {t("selector.login")}
        </Link>
      </div>
    </nav>
  );
}
