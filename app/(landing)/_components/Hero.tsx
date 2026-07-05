"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useQueryString } from "./useQueryString";
import FadeUp from "./FadeUp";

export default function Hero() {
  const qs = useQueryString();
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 400,
          top: "30%", right: "20%",
          background: "radial-gradient(ellipse at center, rgba(211,84,0,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 300,
          bottom: "20%", left: "10%",
          background: "radial-gradient(ellipse at center, rgba(29,158,117,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Floating chips — hidden on mobile, visible md+ */}
      <div className="hidden md:block" aria-hidden="true">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute top-[15%] right-[8%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          {t("landing.hero.chip1")}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="absolute top-[28%] left-[5%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 3.5s ease-in-out infinite", animationDelay: "0.8s" }}
        >
          {t("landing.hero.chip2")}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="absolute bottom-[22%] left-[6%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 2.8s ease-in-out infinite", animationDelay: "1.5s" }}
        >
          {t("landing.hero.chip3")}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.5 }}
          className="absolute bottom-[18%] right-[6%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 4s ease-in-out infinite", animationDelay: "0.3s" }}
        >
          {t("landing.hero.chip4")}
        </motion.div>
      </div>

      {/* Hero content centered */}
      <div className="relative z-10 text-center px-5 max-w-[680px]">
        <FadeUp delay={0}>
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-tt-orange animate-pulse" />
            <span className="text-[12px] font-dm text-white/60">
              {t("landing.hero.badgeText")}
            </span>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1 className="font-syne text-[36px] md:text-[48px] xl:text-[60px] font-black leading-[1.1] tracking-[-1.5px] text-white mb-5">
            {t("landing.hero.titleStart")}{" "}
            <br className="hidden sm:block" />
            {t("landing.hero.titleEnd")}{" "}
            <span className="bg-tt-orange text-white px-3 py-1 rounded-lg inline-block">
              {t("landing.hero.titleHighlight")}
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="text-[15px] md:text-[16px] leading-[1.65] text-white/55 max-w-[520px] mx-auto text-center font-dm mb-8">
            {t("landing.hero.subtitleStart")}{" "}
            <span className="text-white/80">{t("landing.hero.subtitleEchos")}</span>{" "}
            {t("landing.hero.subtitleMid")}{" "}
            <span className="text-white/80">{t("landing.hero.subtitleCpc")}</span> {t("landing.hero.subtitleEnd")}
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link
              href={`/register${qs}`}
              aria-label={t("landing.hero.ctaBrandAria")}
              onClick={() => {
                if (typeof window !== "undefined") {
                  const w = window as unknown as Record<string, unknown>;
                  if (w.tamtam) (w as unknown as { tamtam: { track: (e: string) => void } }).tamtam.track("brand_cta_click");
                  if (w.plausible) (w.plausible as (e: string) => void)("Brand CTA Click");
                }
              }}
              className="w-full sm:w-auto bg-[#D35400] text-white font-dm font-semibold text-[14px] px-7 py-[14px] rounded-[10px] transition-colors hover:brightness-110 flex items-center justify-center gap-2"
            >
              {t("landing.hero.ctaBrand")}
              <ArrowRight size={16} />
            </Link>
            <Link
              href={`/register${qs}`}
              aria-label={t("landing.hero.ctaEchoAria")}
              onClick={() => {
                if (typeof window !== "undefined") {
                  const w = window as unknown as Record<string, unknown>;
                  if (w.tamtam) (w as unknown as { tamtam: { track: (e: string) => void } }).tamtam.track("echo_cta_click");
                  if (w.plausible) (w.plausible as (e: string) => void)("Écho CTA Click");
                }
              }}
              className="w-full sm:w-auto border-[1.5px] border-[#1D9E75] text-[#1D9E75] font-dm font-semibold text-[14px] px-8 py-[14px] rounded-[10px] hover:bg-[rgba(29,158,117,0.08)] transition-colors flex items-center justify-center gap-2"
            >
              {t("landing.hero.ctaEcho")}
              <ArrowRight size={16} />
            </Link>
          </div>
        </FadeUp>

        <FadeUp delay={0.4}>
          <p className="text-[11px] font-dm text-white/30">
            {t("landing.hero.helperText")} <ChevronDown size={12} className="inline" />
          </p>
          <p className="text-[12px] font-dm text-white/25 mt-2">
            {t("landing.hero.alreadyMember")}{" "}
            <Link
              href="/login"
              className="text-white/45 hover:text-white/70 underline underline-offset-2 transition-colors"
            >
              {t("landing.hero.loginLink")} →
            </Link>
          </p>
        </FadeUp>
      </div>

      {/* On mobile: show ONE chip below the CTAs, centered */}
      <div className="flex md:hidden justify-center mt-4" aria-hidden="true">
        <div className="bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap animate-float">
          {t("landing.hero.chip3")}
        </div>
      </div>
    </section>
  );
}
