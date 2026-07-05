"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { useQueryString } from "./useQueryString";

export default function FinalCTA() {
  const qs = useQueryString();
  const { t } = useTranslation();

  return (
    <section className="bg-[#0A0A1A] py-24 md:py-32 text-center relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(211,84,0,0.05) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(29,158,117,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
          <span className="text-[12px] text-white/35 font-dm">
            {t("landing.finalCta.credibility")}
          </span>
        </div>

        <h2 className="text-[36px] md:text-[44px] font-black text-white tracking-[-1px] mb-10 font-syne">
          {t("landing.finalCta.title")}
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/register${qs}`}
              aria-label={t("landing.hero.ctaBrandAria")}
              className="w-full sm:w-auto bg-[#D35400] text-white px-10 py-4 rounded-[10px] text-[15px] font-bold font-dm hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              {t("landing.finalCta.ctaBrand")}
            </Link>
            <span className="text-[11px] text-white/25 font-dm">
              {t("landing.finalCta.ctaBrandSub")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/register${qs}`}
              aria-label={t("landing.hero.ctaEchoAria")}
              className="w-full sm:w-auto border-[1.5px] border-[#1D9E75] text-[#1D9E75] px-10 py-4 rounded-[10px] text-[15px] font-bold font-dm hover:bg-[rgba(29,158,117,0.08)] transition-colors flex items-center justify-center gap-2"
            >
              {t("landing.finalCta.ctaEcho")}
            </Link>
            <span className="text-[11px] text-white/25 font-dm">
              {t("landing.finalCta.ctaEchoSub")}
            </span>
          </div>
        </div>

        <p className="mt-8 text-[13px] text-white/25 font-dm">
          {t("landing.finalCta.loginPrompt")}{" "}
          <Link href="/login" className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors">
            {t("landing.finalCta.loginLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}
