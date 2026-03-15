"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SoundWave from "@/components/ui/SoundWave";
import Footer from "@/components/Footer";
import { useTranslation } from "@/lib/i18n";
import { formatFCFA } from "@/lib/utils";

/* ─── Brand Lead Form ─── */
function BrandLeadForm() {
  const [form, setForm] = useState({ business_name: "", contact_name: "", email: "", whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1ABC9C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-teal-400">{t("landing.signupReceived")}</p>
        <p className="text-xs text-white/40 mt-1">{t("landing.signupReceivedDesc")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder={t("landing.companyName")}
        required
        value={form.business_name}
        onChange={(e) => setForm({ ...form, business_name: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition"
      />
      <input
        type="tel"
        placeholder={t("landing.whatsappRequired")}
        required
        value={form.whatsapp}
        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder={t("landing.yourName")}
          required
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition"
        />
        <input
          type="email"
          placeholder={t("landing.proEmailOptional")}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full text-sm py-3 disabled:opacity-50"
      >
        {submitting ? t("common.sending") : t("landing.getAccess")}
      </button>
    </form>
  );
}

/* ─── Animated Counter ─── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 30;
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
  }, [target]);

  return (
    <span className="text-2xl sm:text-3xl md:text-4xl font-black gradient-text">
      {new Intl.NumberFormat("fr-FR").format(count)}{suffix}
    </span>
  );
}

/* ─── FAQ Accordion ─── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-semibold pr-4">{question}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <p className="text-sm text-white/40 pb-4 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

/* ─── WhatsApp Icon ─── */
function WhatsAppIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ─── Phone Mockup ─── */
function PhoneMockup() {
  const { t } = useTranslation();
  return (
    <div className="relative w-[220px] sm:w-[260px] mx-auto">
      {/* Phone frame */}
      <div className="rounded-[2rem] border-2 border-white/10 bg-[#0F0F1F] p-2 shadow-2xl shadow-primary/10">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-16 h-1.5 bg-white/10 rounded-full" />
        </div>
        {/* Screen */}
        <div className="rounded-[1.5rem] bg-background overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 text-[8px] text-white/40">
            <span>9:41</span>
            <span>●●●</span>
          </div>
          {/* App header */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
            <span className="text-xs font-black gradient-text">Tamtam</span>
            <SoundWave bars={3} className="h-2.5 opacity-40" />
          </div>
          {/* Balance card */}
          <div className="p-3">
            <div className="earnings-card-bg rounded-xl p-3 border border-primary/20">
              <p className="text-[7px] text-white/40 font-semibold uppercase">{t("landing.mockupBalance")}</p>
              <p className="text-lg font-black">3 750 FCFA</p>
              <p className="text-[7px] text-white/30">{t("landing.mockupTotalEarned")} 12 400 FCFA</p>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-1.5 px-3">
            <div className="glass-card p-1.5 text-center rounded-lg">
              <span className="text-sm font-black block">47</span>
              <span className="text-[6px] text-white/40">{t("landing.mockupClicks")}</span>
            </div>
            <div className="glass-card p-1.5 text-center rounded-lg">
              <span className="text-sm font-black text-accent block">3 750</span>
              <span className="text-[6px] text-white/40">FCFA</span>
            </div>
            <div className="glass-card p-1.5 text-center rounded-lg">
              <span className="text-sm font-black block">2</span>
              <span className="text-[6px] text-white/40">{t("landing.mockupRythmes")}</span>
            </div>
          </div>
          {/* Campaign card */}
          <div className="p-3">
            <div className="glass-card p-2.5 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold">Promo Ramadan</span>
                <span className="text-[6px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">Actif</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-gradient-primary rounded-full" style={{ width: "45%" }} />
              </div>
              <div className="flex items-center justify-between text-[7px] text-white/40">
                <span>25 FCFA/clic</span>
                <span className="text-accent font-bold">1 175 FCFA</span>
              </div>
            </div>
          </div>
          {/* Bottom nav */}
          <div className="flex items-center justify-around px-2 py-2 border-t border-white/5">
            {["Pulse", "Rythmes", "Gains", "Profil"].map((label, i) => (
              <div key={label} className="text-center">
                <div className={`text-[8px] ${i === 0 ? "text-primary font-bold" : "text-white/30"}`}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* WhatsApp floating badge */}
      <div className="absolute -right-3 top-1/3 bg-[#25D366] rounded-full p-2 shadow-lg shadow-[#25D366]/20">
        <WhatsAppIcon size={18} className="text-white" />
      </div>
    </div>
  );
}

/* ─── Main Landing Page ─── */
export default function LandingPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ echos: 0, campaigns: 0, validClicks: 0, totalPaid: 0, withdrawalCount: 0, batteurs: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setStats(data);
          setStatsLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={4} className="h-4 sm:h-5 opacity-60" />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition">
            {t("nav.login")}
          </Link>
          <Link href="/register" className="btn-primary text-xs sm:text-sm !py-2 !px-4 sm:!px-5">
            {t("landing.becomeEcho")}
          </Link>
        </div>
      </header>

      {/* ─── Section 1: HERO ─── */}
      <section className="relative px-4 sm:px-6 py-10 sm:py-16 md:py-24 max-w-7xl mx-auto noise-overlay">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left — text */}
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.08] mb-4 sm:mb-6 tracking-tight">
              {t("landing.heroTitleLine1")}{" "}
              <span className="text-[#25D366]">WhatsApp</span>
              <br />
              {t("landing.heroTitleLine2")}
            </h1>
            <p className="text-base sm:text-lg text-white/50 max-w-xl mb-8 sm:mb-10">
              {t("landing.heroSubtitleNew")}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:justify-start justify-center">
              <Link href="/register" className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto text-center">
                {t("landing.heroCTAEcho")}
              </Link>
              <a href="#pour-les-marques" className="btn-outline text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto text-center">
                {t("landing.heroCTABrand")}
              </a>
            </div>
            <p className="mt-6 sm:mt-8 text-xs sm:text-sm font-semibold text-white/30 tracking-widest uppercase">
              {t("landing.tagline")}
            </p>
          </div>
          {/* Right — phone mockup */}
          <div className="hidden md:flex justify-center">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ─── Section 2: LIVE STATS ─── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
        <div className="glass-card p-6 sm:p-10 border border-primary/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div>
              <AnimatedCounter target={statsLoaded ? stats.echos : 0} suffix="+" />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 font-semibold">
                {t("landing.statEchos")}
              </p>
            </div>
            <div>
              <AnimatedCounter target={statsLoaded ? stats.campaigns : 0} />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 font-semibold">
                {t("landing.statCampaigns")}
              </p>
            </div>
            <div>
              <AnimatedCounter target={statsLoaded ? stats.validClicks : 0} suffix="+" />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 font-semibold">
                {t("landing.statClicks")}
              </p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black gradient-text">
                {statsLoaded ? formatFCFA(stats.totalPaid) : "—"}
              </span>
              <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 font-semibold">
                {t("landing.statPaid")}
              </p>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-4 flex items-center justify-center gap-1.5">
            <span className="live-dot !w-[5px] !h-[5px]" />
            {t("landing.liveFromDakar")}
          </p>
        </div>
      </section>

      {/* ─── Section 3: HOW IT WORKS ─── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-10 sm:mb-14">
          {t("landing.howItWorks")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
          {[
            {
              step: "01",
              title: t("landing.step1Title"),
              desc: t("landing.step1Desc"),
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
            },
            {
              step: "02",
              title: t("landing.step2Title"),
              desc: t("landing.step2Desc"),
              icon: <WhatsAppIcon size={24} className="text-white" />,
            },
            {
              step: "03",
              title: t("landing.step3Title"),
              desc: t("landing.step3Desc"),
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 sm:p-8 text-center hover-lift">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 sm:mb-5">
                {item.icon}
              </div>
              <span className="text-xs font-bold text-primary mb-2 block">{item.step}</span>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{item.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Real example */}
        <div className="mt-8 sm:mt-12 glass-card p-6 sm:p-8 border border-accent/10 max-w-2xl mx-auto">
          <p className="text-xs text-accent font-bold uppercase tracking-wider mb-3">
            {t("landing.realExample")}
          </p>
          <h3 className="text-base sm:text-lg font-bold mb-3">{t("landing.exampleName")}</h3>
          <div className="space-y-2">
            {[
              t("landing.exampleLine1"),
              t("landing.exampleLine2"),
              t("landing.exampleLine3"),
              t("landing.exampleLine4"),
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent text-sm mt-0.5">→</span>
                <span className="text-sm text-white/60">{line}</span>
              </div>
            ))}
          </div>
          <Link
            href="/register"
            className="inline-block mt-5 text-sm font-bold text-primary hover:text-primary-light transition"
          >
            {t("landing.exampleCTA")} →
          </Link>
        </div>
      </section>

      {/* ─── Section 4: SOCIAL PROOF ─── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-3">
          {t("landing.proofTitle")}
        </h2>
        <p className="text-center text-sm text-white/30 mb-8 sm:mb-12">
          {t("landing.proofSubtitle")}
        </p>

        {/* Payment proof cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
          {[
            { amount: 6865, city: "Dakar", days: 5 },
            { amount: 3937, city: "Rufisque", days: 4 },
            { amount: 2530, city: "Thiès", days: 3 },
          ].map((proof, i) => (
            <div key={i} className="glass-card p-5 text-center border border-accent/10 hover-lift">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-2xl font-black text-accent">{formatFCFA(proof.amount)}</p>
              <p className="text-xs text-white/30 mt-1">
                {t("landing.proofRetired")} Wave
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs text-white/20">{proof.city}</span>
                <span className="text-white/10">·</span>
                <span className="text-xs text-white/20">{proof.days} {t("landing.proofDays")}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Withdrawal counter */}
        <p className="text-center text-xs text-white/30 mt-6">
          + {statsLoaded ? stats.withdrawalCount : "—"} {t("landing.proofWithdrawals")}
        </p>
      </section>

      {/* ─── Section 5: FOR BRANDS ─── */}
      <section id="pour-les-marques" className="px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 sm:mb-4 block">
            {t("landing.forBrands")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            {t("landing.brandsSubtitle")}
          </h2>
          <p className="text-white/40 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            {t("landing.brandsDescNew")}
          </p>
        </div>

        {/* Brand benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-14">
          {[
            { icon: "🎯", title: t("landing.localTargeting"), desc: t("landing.localTargetingDesc") },
            { icon: "💰", title: t("landing.costPerClick"), desc: t("landing.costPerClickDesc") },
            { icon: "📊", title: t("landing.realTimeTracking"), desc: t("landing.realTimeTrackingDesc") },
          ].map((b) => (
            <div key={b.title} className="glass-card p-5 sm:p-6 text-center">
              <span className="text-2xl mb-3 block">{b.icon}</span>
              <h3 className="text-sm sm:text-base font-bold mb-2">{b.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Price anchor + Lead form */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-start">
          <div className="glass-card p-6 sm:p-8 border border-secondary/20" style={{ boxShadow: "0 0 40px rgba(26,188,156,0.06)" }}>
            <h3 className="text-lg sm:text-xl font-bold mb-2">{t("landing.brandFormTitle")}</h3>
            <p className="text-xs text-white/40 mb-5">{t("landing.brandFormDesc")}</p>
            <BrandLeadForm />
            <p className="text-[10px] text-white/20 mt-3 text-center">
              {t("landing.alreadyAccount")}{" "}
              <Link href="/login?tab=batteur" className="text-secondary/60 hover:text-secondary transition">
                {t("landing.loginLink")}
              </Link>
            </p>
          </div>

          {/* Brand info card */}
          <div className="glass-card p-6 sm:p-8">
            <div className="space-y-5">
              <div>
                <p className="text-3xl sm:text-4xl font-black gradient-text mb-1">10 000 FCFA</p>
                <p className="text-sm text-white/40">{t("landing.brandMinBudget")}</p>
              </div>
              <div className="space-y-3 pt-4 border-t border-white/5">
                {[
                  t("landing.brandBenefit1"),
                  t("landing.brandBenefit2"),
                  t("landing.brandBenefit3"),
                  t("landing.brandBenefit4"),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                    <span className="text-sm text-white/50">{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs text-white/30 mb-1">{t("landing.brandContact")}</p>
                <a href="mailto:support@tamma.me" className="text-sm font-semibold text-secondary hover:text-secondary/80 transition">
                  support@tamma.me
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 6: FAQ ─── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-12">
          {t("landing.faqTitle")}
        </h2>
        <div className="glass-card p-4 sm:p-6">
          <FAQItem question={t("landing.faq1q")} answer={t("landing.faq1a")} />
          <FAQItem question={t("landing.faq2q")} answer={t("landing.faq2a")} />
          <FAQItem question={t("landing.faq3q")} answer={t("landing.faq3a")} />
          <FAQItem question={t("landing.faq4q")} answer={t("landing.faq4a")} />
          <FAQItem question={t("landing.faq5q")} answer={t("landing.faq5a")} />
          <FAQItem question={t("landing.faq6q")} answer={t("landing.faq6a")} />
        </div>
      </section>

      {/* ─── Section 7: DOUBLE CTA ─── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Echo CTA */}
          <div className="glass-card p-8 sm:p-10 text-center bg-gradient-to-br from-primary/10 to-primary-light/5">
            <SoundWave bars={5} className="h-5 sm:h-6 justify-center mb-4 opacity-40" />
            <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">
              {t("landing.ctaEchoTitle")}
            </h2>
            <p className="text-white/40 mb-6 text-sm max-w-sm mx-auto">
              {t("landing.ctaEchoDesc")}
            </p>
            <Link href="/register" className="btn-primary text-sm sm:text-base px-8 py-3">
              {t("landing.becomeEcho")}
            </Link>
          </div>

          {/* Brand CTA */}
          <div className="glass-card p-8 sm:p-10 text-center bg-gradient-to-br from-secondary/10 to-secondary/5">
            <span className="text-2xl sm:text-3xl block mb-3">📢</span>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">
              {t("landing.ctaBrandTitle")}
            </h2>
            <p className="text-white/40 mb-6 text-sm max-w-sm mx-auto">
              {t("landing.ctaBrandDesc")}
            </p>
            <a href="#pour-les-marques" className="btn-outline text-sm sm:text-base px-8 py-3 border-secondary/30 text-secondary hover:bg-secondary/10">
              {t("landing.getAccess")}
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <Footer />
    </div>
  );
}
