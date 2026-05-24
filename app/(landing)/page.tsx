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
            Je suis une marque
          </Link>
          <Link
            href={`/register${qs}`}
            className="text-[12px] font-dm font-semibold text-tt-teal border border-tt-teal/60 px-4 py-2 rounded-lg hover:bg-tt-teal/10 transition-colors"
          >
            Devenir Écho
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

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-16">
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

      {/* Floating chips — hidden on mobile, visible md+ */}
      <div className="hidden md:block" aria-hidden="true">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute top-[15%] right-[8%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          268 clics vérifiés · Tiak-Tiak
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="absolute top-[28%] left-[5%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 3.5s ease-in-out infinite", animationDelay: "0.8s" }}
        >
          Moussa · Écho · Thiès
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="absolute bottom-[22%] left-[6%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 2.8s ease-in-out infinite", animationDelay: "1.5s" }}
        >
          +500 FCFA · Wave ✓
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.5 }}
          className="absolute bottom-[18%] right-[6%] bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap pointer-events-none"
          style={{ animation: "float 4s ease-in-out infinite", animationDelay: "0.3s" }}
        >
          Pixel actif · 3 conversions
        </motion.div>
      </div>

      {/* Hero content centered */}
      <div className="relative z-10 text-center px-5 max-w-[680px]">
        {/* Badge */}
        <FadeUp delay={0}>
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-tt-orange animate-pulse" />
            <span className="text-[12px] font-dm text-white/60">
              1 400+ Échos actifs · 40+ villes · 50 FCFA par clic
            </span>
          </div>
        </FadeUp>

        {/* Headline — FIX 1a: responsive sizing */}
        <FadeUp delay={0.1}>
          <h1 className="font-syne text-[36px] md:text-[48px] xl:text-[60px] font-black leading-[1.1] tracking-[-1.5px] text-white mb-5">
            La pub qui passe{" "}
            <br className="hidden sm:block" />
            par vos{" "}
            <span className="bg-tt-orange text-white px-3 py-1 rounded-lg inline-block">
              vrais clients
            </span>
          </h1>
        </FadeUp>

        {/* Subheadline — FIX 1b: no orphan */}
        <FadeUp delay={0.2}>
          <p className="text-[15px] md:text-[16px] leading-[1.65] text-white/55 max-w-[520px] mx-auto text-center font-dm mb-8">
            Tamtam connecte les marques sénégalaises avec{" "}
            <span className="text-white/80">1 400 Échos réels</span>{" "}
            qui partagent sur WhatsApp Status.{" "}
            <span className="text-white/80">50 FCFA par clic vérifié.</span> Zéro algorithme.
          </p>
        </FadeUp>

        {/* Dual CTA — FIX 1d: equalized visual weight */}
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
              className="w-full sm:w-auto bg-[#D35400] text-white font-dm font-semibold text-[14px] px-7 py-[14px] rounded-[10px] transition-colors hover:brightness-110 flex items-center justify-center gap-2"
            >
              Je suis une marque
              <ArrowRight size={16} />
            </Link>
            <Link
              href={`/register${qs}`}
              aria-label="Devenir Écho — créer un compte Tamtam gratuit"
              onClick={() => {
                if (typeof window !== "undefined") {
                  const w = window as unknown as Record<string, unknown>;
                  if (w.tamtam) (w as unknown as { tamtam: { track: (e: string) => void } }).tamtam.track("echo_cta_click");
                  if (w.plausible) (w.plausible as (e: string) => void)("Écho CTA Click");
                }
              }}
              className="w-full sm:w-auto border-[1.5px] border-[#1D9E75] text-[#1D9E75] font-dm font-semibold text-[14px] px-8 py-[14px] rounded-[10px] hover:bg-[rgba(29,158,117,0.08)] transition-colors flex items-center justify-center gap-2"
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

      {/* On mobile: show ONE chip below the CTAs, centered */}
      <div className="flex md:hidden justify-center mt-4" aria-hidden="true">
        <div className="bg-white/[0.04] border-[0.5px] border-white/[0.1] rounded-[20px] px-[14px] py-[6px] text-[12px] font-dm text-white/65 whitespace-nowrap animate-float">
          +500 FCFA · Wave ✓
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 3: Social proof strip
// ══════════════════════════════════════════════════

function SocialProofStrip() {
  const brands = ["Tiak-Tiak", "Boostmate", "SIAME", "Partenaire 4", "Partenaire 5"];

  return (
    <section className="bg-[#111128] border-y border-white/[0.07] py-5">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 whitespace-nowrap flex-shrink-0 font-dm">
            Ils nous font confiance
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
            <span className="text-[11px] text-white/35 font-dm">1 400+ Échos actifs</span>
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
        <div className="text-center mb-12">
          <p className="text-[11px] font-dm font-medium uppercase tracking-[0.1em] text-white/40 mb-3">
            Deux côtés · Une plateforme
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] mb-3">Qui êtes-vous ?</h2>
          <p className="font-dm text-[14px] text-white/50">
            Pas sûr ? Voici la différence en 10 secondes.
          </p>
        </div>

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
              aria-label="Je suis une marque — créer un compte Tamtam"
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
              aria-label="Devenir Écho — créer un compte Tamtam gratuit"
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
// SECTION 5: How it works — FIX 3 full overhaul
// ══════════════════════════════════════════════════

function HowItWorks() {
  const [tab, setTab] = useState<"brand" | "echo">("brand");
  const qs = useQueryString();

  const brandSteps = [
    { title: "Créez votre campagne", desc: "Budget, lien, message. Lancé en 5 minutes." },
    { title: "Les Échos partagent", desc: "1 400 vrais utilisateurs diffusent sur Status." },
    { title: "Vous payez les clics réels", desc: "Tableau de bord temps réel. Zéro impression fantôme." },
  ];

  const echoSteps = [
    { title: "Créez votre compte", desc: "Inscription gratuite, vérification simple." },
    { title: "Choisissez une campagne", desc: "Parcourez les offres. Acceptez ce qui vous plaît." },
    { title: "Recevez votre argent", desc: "Wave payout automatique. 50 FCFA par clic vérifié." },
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
            Comment ça marche
          </p>
          <h2 className="font-syne font-bold text-[28px] md:text-[32px] text-tt-night">
            Simple pour les deux côtés
          </h2>
        </div>

        {/* Tab toggle — FIX 3b: prominent and color-reactive */}
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
              Pour les Marques
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
              Pour les Échos
            </button>
          </div>
        </div>

        {/* Steps — FIX 3c: no icons, large number circles */}
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
                {/* Step */}
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

                {/* Connector arrow — FIX 3d */}
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

        {/* Mini CTA — FIX 3e */}
        <div className="flex justify-center mt-12">
          {tab === "brand" ? (
            <Link
              href={`/register${qs}`}
              className="bg-[#D35400] text-white px-8 py-3.5 rounded-[10px] text-[13px] font-semibold font-dm hover:brightness-110 transition-all"
            >
              Lancer ma première campagne →
            </Link>
          ) : (
            <Link
              href={`/register${qs}`}
              className="border-[1.5px] border-[#1D9E75] text-[#1D9E75] px-8 py-3.5 rounded-[10px] text-[13px] font-semibold font-dm hover:bg-[rgba(29,158,117,0.08)] transition-colors"
            >
              Créer mon compte Écho →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// SECTION 6: Stats — FIX 4
// ══════════════════════════════════════════════════

function StatsSection() {
  return (
    <section className="py-20 md:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Échos actifs */}
          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              <CountUp target={1400} suffix="+" />
            </div>
            <p className="font-dm text-[13px] text-white/40">Échos actifs</p>
          </div>

          {/* Villes */}
          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              <CountUp target={40} suffix="+" />
            </div>
            <p className="font-dm text-[13px] text-white/40">Villes couvertes</p>
          </div>

          {/* CPC — static with benchmark */}
          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              50 FCFA
            </div>
            <p className="font-dm text-[13px] text-white/40">Par clic vérifié</p>
            <p className="text-[11px] text-white/30 mt-1 font-dm">vs 84 FCFA+ sur Meta</p>
          </div>

          {/* Multiplier — static with benchmark */}
          <div className="text-center">
            <div className="font-syne font-[800] text-[40px] md:text-[48px] text-tt-orange leading-none mb-2">
              2,5x
            </div>
            <p className="font-dm text-[13px] text-white/40">Moins cher que Meta</p>
            <p className="text-[11px] text-white/30 mt-1 font-dm">moins cher que Meta Ads</p>
          </div>
        </div>

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
    },
    {
      quote: "J'ai gagné 3 500 FCFA en une semaine juste en partageant sur mon Status. C'est direct sur Wave.",
      name: "Aminata F.",
      location: "Ziguinchor",
      type: "echo" as const,
    },
    {
      quote: "La différence c'est que c'est des vrais Sénégalais qui partagent, pas des bots.",
      name: "Moussa D.",
      location: "Thiès",
      type: "echo" as const,
    },
  ];

  return (
    <section className="bg-[#111128] py-20 md:py-28 px-5">
      <div className="max-w-6xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 text-center mb-3 font-dm">
          Ce qu&apos;ils disent
        </p>
        <h2 className="text-[28px] md:text-[32px] font-black text-white text-center mb-12 tracking-[-0.5px] font-syne">
          De vraies personnes. De vrais résultats.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-[#141420] border border-white/[0.07] rounded-[14px] p-6"
              style={{
                borderLeft: `2px solid ${t.type === "brand" ? "#D35400" : "#1D9E75"}`,
                borderRadius: "0 14px 14px 0",
              }}
            >
              <p className="text-[13px] text-white/70 leading-relaxed italic mb-5 font-dm">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white font-dm">{t.name}</p>
                  <p className="text-[11px] text-white/35 font-dm">
                    {t.type === "brand" ? t.company : t.location}
                  </p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full font-dm"
                  style={{
                    background: t.type === "brand" ? "rgba(211,84,0,0.15)" : "rgba(29,158,117,0.12)",
                    color: t.type === "brand" ? "#F0997B" : "#5DCAA5",
                  }}
                >
                  {t.type === "brand" ? "Marque" : "Écho"}
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

        {/* Dashboard mockup */}
        <div className="bg-[#141420] border border-white/[0.07] rounded-[14px] overflow-hidden">
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

  const faqs = [
    {
      q: "Combien coûte le lancement d'une campagne ?",
      a: "Budget minimum 3 000 FCFA. Vous payez 50 FCFA par clic vérifié, uniquement quand un vrai visiteur clique votre lien.",
      side: "brand",
    },
    {
      q: "Comment je reçois mon argent en tant qu'Écho ?",
      a: "Directement sur votre compte Wave. Vous demandez un retrait depuis l'app, minimum 500 FCFA.",
      side: "echo",
    },
    {
      q: "Comment savoir si les clics sont réels ?",
      a: "Chaque clic est validé côté serveur : vérification d'IP, détection de bot, empreinte appareil. Vous ne payez que les clics propres.",
      side: "brand",
    },
    {
      q: "Est-ce que l'inscription Écho est vraiment gratuite ?",
      a: "Oui. Inscription gratuite, aucun abonnement, aucuns frais. Vous gagnez 50 FCFA pour chaque clic que votre Status génère.",
      side: "echo",
    },
    {
      q: "Est-ce que je peux cibler une ville spécifique ?",
      a: "Tamtam couvre 40+ villes. Vous pouvez cibler par zone géographique lors de la création de votre campagne.",
      side: "brand",
    },
    {
      q: "Combien peut-on gagner par mois en tant qu'Écho ?",
      a: "Ça dépend de votre nombre de contacts WhatsApp et de votre régularité. Certains Échos gagnent 5 000–15 000 FCFA/mois.",
      side: "echo",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/30 text-center mb-3 font-dm">FAQ</p>
        <h2 className="text-[28px] md:text-[32px] font-black text-white text-center mb-12 tracking-[-0.5px] font-syne">
          Questions fréquentes
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
// SECTION 11: Final CTA — FIX 5
// ══════════════════════════════════════════════════

function FinalCTA() {
  const qs = useQueryString();

  return (
    <section className="bg-[#0A0A1A] py-24 md:py-32 text-center relative overflow-hidden">
      {/* Background ambient glows */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(211,84,0,0.05) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(29,158,117,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5">
        {/* Credibility line above headline */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
          <span className="text-[12px] text-white/35 font-dm">
            Rejoignez 1 400+ Échos et les marques qui leur font confiance
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-[36px] md:text-[44px] font-black text-white tracking-[-1px] mb-10 font-syne">
          Prêt à rejoindre Tamtam ?
        </h2>

        {/* Dual CTA with microcopy */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/register${qs}`}
              aria-label="Je suis une marque — créer un compte Tamtam"
              className="w-full sm:w-auto bg-[#D35400] text-white px-10 py-4 rounded-[10px] text-[15px] font-bold font-dm hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              Je suis une marque →
            </Link>
            <span className="text-[11px] text-white/25 font-dm">
              Aucun engagement · Résultats en quelques heures
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/register${qs}`}
              aria-label="Devenir Écho — créer un compte Tamtam gratuit"
              className="w-full sm:w-auto border-[1.5px] border-[#1D9E75] text-[#1D9E75] px-10 py-4 rounded-[10px] text-[15px] font-bold font-dm hover:bg-[rgba(29,158,117,0.08)] transition-colors flex items-center justify-center gap-2"
            >
              Devenir Écho →
            </Link>
            <span className="text-[11px] text-white/25 font-dm">
              Gratuit · Paiement Wave
            </span>
          </div>
        </div>

        {/* Login link */}
        <p className="mt-8 text-[13px] text-white/25 font-dm">
          Déjà membre ?{" "}
          <Link href="/login" className="text-white/45 underline underline-offset-2 hover:text-white/70 transition-colors">
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

        <div className="border-t border-white/[0.07] pt-5 text-center">
          <p className="font-dm text-[11px] text-white/25">
            © 2026 Lupandu SARL · tamma.me · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
}
