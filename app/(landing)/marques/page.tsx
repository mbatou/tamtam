"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import LandingNav from "../_components/LandingNav";
import LandingFooter from "../_components/LandingFooter";
import AnimatedCounter from "../_components/AnimatedCounter";
import FAQItem from "../_components/FAQItem";
import { useLandingStats } from "../_components/useLandingStats";
import { useTranslation } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";

/* ─── Animated bar for ROI comparison ─── */
function AnimatedBar({
  label,
  value,
  max,
  color,
  note,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.width = `${(value / max) * 100}%`;
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, max]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-sm font-bold text-white">
          {value} FCFA/clic
        </span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <div
          ref={ref}
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: "0%", background: color }}
        />
      </div>
      {note && (
        <p className="text-xs text-green-400 mt-1 font-medium">{note}</p>
      )}
    </div>
  );
}

export default function BrandLanding() {
  const { stats, loaded } = useLandingStats();
  const { t } = useTranslation();
  const isPromo = new Date() < new Date("2026-04-01");

  const brandFAQ = [
    { q: t("brandPage.faq1q"), a: t("brandPage.faq1a") },
    { q: t("brandPage.faq2q"), a: t("brandPage.faq2a") },
    { q: t("brandPage.faq3q"), a: t("brandPage.faq3a") },
    { q: t("brandPage.faq4q"), a: t("brandPage.faq4a") },
    { q: t("brandPage.faq5q"), a: t("brandPage.faq5a") },
    { q: t("brandPage.faq6q"), a: t("brandPage.faq6a") },
  ];

  const useCases = [
    { icon: "🍽️", title: t("brandPage.useCase1"), desc: t("brandPage.useCase1Desc") },
    { icon: "🚗", title: t("brandPage.useCase2"), desc: t("brandPage.useCase2Desc") },
    { icon: "🛍️", title: t("brandPage.useCase3"), desc: t("brandPage.useCase3Desc") },
    { icon: "🎉", title: t("brandPage.useCase4"), desc: t("brandPage.useCase4Desc") },
    { icon: "🏢", title: t("brandPage.useCase5"), desc: t("brandPage.useCase5Desc") },
    { icon: "🏠", title: t("brandPage.useCase6"), desc: t("brandPage.useCase6Desc") },
  ];

  const campaignResults = [
    { name: "Une communauté grandissante", clicks: "1 143", cpc: "9" },
    { name: "Amenons les!", clicks: "450", cpc: "22" },
    { name: "500+ Real People", clicks: "160", cpc: "20" },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F1F] text-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            {t("brandPage.heroTitle1")}{" "}
            <span className="text-orange-500">{t("brandPage.heroTitle2")}</span>
            <br />
            {t("brandPage.heroTitle3")}
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-8 max-w-2xl mx-auto">
            {t("brandPage.heroSub", { echos: loaded ? String(stats.echos) : "552" })}
          </p>

          <Link
            href="/signup/brand"
            onClick={() => trackEvent.landingCTA("marques", "hero_signup")}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
          >
            🚀 {t("brandPage.heroCTA")}
          </Link>
          <p className="mt-4 text-white/40 text-sm">
            {t("brandPage.alreadyAccount")}{" "}
            <Link href="/login" className="text-orange-400 hover:underline">
              {t("selector.login")} →
            </Link>
          </p>
        </div>
      </section>

      {/* Promo banner */}
      {isPromo && (
        <section className="px-6 pb-12">
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-2xl p-6 text-center">
            <p className="text-lg font-bold">
              🎁 {t("brandPage.promoBanner")}
            </p>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">
          {t("brandPage.howTitle")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-orange-500/50 via-orange-500/20 to-orange-500/50" />

          {[
            {
              step: "1",
              title: t("brandPage.step1"),
              time: t("brandPage.step1Time"),
              desc: t("brandPage.step1Desc"),
            },
            {
              step: "2",
              title: t("brandPage.step2"),
              time: t("brandPage.step2Time"),
              desc: t("brandPage.step2Desc"),
            },
            {
              step: "3",
              title: t("brandPage.step3"),
              time: t("brandPage.step3Time"),
              desc: t("brandPage.step3Desc", { echos: loaded ? String(stats.echos) : "552" }),
            },
          ].map((s) => (
            <div key={s.step} className="text-center relative">
              <div className="w-16 h-16 bg-orange-500/20 border-2 border-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 font-black text-xl">
                {s.step}
              </div>
              <h3 className="font-bold text-lg mb-1">{s.title}</h3>
              <span className="text-orange-400 text-xs font-medium">
                {s.time}
              </span>
              <p className="text-white/50 text-sm mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key metrics */}
      <section className="px-6 py-16 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl md:text-5xl font-black text-orange-500">20</p>
            <p className="text-white/50 text-sm mt-1">{t("brandPage.metricCPC")}</p>
          </div>
          <div>
            {loaded ? (
              <AnimatedCounter
                target={stats.echos}
                suffix="+"
                className="text-4xl md:text-5xl font-black text-orange-500"
              />
            ) : (
              <p className="text-4xl md:text-5xl font-black text-orange-500">552+</p>
            )}
            <p className="text-white/50 text-sm mt-1">{t("brandPage.metricEchos")}</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black text-orange-500">24h</p>
            <p className="text-white/50 text-sm mt-1">{t("brandPage.metricResults")}</p>
          </div>
        </div>
      </section>

      {/* 3 Campaign Objectives */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-3">
          {t("brandPage.objectivesTitle")}
        </h2>
        <p className="text-center text-white/50 mb-12 text-sm">
          {t("brandPage.objectivesSubtitle")}
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Traffic */}
          <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-teal-500/40 transition-all group">
            <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full mb-3">
              {t("brandPage.objTrafficTag")}
            </span>
            <h3 className="text-xl font-bold mb-2">{t("brandPage.objTrafficTitle")}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{t("brandPage.objTrafficDesc")}</p>
          </div>

          {/* Awareness */}
          <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/40 transition-all group">
            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full mb-3">
              {t("brandPage.objAwarenessTag")}
            </span>
            <h3 className="text-xl font-bold mb-2">{t("brandPage.objAwarenessTitle")}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{t("brandPage.objAwarenessDesc")}</p>
          </div>

          {/* Lead Generation */}
          <div className="relative bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all group">
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500 text-white px-2.5 py-1 rounded-full animate-pulse">
                {t("brandPage.objLeadGenTag")}
              </span>
            </div>
            <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">{t("brandPage.objLeadGenTitle")}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{t("brandPage.objLeadGenDesc")}</p>
          </div>
        </div>
      </section>

      {/* AI Landing Page Feature */}
      <section className="px-6 py-20 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 px-4 py-1.5 rounded-full mb-4 border border-purple-500/20">
              AI-Powered
            </span>
            <h2 className="text-3xl font-black mb-3">
              {t("brandPage.aiTitle")}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              {t("brandPage.aiSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🎨", key: "aiFeature1" },
              { icon: "📋", key: "aiFeature2" },
              { icon: "🔔", key: "aiFeature3" },
              { icon: "🛡️", key: "aiFeature4" },
            ].map((f) => (
              <div key={f.key} className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-5 hover:border-purple-500/20 transition-colors">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="font-bold mb-1">{t(`brandPage.${f.key}`)}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{t(`brandPage.${f.key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/signup/brand"
              onClick={() => trackEvent.landingCTA("marques", "ai_section_signup")}
              className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
            >
              Essayer la generation de leads →
            </Link>
          </div>
        </div>
      </section>

      {/* ROI Comparison */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          {t("brandPage.roiTitle")}
        </h2>
        <AnimatedBar label="Facebook Ads" value={400} max={800} color="#ef4444" />
        <AnimatedBar label="Instagram" value={550} max={800} color="#ef4444" />
        <AnimatedBar
          label="Tamtam"
          value={20}
          max={800}
          color="#22c55e"
          note={`← ${t("brandPage.roiNote")}`}
        />
      </section>

      {/* Case study */}
      <section className="px-6 py-16 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">
            {t("brandPage.caseTitle")}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-white/80 text-lg leading-relaxed mb-6 italic">
              &ldquo;{t("brandPage.caseQuote")}&rdquo;
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-orange-500">365</p>
                <p className="text-xs text-white/40">{t("brandPage.caseViews")}</p>
              </div>
              <div>
                <p className="text-2xl font-black text-orange-500">160</p>
                <p className="text-xs text-white/40">{t("brandPage.caseVisitors")}</p>
              </div>
              <div>
                <p className="text-2xl font-black text-orange-500">21.74%</p>
                <p className="text-xs text-white/40">CTR</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          {t("brandPage.useCaseTitle")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {useCases.map((u) => (
            <div
              key={u.title}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-orange-500/30 transition-colors"
            >
              <span className="text-3xl">{u.icon}</span>
              <h3 className="font-bold mt-2">{u.title}</h3>
              <p className="text-white/50 text-sm mt-1">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign results */}
      <section className="px-6 py-16 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">
            {t("brandPage.campaignsTitle")}
          </h2>
          <div className="space-y-4">
            {campaignResults.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-6 py-4"
              >
                <span className="font-bold text-sm">{c.name}</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-white/60">{c.clicks} clics</span>
                  <span className="text-orange-400 font-bold">
                    {c.cpc} FCFA/clic
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          {t("brandPage.faqTitle")}
        </h2>
        {brandFAQ.map((f) => (
          <FAQItem key={f.q} question={f.q} answer={f.a} />
        ))}
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-6">
          {t("brandPage.ctaTitle")}
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup/brand"
            onClick={() => trackEvent.landingCTA("marques", "bottom_signup")}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
          >
            🚀 {t("brandPage.heroCTA")}
          </Link>
          <a
            href="https://wa.me/221762799393?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20Tamtam%20pour%20ma%20marque"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-green-500/40 text-green-400 hover:bg-green-500/10 px-6 py-3 rounded-full font-bold transition-all"
          >
            💬 WhatsApp
          </a>
        </div>
        <p className="mt-4 text-white/30 text-sm">
          <a href="mailto:support@tamma.me" className="hover:underline">
            support@tamma.me
          </a>
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}
