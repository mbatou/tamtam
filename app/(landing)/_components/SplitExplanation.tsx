"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useQueryString } from "./useQueryString";

export default function SplitExplanation() {
  const qs = useQueryString();
  const { t } = useTranslation();

  const brandBullets = [
    t("landing.split.brandBullet1"),
    t("landing.split.brandBullet2"),
    t("landing.split.brandBullet3"),
    t("landing.split.brandBullet4"),
  ];

  const echoBullets = [
    t("landing.split.echoBullet1"),
    t("landing.split.echoBullet2"),
    t("landing.split.echoBullet3"),
    t("landing.split.echoBullet4"),
  ];

  return (
    <section id="echos" className="py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-white/40 mb-3">
            {t("landing.split.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] mb-3">{t("landing.split.title")}</h2>
          <p className="font-dm text-[14px] text-white/50">
            {t("landing.split.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Brand card */}
          <div className="bg-[#160E08] border border-tt-orange/40 border-l-[3px] rounded-r-[14px] p-8">
            <div className="inline-flex items-center gap-2 bg-tt-orange/10 text-tt-orange text-[11px] font-dm font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-tt-orange" />
              {t("landing.split.brandBadge")}
            </div>
            <h3 className="font-syne font-bold text-[22px] mb-4 leading-tight whitespace-pre-line">
              {t("landing.split.brandTitle")}
            </h3>
            <div className="space-y-3 mb-6">
              {brandBullets.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[14px] font-dm text-white/60">
                  <ArrowRight size={14} className="text-tt-orange mt-1 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href={`/register${qs}`}
              aria-label={t("landing.hero.ctaBrandAria")}
              className="block w-full bg-tt-orange hover:bg-tt-orange-dark text-white text-center font-dm font-semibold text-[14px] py-3 rounded-[10px] transition-colors mb-3"
            >
              {t("landing.split.brandCta")} <ArrowRight size={14} className="inline ml-1" />
            </Link>
            <p className="text-[11px] font-dm text-white/30 text-center">
              {t("landing.split.brandCtaSub")}
            </p>
          </div>

          {/* Écho card */}
          <div className="bg-[#0A1F16] border border-tt-teal/40 border-l-[3px] rounded-r-[14px] p-8">
            <div className="inline-flex items-center gap-2 bg-tt-teal/10 text-tt-teal text-[11px] font-dm font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-tt-teal" />
              {t("landing.split.echoBadge")}
            </div>
            <h3 className="font-syne font-bold text-[22px] mb-4 leading-tight whitespace-pre-line">
              {t("landing.split.echoTitle")}
            </h3>
            <div className="space-y-3 mb-6">
              {echoBullets.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[14px] font-dm text-white/60">
                  <ArrowRight size={14} className="text-tt-teal mt-1 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href={`/register${qs}`}
              aria-label={t("landing.hero.ctaEchoAria")}
              className="block w-full border-[1.5px] border-tt-teal text-tt-teal hover:bg-tt-teal/10 text-center font-dm font-semibold text-[14px] py-3 rounded-[10px] transition-colors mb-3"
            >
              {t("landing.split.echoCta")} <ArrowRight size={14} className="inline ml-1" />
            </Link>
            <p className="text-[11px] font-dm text-white/30 text-center">
              {t("landing.split.echoCtaSub")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
