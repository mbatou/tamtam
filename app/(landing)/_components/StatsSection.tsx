"use client";

import { useTranslation } from "@/lib/i18n";
import CountUp from "./CountUp";

export default function StatsSection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              <CountUp target={1400} suffix="+" />
            </div>
            <p className="font-dm text-[13px] text-white/40">{t("landing.stats.echosLabel")}</p>
          </div>

          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              <CountUp target={40} suffix="+" />
            </div>
            <p className="font-dm text-[13px] text-white/40">{t("landing.stats.citiesLabel")}</p>
          </div>

          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              50 FCFA
            </div>
            <p className="font-dm text-[13px] text-white/40">{t("landing.stats.cpcLabel")}</p>
            <p className="text-[11px] text-white/30 mt-1 font-dm">{t("landing.stats.cpcBenchmark")}</p>
          </div>

          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              2,5x
            </div>
            <p className="font-dm text-[13px] text-white/40">{t("landing.stats.multiplierLabel")}</p>
            <p className="text-[11px] text-white/30 mt-1 font-dm">{t("landing.stats.multiplierBenchmark")}</p>
          </div>
        </div>

        <p className="font-dm text-[16px] text-white/50 text-center italic max-w-[500px] mx-auto leading-relaxed">
          &ldquo;{t("landing.stats.pullQuote")}&rdquo;
        </p>
      </div>
    </section>
  );
}
