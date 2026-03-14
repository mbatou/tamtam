"use client";

import Link from "next/link";
import SoundWave from "@/components/ui/SoundWave";
import { useTranslation } from "@/lib/i18n";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-center gap-1 py-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-[2px] bg-gradient-to-t from-primary/20 to-primary-light/10 rounded-full animate-wave-bar"
              style={{
                height: `${8 + Math.sin(i * 0.5) * 8}px`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>
      <footer className="px-4 sm:px-6 py-10 sm:py-14 border-t border-white/5 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl font-black gradient-text">Tamtam</span>
              <SoundWave bars={3} className="h-3 opacity-40" />
            </div>
            <p className="text-xs text-white/30 leading-relaxed mb-4">
              {t("footer.tagline")}
            </p>
            <a href="mailto:contact@tamma.me" className="text-xs text-secondary/70 hover:text-secondary transition font-semibold">
              contact@tamma.me
            </a>
          </div>

          {/* Échos */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
              {t("footer.echos")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="text-sm text-white/30 hover:text-white/60 transition">
                  {t("footer.becomeEcho")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-white/30 hover:text-white/60 transition">
                  {t("footer.login")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Marques */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
              {t("footer.brands")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#pour-les-marques" className="text-sm text-white/30 hover:text-white/60 transition">
                  {t("footer.launchCampaign")}
                </Link>
              </li>
              <li>
                <Link href="/login?tab=batteur" className="text-sm text-white/30 hover:text-white/60 transition">
                  {t("footer.brandSpace")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
              {t("footer.legal")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-white/30 hover:text-white/60 transition">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/30 hover:text-white/60 transition">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Built by Lupandu
          </p>
          <a href="mailto:contact@tamma.me" className="text-xs text-white/20 hover:text-white/40 transition">
            contact@tamma.me
          </a>
        </div>
      </footer>
    </>
  );
}
