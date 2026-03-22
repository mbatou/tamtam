"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import LandingNav from "../_components/LandingNav";
import LandingFooter from "../_components/LandingFooter";
import AnimatedCounter from "../_components/AnimatedCounter";
import FAQItem from "../_components/FAQItem";
import { useLandingStats } from "../_components/useLandingStats";
import { useTranslation } from "@/lib/i18n";

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
        <Link
          href="/signup/brand"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
        >
          🚀 {t("brandPage.heroCTA")}
        </Link>
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
