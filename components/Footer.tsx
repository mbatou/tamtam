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
            <p className="text-xs text-white/30 leading-relaxed mb-3">
              {t("footer.tagline")}
            </p>
            <p className="text-[10px] text-white/20 mb-2">Dakar, Sénégal 🇸🇳</p>
            <a href="mailto:support@tamma.me" className="text-xs text-secondary/70 hover:text-secondary transition font-semibold block mb-1">
              support@tamma.me
            </a>
            <a href="https://wa.me/221781633495" target="_blank" rel="noopener noreferrer" className="text-xs text-[#25D366]/70 hover:text-[#25D366] transition font-semibold flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              +221 78 163 34 95
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
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <a href="mailto:support@tamma.me" className="text-xs text-white/20 hover:text-white/40 transition">
            support@tamma.me
          </a>
        </div>
      </footer>
    </>
  );
}
