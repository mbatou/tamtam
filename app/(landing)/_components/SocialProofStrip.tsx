"use client";

import { useTranslation } from "@/lib/i18n";

export default function SocialProofStrip() {
  const { t } = useTranslation();
  const brands = ["Tiak-Tiak", "Boostmate", "Sikili"];

  return (
    <section className="bg-[#111128] border-y border-white/[0.07] py-5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 whitespace-nowrap flex-shrink-0 font-dm">
            {t("landing.socialProof.label")}
          </span>

          <div className="hidden sm:block w-px h-5 bg-white/10 flex-shrink-0" />

          <div className="overflow-hidden w-full">
            <div className="flex gap-10 items-center animate-marquee sm:animate-none sm:justify-center sm:flex-wrap">
              {brands.map((brand) => (
                <span key={brand} className="text-[13px] font-medium text-white/50 whitespace-nowrap hover:text-white/80 transition-colors font-dm">
                  {brand}
                </span>
              ))}
              <div className="flex gap-10 items-center sm:hidden" aria-hidden="true">
                {brands.map((brand) => (
                  <span key={brand + "-dup"} className="text-[13px] font-medium text-white/50 whitespace-nowrap font-dm">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
            <span className="text-[11px] text-white/35 font-dm">{t("landing.socialProof.trustStat")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
