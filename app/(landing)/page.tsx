"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Menu, X, ChevronDown, ArrowRight,
  Smartphone, ShoppingBag, Users, Check, Minus,
  Eye,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// ── Helpers ──

function useQueryString() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function CountUp({ target, suffix = "", className = "" }: { target: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || target === 0) return;
    const duration = 1200;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref} className={className}>
      {isInView ? new Intl.NumberFormat("fr-FR").format(count) : "0"}
      {suffix}
    </span>
  );
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Main Page ──

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tt-night" />}>
      <LandingContent />
    </Suspense>
  );
}

function LandingContent() {
  return (
    <main className="bg-tt-night text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <SocialProofStrip />
      <SplitExplanation />
      <HowItWorks />
      <StatsSection />
      <Testimonials />
      <UseCases />
      <PixelCallout />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

// ══════════════════════════════════════════════════
// SECTION 1: Navbar
// ══════════════════════════════════════════════════

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const qs = useQueryString();
  const { t } = useTranslation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: t("landing.nav.howItWorks"), href: "#comment-ca-marche" },
    { label: t("landing.nav.brands"), href: "#marques" },
    { label: t("landing.nav.becomeEcho"), href: "#echos" },
    { label: t("landing.nav.faq"), href: "#faq" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-tt-night/90 backdrop-blur-xl border-b border-white/[0.07]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image
            src="/brand/tamtam-horizontal-orange.png"
            alt="Tamtam"
            width={120}
            height={32}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-dm text-white/55 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold bg-tt-orange text-white px-4 py-2 rounded-lg hover:bg-tt-orange-dark transition-colors"
          >
            {t("landing.nav.iAmBrand")}
          </Link>
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold text-tt-teal border border-tt-teal/60 px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
          >
            {t("landing.nav.becomeEchoShort")}
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white/60 hover:text-white p-1"
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-tt-night/95 backdrop-blur-xl border-b border-white/[0.07] overflow-hidden"
          >
            <div className="px-5 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm font-dm text-white/60 hover:text-white py-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.07]">
                <Link
                  href={`/register${qs}`}
                  className="text-sm font-dm font-semibold bg-tt-orange text-white text-center px-4 py-2.5 rounded-lg"
                >
                  {t("landing.nav.iAmBrand")}
                </Link>
                <Link
                  href={`/register${qs}`}
                  className="text-sm font-dm font-semibold text-tt-teal border border-tt-teal/60 text-center px-4 py-2.5 rounded-lg"
                >
                  {t("landing.nav.becomeEchoShort")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ══════════════════════════════════════════════════
// SECTION 2: Hero
// ══════════════════════════════════════════════════

function Hero() {
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

// ══════════════════════════════════════════════════
// SECTION 3: Social proof strip
// ══════════════════════════════════════════════════

function SocialProofStrip() {
  const { t } = useTranslation();
  const brands = ["Tiak-Tiak", "Boostmate", "SIAME", "Linguema", "Sikili"];

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

// ══════════════════════════════════════════════════
// SECTION 4: Split explanation
// ══════════════════════════════════════════════════

function SplitExplanation() {
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

// ══════════════════════════════════════════════════
// SECTION 5: How it works
// ══════════════════════════════════════════════════

function HowItWorks() {
  const [tab, setTab] = useState<"brand" | "echo">("brand");
  const qs = useQueryString();
  const { t } = useTranslation();

  const brandSteps = [
    { title: t("landing.howItWorks.brandStep1Title"), desc: t("landing.howItWorks.brandStep1Desc") },
    { title: t("landing.howItWorks.brandStep2Title"), desc: t("landing.howItWorks.brandStep2Desc") },
    { title: t("landing.howItWorks.brandStep3Title"), desc: t("landing.howItWorks.brandStep3Desc") },
  ];

  const echoSteps = [
    { title: t("landing.howItWorks.echoStep1Title"), desc: t("landing.howItWorks.echoStep1Desc") },
    { title: t("landing.howItWorks.echoStep2Title"), desc: t("landing.howItWorks.echoStep2Desc") },
    { title: t("landing.howItWorks.echoStep3Title"), desc: t("landing.howItWorks.echoStep3Desc") },
  ];

  const steps = tab === "brand" ? brandSteps : echoSteps;
  const accentColor = tab === "brand" ? "#D35400" : "#1D9E75";

  return (
    <section
      id="comment-ca-marche"
      className="bg-tt-ivory py-20 md:py-28 px-5 border-t-2"
      style={{ borderTopColor: accentColor }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-tt-night/40 mb-3">
            {t("landing.howItWorks.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] text-tt-night">
            {t("landing.howItWorks.title")}
          </h2>
        </div>

        <div className="flex justify-center mb-14">
          <div className="flex bg-black/[0.06] rounded-[12px] p-1 gap-1">
            <button
              onClick={() => setTab("brand")}
              role="tab"
              aria-selected={tab === "brand"}
              className={`flex items-center gap-2 px-6 py-3 rounded-[10px] text-[13px] font-semibold font-dm transition-all duration-200 ${
                tab === "brand"
                  ? "bg-[#D35400] text-white shadow-sm"
                  : "text-black/40 hover:text-black/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              {t("landing.howItWorks.tabBrand")}
            </button>
            <button
              onClick={() => setTab("echo")}
              role="tab"
              aria-selected={tab === "echo"}
              className={`flex items-center gap-2 px-6 py-3 rounded-[10px] text-[13px] font-semibold font-dm transition-all duration-200 ${
                tab === "echo"
                  ? "bg-[#1D9E75] text-white shadow-sm"
                  : "text-black/40 hover:text-black/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              {t("landing.howItWorks.tabEcho")}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-0"
          >
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center">
                <div className="flex flex-col items-center text-center gap-4 flex-1">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black font-syne flex-shrink-0"
                    style={{ background: accentColor }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0A0A1A] mb-1.5 font-syne">{step.title}</h3>
                    <p className="text-[13px] text-black/50 leading-relaxed max-w-[200px] mx-auto font-dm">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {i < 2 && (
                  <div className="hidden md:flex items-center justify-center flex-shrink-0 w-12 mt-8">
                    <div
                      className="w-full h-px border-t-[1.5px] border-dashed"
                      style={{ borderColor: tab === "echo" ? "rgba(29,158,117,0.4)" : "rgba(211,84,0,0.4)" }}
                    />
                    <div
                      className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] -ml-px"
                      style={{ borderLeftColor: tab === "echo" ? "rgba(29,158,117,0.4)" : "rgba(211,84,0,0.4)" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center mt-12">
          {tab === "brand" ? (
            <Link
              href={`/register${qs}`}
              className="bg-[#D35400] text-white px-8 py-3.5 rounded-[10px] text-[13px] font-semibold font-dm hover:brightness-110 transition-all"
            >
              {t("landing.howItWorks.ctaBrand")}
            </Link>
          ) : (
            <Link
              href={`/register${qs}`}
              className="border-[1.5px] border-[#1D9E75] text-[#1D9E75] px-8 py-3.5 rounded-[10px] text-[13px] font-semibold font-dm hover:bg-[rgba(29,158,117,0.08)] transition-colors"
            >
              {t("landing.howItWorks.ctaEcho")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 6: Stats
// ══════════════════════════════════════════════════

function StatsSection() {
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

// ══════════════════════════════════════════════════
// SECTION 7: Testimonials
// ══════════════════════════════════════════════════

function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
    {
      quote: t("landing.testimonials.t1Quote"),
      name: t("landing.testimonials.t1Name"),
      detail: t("landing.testimonials.t1Company"),
      type: "brand" as const,
    },
    {
      quote: t("landing.testimonials.t2Quote"),
      name: t("landing.testimonials.t2Name"),
      detail: t("landing.testimonials.t2Location"),
      type: "echo" as const,
    },
    {
      quote: t("landing.testimonials.t3Quote"),
      name: t("landing.testimonials.t3Name"),
      detail: t("landing.testimonials.t3Location"),
      type: "echo" as const,
    },
  ];

  return (
    <section className="bg-[#111128] py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 text-center mb-3 font-dm">
          {t("landing.testimonials.sectionLabel")}
        </p>
        <h2 className="text-[28px] md:text-[32px] font-black text-white text-center mb-12 tracking-[-0.5px] font-syne">
          {t("landing.testimonials.title")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((tm, i) => (
            <div
              key={i}
              className="bg-[#141420] border border-white/[0.07] rounded-[14px] p-6"
              style={{
                borderLeft: `2px solid ${tm.type === "brand" ? "#D35400" : "#1D9E75"}`,
                borderRadius: "0 14px 14px 0",
              }}
            >
              <p className="text-[13px] text-white/70 leading-relaxed italic mb-5 font-dm">
                &ldquo;{tm.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white font-dm">{tm.name}</p>
                  <p className="text-[11px] text-white/35 font-dm">{tm.detail}</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full font-dm"
                  style={{
                    background: tm.type === "brand" ? "rgba(211,84,0,0.15)" : "rgba(29,158,117,0.12)",
                    color: tm.type === "brand" ? "#F0997B" : "#5DCAA5",
                  }}
                >
                  {tm.type === "brand" ? t("landing.testimonials.badgeBrand") : t("landing.testimonials.badgeEcho")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 8: Use cases
// ══════════════════════════════════════════════════

function UseCases() {
  const { t } = useTranslation();

  const cases = [
    {
      icon: Smartphone,
      title: t("landing.useCases.case1Title"),
      desc: t("landing.useCases.case1Desc"),
      detail: t("landing.useCases.case1Detail"),
    },
    {
      icon: ShoppingBag,
      title: t("landing.useCases.case2Title"),
      desc: t("landing.useCases.case2Desc"),
      detail: t("landing.useCases.case2Detail"),
    },
    {
      icon: Users,
      title: t("landing.useCases.case3Title"),
      desc: t("landing.useCases.case3Desc"),
      detail: t("landing.useCases.case3Detail"),
    },
  ];

  const tableRows = [
    { label: t("landing.useCases.rowCpc"), tamtam: t("landing.useCases.tamtamCpc"), meta: t("landing.useCases.metaCpc"), bao: t("landing.useCases.baoMeasure") },
    { label: t("landing.useCases.rowTargeting"), tamtam: t("landing.useCases.tamtamTarget"), meta: t("landing.useCases.metaTarget"), bao: "—" },
    { label: t("landing.useCases.rowAudience"), tamtam: t("landing.useCases.tamtamAudience"), meta: t("landing.useCases.metaAudience"), bao: "—" },
    { label: t("landing.useCases.rowPixel"), tamtam: "check", meta: "check", bao: "x" },
    { label: t("landing.useCases.rowMinCost"), tamtam: t("landing.useCases.tamtamMin"), meta: t("landing.useCases.metaMin"), bao: "—" },
  ];

  return (
    <section id="marques" className="py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-white/40 mb-3">
            {t("landing.useCases.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px]">
            {t("landing.useCases.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {cases.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="bg-tt-night-2 border border-white/[0.07] border-l-2 border-l-tt-orange rounded-[14px] p-6">
                <Icon size={28} className="text-tt-orange mb-4" />
                <h3 className="font-syne font-bold text-[16px] mb-2">{c.title}</h3>
                <p className="font-dm text-[13px] text-white/55 leading-relaxed mb-4">{c.desc}</p>
                <p className="font-dm text-[11px] text-tt-orange/70">{c.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-tt-night-2 border border-white/[0.07] rounded-[14px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] font-dm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="text-left p-4 text-white/30 font-medium" />
                  <th className="p-4 text-center bg-tt-orange/10 text-tt-orange font-bold">{t("landing.useCases.tableHeader")}</th>
                  <th className="p-4 text-center text-white/40 font-medium">{t("landing.useCases.tableMeta")}</th>
                  <th className="p-4 text-center text-white/40 font-medium hidden sm:table-cell">{t("landing.useCases.tableBao")}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    <td className="p-4 text-white/50">{row.label}</td>
                    <td className="p-4 text-center bg-tt-orange/5 text-white font-medium">
                      {row.tamtam === "check" ? <Check size={16} className="mx-auto text-tt-teal" /> : row.tamtam}
                    </td>
                    <td className="p-4 text-center text-white/40">
                      {row.meta === "check" ? <Check size={16} className="mx-auto text-tt-teal" /> : row.meta}
                    </td>
                    <td className="p-4 text-center text-white/30 hidden sm:table-cell">
                      {row.bao === "x" ? <Minus size={16} className="mx-auto text-white/20" /> : row.bao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 9: Pixel callout
// ══════════════════════════════════════════════════

function PixelCallout() {
  const { t } = useTranslation();

  const bullets = [
    t("landing.pixel.bullet1"),
    t("landing.pixel.bullet2"),
    t("landing.pixel.bullet3"),
    t("landing.pixel.bullet4"),
  ];

  return (
    <section className="bg-tt-night-2 py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-tt-orange mb-3">
            {t("landing.pixel.sectionLabel")}
          </p>
          <h2 className="font-syne font-bold text-[24px] md:text-[28px] mb-6 leading-tight">
            {t("landing.pixel.title")}
          </h2>
          <div className="space-y-3 mb-8">
            {bullets.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-[14px] font-dm text-white/60">
                <Check size={16} className="text-tt-teal mt-0.5 shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/pixel"
            className="inline-flex items-center gap-2 bg-tt-orange hover:bg-tt-orange-dark text-white font-dm font-semibold text-[14px] px-6 py-3 rounded-[10px] transition-colors"
          >
            {t("landing.pixel.cta")} <ArrowRight size={16} />
          </Link>
          <p className="text-[11px] font-dm text-white/30 mt-3">
            {t("landing.pixel.ctaSub")}
          </p>
        </div>

        <div className="bg-[#141420] border border-white/[0.07] rounded-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-tt-orange" />
              <span className="text-[12px] font-dm font-bold text-white/70">{t("landing.pixel.mockupTitle")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tt-teal animate-pulse" />
              <span className="text-[11px] font-dm text-tt-teal">{t("landing.pixel.mockupActive")}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/[0.07] px-5 py-5">
            {[
              { value: "200", label: t("landing.pixel.mockupClicks"), sub: null },
              { value: "76", label: t("landing.pixel.mockupSignups"), sub: "38%" },
              { value: "50", label: t("landing.pixel.mockupActivations"), sub: "65.8%" },
            ].map((s, i) => (
              <div key={i} className="text-center px-2">
                <p className="font-syne font-bold text-[24px] text-white">{s.value}</p>
                <p className="text-[11px] font-dm text-white/40">{s.label}</p>
                {s.sub && <p className="text-[10px] font-dm text-tt-teal">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="px-5 pb-5 space-y-2">
            <p className="text-[10px] font-dm font-semibold text-white/30 uppercase tracking-wider mb-2">{t("landing.pixel.mockupFunnel")}</p>
            {[
              { width: "100%", label: t("landing.pixel.funnelClicks"), color: "bg-tt-orange" },
              { width: "38%", label: t("landing.pixel.funnelSignups"), color: "bg-tt-orange/60" },
              { width: "25%", label: t("landing.pixel.funnelActive"), color: "bg-tt-teal" },
            ].map((bar, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${bar.color} rounded-full`} style={{ width: bar.width }} />
                </div>
                <span className="text-[11px] font-dm text-white/40 w-20 text-right">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 10: FAQ
// ══════════════════════════════════════════════════

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  const faqs = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1"), side: "brand" },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2"), side: "echo" },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3"), side: "brand" },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4"), side: "echo" },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5"), side: "brand" },
    { q: t("landing.faq.q6"), a: t("landing.faq.a6"), side: "echo" },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 text-center mb-3 font-dm">{t("landing.faq.sectionLabel")}</p>
        <h2 className="text-[28px] md:text-[32px] font-black text-white text-center mb-12 tracking-[-0.5px] font-syne">
          {t("landing.faq.title")}
        </h2>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-[#111128] border border-white/[0.07] rounded-[10px] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={openIndex === i}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: faq.side === "brand" ? "#D35400" : "#1D9E75" }}
                  />
                  <span className="text-[13px] font-medium text-white font-dm">{faq.q}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4 pl-10">
                  <p className="text-[13px] text-white/55 leading-relaxed font-dm">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 11: Final CTA
// ══════════════════════════════════════════════════

function FinalCTA() {
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

// ══════════════════════════════════════════════════
// SECTION 12: Footer
// ══════════════════════════════════════════════════

function Footer() {
  const qs = useQueryString();
  const { t } = useTranslation();

  return (
    <footer className="bg-[#0D0D20] border-t border-white/[0.07] pt-12 pb-6 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              className="h-7 w-auto mb-3"
            />
            <p className="font-dm text-[13px] text-white/40 leading-relaxed mb-4">
              {t("landing.footer.tagline")}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white transition-colors text-[12px] font-dm"
              >
                Instagram
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white transition-colors text-[12px] font-dm"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              {t("landing.footer.platform")}
            </p>
            <ul className="space-y-2">
              {[
                { label: t("landing.footer.howItWorks"), href: "#comment-ca-marche" },
                { label: t("landing.footer.useCases"), href: "#marques" },
                { label: t("landing.footer.pixel"), href: "#pixel" },
                { label: t("landing.footer.faq"), href: "#faq" },
              ].map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              {t("landing.footer.legal")}
            </p>
            <ul className="space-y-2">
              {[
                { label: t("landing.footer.terms"), href: "/cgu" },
                { label: t("landing.footer.privacy"), href: "/confidentialite" },
                { label: t("landing.footer.about"), href: "/a-propos" },
              ].map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              {t("landing.footer.joinTamtam")}
            </p>
            <div className="space-y-2">
              <Link
                href={`/register${qs}`}
                className="block bg-tt-orange text-white text-center font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-tt-orange-dark transition-colors"
              >
                {t("landing.footer.launchCampaign")}
              </Link>
              <Link
                href={`/register${qs}`}
                className="block border border-tt-teal/60 text-tt-teal text-center font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
              >
                {t("landing.footer.becomeEcho")}
              </Link>
              <Link
                href="/login"
                className="block text-center font-dm text-[12px] text-white/30 hover:text-white/50 transition-colors py-1"
              >
                {t("landing.footer.login")}
              </Link>
            </div>
            <div className="mt-4">
              <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-1">
                {t("landing.footer.contact")}
              </p>
              <a
                href="mailto:contact@tamma.me"
                className="font-dm text-[13px] text-white/40 hover:text-white transition-colors"
              >
                contact@tamma.me
              </a>
              <p className="font-dm text-[12px] text-white/25 mt-1">Dakar, Sénégal</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-5 text-center">
          <p className="font-dm text-[11px] text-white/25">
            {t("landing.footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
