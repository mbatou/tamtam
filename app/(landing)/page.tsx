"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Menu, X, ChevronDown, ChevronRight, ArrowRight,
  Smartphone, ShoppingBag, Users, Check, Minus, Plus,
  MousePointerClick, Share2, Wallet, UserPlus, Eye, Target,
  BarChart3,
} from "lucide-react";

// ── Helpers ──

function useQueryString() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

function CountUp({ target, suffix = "", className = "" }: { target: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || target === 0) return;
    const duration = 1200;
    const steps = 40;
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

// ── Stagger animation wrapper ──

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Comment ça marche", href: "#comment-ca-marche" },
    { label: "Marques", href: "#marques" },
    { label: "Devenir Écho", href: "#echos" },
    { label: "FAQ", href: "#faq" },
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
        {/* Logo */}
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

        {/* Desktop nav links */}
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

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold bg-tt-orange text-white px-4 py-2 rounded-lg hover:bg-tt-orange-dark transition-colors"
          >
            Je suis une marque
          </Link>
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold text-tt-teal border border-tt-teal/60 px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
          >
            Devenir Écho
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white/60 hover:text-white p-1"
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
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
                  Je suis une marque
                </Link>
                <Link
                  href={`/register${qs}`}
                  className="text-sm font-dm font-semibold text-tt-teal border border-tt-teal/60 text-center px-4 py-2.5 rounded-lg"
                >
                  Devenir Écho
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

  const chips = [
    { text: "268 clics vérifiés · Tiak-Tiak", pos: "top-[18%] right-[8%] hidden lg:block", dur: "3s", delay: "0s" },
    { text: "+500 FCFA · Wave", pos: "bottom-[28%] left-[6%] hidden lg:block", dur: "3.5s", delay: "0.8s" },
    { text: "Moussa · Écho · Thiès", pos: "top-[28%] left-[5%] hidden lg:block", dur: "2.8s", delay: "1.5s" },
    { text: "Pixel actif · 3 conversions", pos: "bottom-[18%] right-[5%] hidden lg:block", dur: "4s", delay: "0.3s" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Orange glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 400,
          top: "30%", right: "20%",
          background: "radial-gradient(ellipse at center, rgba(211,84,0,0.07) 0%, transparent 70%)",
        }}
      />
      {/* Teal glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 300,
          bottom: "20%", left: "10%",
          background: "radial-gradient(ellipse at center, rgba(29,158,117,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-5 max-w-[700px] mx-auto py-20">
        {/* Badge */}
        <FadeUp delay={0}>
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-tt-orange animate-pulse" />
            <span className="text-[12px] font-dm text-white/60">
              1 400+ Échos actifs · 40+ villes · 50 FCFA par clic
            </span>
          </div>
        </FadeUp>

        {/* Headline */}
        <FadeUp delay={0.1}>
          <h1 className="font-syne font-[800] text-[36px] md:text-[52px] leading-[1.1] tracking-[-1px] mb-5">
            La pub qui passe{" "}
            <br className="hidden sm:block" />
            par vos{" "}
            <span className="bg-tt-orange text-white px-3 py-1 rounded-lg inline-block">
              vrais clients
            </span>
          </h1>
        </FadeUp>

        {/* Subheadline */}
        <FadeUp delay={0.2}>
          <p className="font-dm text-[15px] md:text-[16px] text-white/55 leading-relaxed max-w-[480px] mx-auto mb-8">
            Tamtam connecte les marques sénégalaises avec 1 400 Échos réels
            qui partagent sur WhatsApp Status.
            <br />
            50 FCFA par clic vérifié. Zéro algorithme.
          </p>
        </FadeUp>

        {/* Dual CTA */}
        <FadeUp delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link
              href={`/register${qs}`}
              aria-label="Je suis une marque — créer un compte Tamtam"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const w = window as unknown as Record<string, unknown>;
                  if (w.tamtam) (w as unknown as { tamtam: { track: (e: string) => void } }).tamtam.track("brand_cta_click");
                  if (w.plausible) (w.plausible as (e: string) => void)("Brand CTA Click");
                }
              }}
              className="w-full sm:w-auto bg-tt-orange hover:bg-tt-orange-dark text-white font-dm font-semibold text-[14px] px-7 py-3.5 rounded-[10px] transition-colors flex items-center justify-center gap-2"
            >
              Je suis une marque
              <ArrowRight size={16} />
            </Link>
            <Link
              href={`/register${qs}`}
              aria-label="Devenir Écho — créer un compte Tamtam"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const w = window as unknown as Record<string, unknown>;
                  if (w.tamtam) (w as unknown as { tamtam: { track: (e: string) => void } }).tamtam.track("echo_cta_click");
                  if (w.plausible) (w.plausible as (e: string) => void)("Écho CTA Click");
                }
              }}
              className="w-full sm:w-auto border-[1.5px] border-tt-teal text-tt-teal hover:bg-tt-teal/10 font-dm font-semibold text-[14px] px-7 py-3.5 rounded-[10px] transition-colors flex items-center justify-center gap-2"
            >
              Je veux gagner de l&apos;argent
              <ArrowRight size={16} />
            </Link>
          </div>
        </FadeUp>

        {/* Helper text */}
        <FadeUp delay={0.4}>
          <p className="text-[11px] font-dm text-white/30">
            Pas sûr de votre profil ? Faites défiler pour comprendre la différence <ChevronDown size={12} className="inline" />
          </p>
        </FadeUp>
      </div>

      {/* Floating chips */}
      {chips.map((chip, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
          className={`absolute ${chip.pos} bg-white/[0.04] border border-white/[0.1] rounded-full px-4 py-2 text-[12px] font-dm text-white/50 pointer-events-none`}
          style={{
            animation: `float ${chip.dur} ease-in-out infinite`,
            animationDelay: chip.delay,
          }}
        >
          {chip.text}
        </motion.div>
      ))}

      {/* Mobile chip — earnings one only */}
      <FadeUp delay={0.6} className="absolute bottom-24 left-1/2 -translate-x-1/2 lg:hidden">
        <div className="bg-white/[0.04] border border-white/[0.1] rounded-full px-4 py-2 text-[12px] font-dm text-white/50 animate-float whitespace-nowrap">
          +500 FCFA · Wave
        </div>
      </FadeUp>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 3: Social proof strip
// ══════════════════════════════════════════════════

function SocialProofStrip() {
  const brands = ["Tiak-Tiak", "Dakar Food", "SenCommerce", "AfriShop", "Yobale Ma"];

  return (
    <section className="bg-tt-night-2 border-y border-white/[0.07] py-5 overflow-hidden">
      <div className="flex items-center gap-4 max-w-7xl mx-auto px-5">
        <span className="text-[12px] font-dm text-white/30 whitespace-nowrap shrink-0">
          Ils nous font confiance :
        </span>
        {/* Desktop: static */}
        <div className="hidden md:flex items-center gap-6">
          {brands.map((b, i) => (
            <span key={i} className="text-[13px] font-dm font-medium text-white/50">
              {b}
            </span>
          ))}
        </div>
        {/* Mobile: marquee */}
        <div className="md:hidden overflow-hidden flex-1">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...brands, ...brands].map((b, i) => (
              <span key={i} className="text-[13px] font-dm font-medium text-white/50 mx-4">
                {b}
              </span>
            ))}
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

  return (
    <section id="echos" className="py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-white/40 mb-3">
            Deux côtés · Une plateforme
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] mb-3">Qui êtes-vous ?</h2>
          <p className="font-dm text-[14px] text-white/50">
            Pas sûr ? Voici la différence en 10 secondes.
          </p>
        </div>

        {/* Two cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Brand card */}
          <div className="bg-[#160E08] border border-tt-orange/40 border-l-[3px] rounded-r-[14px] p-8">
            <div className="inline-flex items-center gap-2 bg-tt-orange/10 text-tt-orange text-[11px] font-dm font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-tt-orange" />
              Vous êtes une marque
            </div>
            <h3 className="font-syne font-bold text-[22px] mb-4 leading-tight">
              Vous avez un produit<br />à promouvoir
            </h3>
            <div className="space-y-3 mb-6">
              {[
                "Vous créez une campagne en 5 minutes",
                "Des Sénégalais réels partagent votre lien",
                "Vous ne payez que les clics réels",
                "Dashboard analytics en temps réel",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[14px] font-dm text-white/60">
                  <ArrowRight size={14} className="text-tt-orange mt-1 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href={`/register${qs}`}
              className="block w-full bg-tt-orange hover:bg-tt-orange-dark text-white text-center font-dm font-semibold text-[14px] py-3 rounded-[10px] transition-colors mb-3"
            >
              Lancer ma première campagne <ArrowRight size={14} className="inline ml-1" />
            </Link>
            <p className="text-[11px] font-dm text-white/30 text-center">
              Aucun engagement. Résultats en quelques heures.
            </p>
          </div>

          {/* Écho card */}
          <div className="bg-[#0A1F16] border border-tt-teal/40 border-l-[3px] rounded-r-[14px] p-8">
            <div className="inline-flex items-center gap-2 bg-tt-teal/10 text-tt-teal text-[11px] font-dm font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-tt-teal" />
              Vous êtes un écho
            </div>
            <h3 className="font-syne font-bold text-[22px] mb-4 leading-tight">
              Vous voulez gagner<br />de l&apos;argent depuis votre téléphone
            </h3>
            <div className="space-y-3 mb-6">
              {[
                "Inscription gratuite en 2 minutes",
                "Choisissez les campagnes qui vous plaisent",
                "Partagez sur votre WhatsApp Status",
                "Recevez votre argent via Wave",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[14px] font-dm text-white/60">
                  <ArrowRight size={14} className="text-tt-teal mt-1 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href={`/register${qs}`}
              className="block w-full border-[1.5px] border-tt-teal text-tt-teal hover:bg-tt-teal/10 text-center font-dm font-semibold text-[14px] py-3 rounded-[10px] transition-colors mb-3"
            >
              Créer mon compte Écho <ArrowRight size={14} className="inline ml-1" />
            </Link>
            <p className="text-[11px] font-dm text-white/30 text-center">
              Gratuit. Aucune compétence requise.
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

  const brandSteps = [
    { icon: Target, title: "Créez votre campagne", desc: "Budget, lien, message. Lancé en 5 minutes." },
    { icon: Share2, title: "Les Échos partagent", desc: "1 400 vrais utilisateurs diffusent sur Status." },
    { icon: BarChart3, title: "Vous payez les clics réels", desc: "Tableau de bord temps réel. Zéro impression fantôme." },
  ];

  const echoSteps = [
    { icon: UserPlus, title: "Créez votre compte", desc: "Inscription gratuite, vérification simple." },
    { icon: MousePointerClick, title: "Choisissez une campagne", desc: "Parcourez les offres. Acceptez ce qui vous plaît." },
    { icon: Wallet, title: "Recevez votre argent", desc: "Wave payout automatique. 50 FCFA par clic vérifié." },
  ];

  const steps = tab === "brand" ? brandSteps : echoSteps;
  const accentColor = tab === "brand" ? "#D35400" : "#1D9E75";

  return (
    <section id="comment-ca-marche" className="bg-tt-ivory py-20 md:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-tt-night/40 mb-3">
            Comment ça marche
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] text-tt-night">
            Simple pour les deux côtés
          </h2>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex gap-1 bg-tt-night/5 p-1 rounded-xl">
            <button
              onClick={() => setTab("brand")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-dm font-semibold transition-all ${
                tab === "brand"
                  ? "bg-tt-orange text-white shadow-sm"
                  : "text-tt-night/50 hover:text-tt-night/70"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              Pour les Marques
            </button>
            <button
              onClick={() => setTab("echo")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-dm font-semibold transition-all ${
                tab === "echo"
                  ? "bg-tt-teal text-white shadow-sm"
                  : "text-tt-night/50 hover:text-tt-night/70"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              Pour les Échos
            </button>
          </div>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative text-center">
                  {/* Number */}
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-syne font-bold text-lg"
                    style={{ backgroundColor: accentColor }}
                  >
                    {i + 1}
                  </div>
                  {/* Icon */}
                  <Icon size={28} className="mx-auto mb-3" style={{ color: accentColor }} />
                  {/* Title */}
                  <h3 className="font-syne font-bold text-[16px] text-tt-night mb-2">{step.title}</h3>
                  {/* Description */}
                  <p className="font-dm text-[13px] text-tt-night/50 leading-relaxed">{step.desc}</p>
                  {/* Arrow connector (not for last step) */}
                  {i < 2 && (
                    <ChevronRight
                      size={20}
                      className="hidden md:block absolute top-10 -right-3 text-tt-night/20"
                    />
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 6: Stats
// ══════════════════════════════════════════════════

function StatsSection() {
  const stats = [
    { value: 1400, suffix: "+", label: "Échos actifs" },
    { value: 40, suffix: "+", label: "Villes couvertes" },
    { value: 50, suffix: " FCFA", label: "Par clic vérifié" },
    { value: 2.5, suffix: "x", label: "Moins cher que Meta", isDecimal: true },
  ];

  return (
    <section className="py-20 md:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
                {stat.isDecimal ? (
                  <span>{stat.value}{stat.suffix}</span>
                ) : (
                  <CountUp target={stat.value} suffix={stat.suffix} />
                )}
              </div>
              <p className="font-dm text-[13px] text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <p className="font-dm text-[16px] text-white/50 text-center italic max-w-[500px] mx-auto leading-relaxed">
          &ldquo;Le seul réseau qui connecte les marques sénégalaises
          avec leurs vrais clients — pas des algorithmes.&rdquo;
        </p>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 7: Testimonials
// ══════════════════════════════════════════════════

function Testimonials() {
  const testimonials = [
    {
      quote: "On a eu 268 clics vérifiés en 7 jours. Moins cher que Meta et beaucoup plus local.",
      name: "Cheikh",
      company: "Tiak-Tiak",
      type: "brand" as const,
      city: "Dakar",
    },
    {
      quote: "J'ai gagné 3 500 FCFA en une semaine juste en partageant. C'est direct sur Wave.",
      name: "Aminata F.",
      company: null,
      type: "echo" as const,
      city: "Ziguinchor",
    },
    {
      quote: "La différence c'est que c'est des vrais Sénégalais qui partagent, pas des bots.",
      name: "Moussa D.",
      company: null,
      type: "echo" as const,
      city: "Thiès",
    },
  ];

  return (
    <section className="bg-tt-night-2 py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-syne font-bold text-[28px] md:text-[32px] text-center mb-12">
          Ce qu&apos;ils disent
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`bg-[#141420] border border-white/[0.07] rounded-[14px] p-6 ${
                t.type === "brand" ? "border-l-2 border-l-tt-orange" : "border-l-2 border-l-tt-teal"
              }`}
            >
              <p className="font-dm text-[14px] text-white/75 italic leading-relaxed mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-dm text-[13px] font-bold text-white">
                    {t.name}{t.company ? `, ${t.company}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-dm font-semibold px-2.5 py-1 rounded-full ${
                    t.type === "brand"
                      ? "bg-tt-orange/10 text-tt-orange"
                      : "bg-tt-teal/10 text-tt-teal"
                  }`}
                >
                  {t.type === "brand" ? "Marque" : "Écho"} · {t.city}
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
  const cases = [
    {
      icon: Smartphone,
      title: "Application mobile",
      desc: "Votre app téléchargée par de vrais utilisateurs, pas des installs incentivés douteux.",
      detail: "CPC: 50 FCFA · Tracking: App installs via Pixel",
    },
    {
      icon: ShoppingBag,
      title: "E-commerce & Livraison",
      desc: "Touchez vos clients à Dakar, Thiès, Saint-Louis — là où votre livreur peut aller.",
      detail: "CPC: 50 FCFA · Exemple: Tiak-Tiak — 268 clics J+7",
    },
    {
      icon: Users,
      title: "Génération de leads",
      desc: "Collectez des inscriptions qualifiées. Le Tamtam Pixel trace chaque signup.",
      detail: "CPC: 50 FCFA · CPA Inscription moyen: 132 FCFA",
    },
  ];

  return (
    <section id="marques" className="py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-white/40 mb-3">
            Cas d&apos;usage
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px]">
            Tamtam marche pour ces marques
          </h2>
        </div>

        {/* Cards */}
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

        {/* Comparison table */}
        <div className="bg-tt-night-2 border border-white/[0.07] rounded-[14px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] font-dm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  <th className="text-left p-4 text-white/30 font-medium" />
                  <th className="p-4 text-center bg-tt-orange/10 text-tt-orange font-bold">Tamtam</th>
                  <th className="p-4 text-center text-white/40 font-medium">Meta Ads</th>
                  <th className="p-4 text-center text-white/40 font-medium hidden sm:table-cell">Bouche-à-oreille</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "CPC moyen", tamtam: "50 FCFA", meta: "84 FCFA+", bao: "Non mesurable" },
                  { label: "Ciblage", tamtam: "WhatsApp", meta: "Algo", bao: "—" },
                  { label: "Audience", tamtam: "Réelle", meta: "Estimée", bao: "—" },
                  { label: "Tracking pixel", tamtam: "check", meta: "check", bao: "x" },
                  { label: "Coût minimal", tamtam: "3 000 F", meta: "~5 000 F+", bao: "—" },
                ].map((row, i) => (
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
  return (
    <section className="bg-tt-night-2 py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        {/* Left text */}
        <div>
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-tt-orange mb-3">
            Tamtam Pixel
          </p>
          <h2 className="font-syne font-bold text-[24px] md:text-[28px] mb-6 leading-tight">
            Tracez tout. Payez seulement ce qui compte.
          </h2>
          <div className="space-y-3 mb-8">
            {[
              "Suivi des clics vérifiés en temps réel",
              "Entonnoir de conversion : clic → inscription → activation",
              "CPA par campagne (coût par inscription, coût par achat)",
              "Intégration en 5 minutes sur votre site",
            ].map((item, i) => (
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
            Configurer le Pixel <ArrowRight size={16} />
          </Link>
          <p className="text-[11px] font-dm text-white/30 mt-3">
            Disponible pour toutes les campagnes actives
          </p>
        </div>

        {/* Right — dashboard mockup */}
        <div className="bg-[#141420] border border-white/[0.07] rounded-[14px] overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-tt-orange" />
              <span className="text-[12px] font-dm font-bold text-white/70">TAMTAM PIXEL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tt-teal animate-pulse" />
              <span className="text-[11px] font-dm text-tt-teal">Actif</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-white/[0.07] px-5 py-5">
            {[
              { value: "200", label: "Clics vérifiés", sub: null },
              { value: "76", label: "Inscriptions", sub: "38%" },
              { value: "50", label: "Activations", sub: "65.8%" },
            ].map((s, i) => (
              <div key={i} className="text-center px-2">
                <p className="font-syne font-bold text-[24px] text-white">{s.value}</p>
                <p className="text-[11px] font-dm text-white/40">{s.label}</p>
                {s.sub && <p className="text-[10px] font-dm text-tt-teal">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Funnel */}
          <div className="px-5 pb-5 space-y-2">
            <p className="text-[10px] font-dm font-semibold text-white/30 uppercase tracking-wider mb-2">Entonnoir</p>
            {[
              { width: "100%", label: "200 clics", color: "bg-tt-orange" },
              { width: "38%", label: "76 inscrits", color: "bg-tt-orange/60" },
              { width: "25%", label: "50 actifs", color: "bg-tt-teal" },
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

  const brandFAQ = [
    {
      q: "Combien coûte le lancement d'une campagne ?",
      a: "Budget minimum 3 000 FCFA. Vous payez 50 FCFA par clic vérifié, et seulement quand un vrai visiteur clique votre lien.",
    },
    {
      q: "Comment savoir si les clics sont réels ?",
      a: "Chaque clic est validé côté serveur : vérification d'IP, détection de bot, empreinte appareil. Vous ne payez que les clics propres.",
    },
    {
      q: "Est-ce que je peux cibler une ville spécifique ?",
      a: "Tamtam couvre 40+ villes. Vous pouvez cibler par zone géographique lors de la création de votre campagne.",
    },
    {
      q: "Comment recharger mon wallet ?",
      a: "Via Wave ou virement bancaire. Le rechargement minimum est 5 000 FCFA.",
    },
  ];

  const echoFAQ = [
    {
      q: "Comment je reçois mon argent ?",
      a: "Directement sur votre Wave. Vous demandez un retrait depuis l'application, minimum 500 FCFA.",
    },
    {
      q: "Est-ce que c'est vraiment gratuit de s'inscrire ?",
      a: "Oui. Inscription gratuite, aucun abonnement, aucuns frais. Vous gagnez 50 FCFA pour chaque clic que votre Status génère.",
    },
    {
      q: "Est-ce que je peux choisir les campagnes ?",
      a: "Oui. Vous voyez les campagnes disponibles et vous choisissez celles qui correspondent à votre audience.",
    },
    {
      q: "Combien peut-on gagner par mois ?",
      a: "Ça dépend de votre nombre de contacts WhatsApp et de votre régularité. Certains Échos gagnent 5 000–15 000 FCFA/mois.",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-syne font-bold text-[28px] md:text-[32px] text-center mb-12">
          Questions fréquentes
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Brand column */}
          <div>
            <p className="text-[11px] font-dm font-semibold uppercase tracking-[0.1em] text-tt-orange mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tt-orange" />
              Pour les marques
            </p>
            <div className="space-y-1">
              {brandFAQ.map((item, i) => {
                const idx = i;
                const isOpen = openIndex === idx;
                return (
                  <div key={idx} className="bg-tt-night-2 border border-white/[0.07] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-syne text-[14px] font-bold pr-4">{item.q}</span>
                      {isOpen ? (
                        <Minus size={16} className="text-tt-orange shrink-0" />
                      ) : (
                        <Plus size={16} className="text-tt-orange shrink-0" />
                      )}
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 pb-4 px-4" : "max-h-0"}`}
                    >
                      <p className="font-dm text-[13px] text-white/50 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Écho column */}
          <div>
            <p className="text-[11px] font-dm font-semibold uppercase tracking-[0.1em] text-tt-teal mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tt-teal" />
              Pour les échos
            </p>
            <div className="space-y-1">
              {echoFAQ.map((item, i) => {
                const idx = i + 100;
                const isOpen = openIndex === idx;
                return (
                  <div key={idx} className="bg-tt-night-2 border border-white/[0.07] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-syne text-[14px] font-bold pr-4">{item.q}</span>
                      {isOpen ? (
                        <Minus size={16} className="text-tt-teal shrink-0" />
                      ) : (
                        <Plus size={16} className="text-tt-teal shrink-0" />
                      )}
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-40 pb-4 px-4" : "max-h-0"}`}
                    >
                      <p className="font-dm text-[13px] text-white/50 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

  return (
    <section className="relative py-24 md:py-32 px-5 overflow-hidden">
      {/* Decorative glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500,
          top: "-100px", right: "-100px",
          borderRadius: "50%",
          background: "rgba(211,84,0,0.05)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400,
          bottom: "-100px", left: "-100px",
          borderRadius: "50%",
          background: "rgba(29,158,117,0.04)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative z-10 text-center max-w-lg mx-auto">
        <h2 className="font-syne font-[800] text-[32px] md:text-[40px] leading-tight mb-8">
          Prêt à rejoindre Tamtam ?
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link
            href={`/register${qs}`}
            className="w-full sm:w-auto bg-tt-orange hover:bg-tt-orange-dark text-white font-dm font-semibold text-[14px] px-7 py-3.5 rounded-[10px] transition-colors flex items-center justify-center gap-2"
          >
            Je suis une marque <ArrowRight size={16} />
          </Link>
          <Link
            href={`/register${qs}`}
            className="w-full sm:w-auto border-[1.5px] border-tt-teal text-tt-teal hover:bg-tt-teal/10 font-dm font-semibold text-[14px] px-7 py-3.5 rounded-[10px] transition-colors flex items-center justify-center gap-2"
          >
            Devenir Écho <ArrowRight size={16} />
          </Link>
        </div>

        <p className="font-dm text-[13px] text-white/30">
          Déjà membre ?{" "}
          <Link href="/login" className="text-white/50 hover:text-white underline">
            Connectez-vous
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

  return (
    <footer className="bg-[#0D0D20] border-t border-white/[0.07] pt-12 pb-6 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/brand/tamtam-horizontal-orange.png"
              alt="Tamtam"
              width={120}
              height={32}
              className="h-7 w-auto mb-3"
            />
            <p className="font-dm text-[13px] text-white/40 leading-relaxed mb-4">
              La pub qui passe par vos vrais clients.
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

          {/* Col 2: Plateforme */}
          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              Plateforme
            </p>
            <ul className="space-y-2">
              {[
                { label: "Comment ça marche", href: "#comment-ca-marche" },
                { label: "Cas d'usage", href: "#marques" },
                { label: "Tamtam Pixel", href: "#pixel" },
                { label: "FAQ", href: "#faq" },
              ].map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Légal */}
          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              Légal
            </p>
            <ul className="space-y-2">
              {[
                { label: "Conditions d'utilisation", href: "/cgu" },
                { label: "Confidentialité", href: "/confidentialite" },
                { label: "À propos", href: "/a-propos" },
              ].map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="font-dm text-[13px] text-white/40 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Rejoindre */}
          <div>
            <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-3">
              Rejoindre Tamtam
            </p>
            <div className="space-y-2">
              <Link
                href={`/register${qs}`}
                className="block bg-tt-orange text-white text-center font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-tt-orange-dark transition-colors"
              >
                Lancer une campagne
              </Link>
              <Link
                href={`/register${qs}`}
                className="block border border-tt-teal/60 text-tt-teal text-center font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
              >
                Devenir Écho
              </Link>
              <Link
                href="/login"
                className="block text-center font-dm text-[12px] text-white/30 hover:text-white/50 transition-colors py-1"
              >
                Se connecter
              </Link>
            </div>
            <div className="mt-4">
              <p className="font-dm text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-1">
                Contact
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

        {/* Bottom bar */}
        <div className="border-t border-white/[0.07] pt-5 text-center">
          <p className="font-dm text-[11px] text-white/25">
            © 2026 Lupandu SARL · tamma.me · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
}
