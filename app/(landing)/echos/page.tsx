"use client";

import Link from "next/link";
import LandingNav from "../_components/LandingNav";
import LandingFooter from "../_components/LandingFooter";
import AnimatedCounter from "../_components/AnimatedCounter";
import FAQItem from "../_components/FAQItem";
import { useLandingStats } from "../_components/useLandingStats";
import { useTranslation } from "@/lib/i18n";

export default function EchoLanding() {
  const { stats, loaded } = useLandingStats();
  const { t } = useTranslation();

  const echoFAQ = [
    { q: t("echoPage.faq1q"), a: t("echoPage.faq1a") },
    { q: t("echoPage.faq2q"), a: t("echoPage.faq2a") },
    { q: t("echoPage.faq3q"), a: t("echoPage.faq3a") },
    { q: t("echoPage.faq4q"), a: t("echoPage.faq4a") },
    { q: t("echoPage.faq5q"), a: t("echoPage.faq5a") },
  ];

  const socialProofs = [
    {
      quote: t("echoPage.proof1Quote"),
      name: "Biggy ndaw",
      city: "Rufisque",
      clicks: 102,
    },
    {
      quote: t("echoPage.proof2Quote"),
      name: "Cheikh Ahmadou",
      city: "Dakar",
      clicks: 88,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F1F] text-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            {t("echoPage.heroTitle1")}
            <br />
            <span className="text-teal-400">{t("echoPage.heroTitle2")}</span> 💰
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-2 max-w-2xl mx-auto">
            {t("echoPage.heroSub1")}
          </p>
          <p className="text-white/40 mb-8">
            {t("echoPage.heroSub2")}
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
          >
            📱 {t("echoPage.heroCTA")}
          </Link>
          <p className="mt-4 text-white/40 text-sm">
            {t("brandPage.alreadyAccount")}{" "}
            <Link href="/login" className="text-teal-400 hover:underline">
              {t("selector.login")} →
            </Link>
          </p>
        </div>
      </section>

      {/* Money counter */}
      <section className="px-6 pb-12 text-center">
        <div className="inline-block bg-teal-500/10 border border-teal-500/20 rounded-2xl px-8 py-4">
          <p className="text-sm text-white/60 mb-1">{t("echoPage.alreadyPaid")}</p>
          {loaded ? (
            <AnimatedCounter
              target={stats.totalPaid}
              suffix=" FCFA"
              className="text-3xl md:text-4xl font-black text-teal-400"
            />
          ) : (
            <span className="text-3xl md:text-4xl font-black text-teal-400">
              56 010 FCFA
            </span>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">
          {t("brandPage.howTitle")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-teal-500/50 via-teal-500/20 to-teal-500/50" />

          {[
            {
              step: "1",
              title: t("echoPage.step1"),
              time: t("echoPage.step1Time"),
              desc: t("echoPage.step1Desc"),
            },
            {
              step: "2",
              title: t("echoPage.step2"),
              time: "",
              desc: t("echoPage.step2Desc"),
            },
            {
              step: "3",
              title: t("echoPage.step3"),
              time: "",
              desc: t("echoPage.step3Desc"),
            },
          ].map((s) => (
            <div key={s.step} className="text-center relative">
              <div className="w-16 h-16 bg-teal-500/20 border-2 border-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-500 font-black text-xl">
                {s.step}
              </div>
              <h3 className="font-bold text-lg mb-1">{s.title}</h3>
              {s.time && (
                <span className="text-teal-400 text-xs font-medium">
                  {s.time}
                </span>
              )}
              <p className="text-white/50 text-sm mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings examples */}
      <section className="px-6 py-16 bg-white/[0.02]">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">
            {t("echoPage.earningsTitle")}
          </h2>
          <div className="space-y-4">
            {[
              {
                label: t("echoPage.earn1Label"),
                detail: t("echoPage.earn1Detail"),
                amount: "150 – 2 500 FCFA",
              },
              {
                label: t("echoPage.earn2Label"),
                detail: "",
                amount: "1 000 – 7 500 FCFA/" + t("echoPage.week"),
              },
              {
                label: t("echoPage.earn3Label"),
                detail: "",
                amount: "5 000+ FCFA/" + t("echoPage.week") + " 🔥",
                highlight: true,
              },
            ].map((e) => (
              <div
                key={e.label}
                className={`border rounded-xl p-5 transition-all ${
                  e.highlight
                    ? "border-teal-500/40 bg-teal-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{e.label}</p>
                    {e.detail && (
                      <p className="text-white/40 text-xs">{e.detail}</p>
                    )}
                  </div>
                  <p
                    className={`font-black text-lg ${e.highlight ? "text-teal-400" : "text-white"}`}
                  >
                    {e.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gamification preview */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          {t("echoPage.gamifTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: "🔥", title: t("echoPage.gamif1"), desc: t("echoPage.gamif1Desc") },
            { icon: "🏅", title: t("echoPage.gamif2"), desc: t("echoPage.gamif2Desc") },
            { icon: "🏆", title: t("echoPage.gamif3"), desc: t("echoPage.gamif3Desc") },
            { icon: "🤝", title: t("echoPage.gamif4"), desc: t("echoPage.gamif4Desc") },
          ].map((g) => (
            <div
              key={g.title}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-teal-500/30 transition-colors"
            >
              <span className="text-3xl">{g.icon}</span>
              <h3 className="font-bold mt-2 text-sm">{g.title}</h3>
              <p className="text-white/50 text-xs mt-1">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="px-6 py-16 bg-white/[0.02]">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">
            {t("echoPage.trustTitle")}
          </h2>
          <div className="space-y-4">
            {[
              t("echoPage.trust1"),
              t("echoPage.trust2", { amount: loaded ? stats.totalPaid.toLocaleString("fr-FR") : "56 010" }),
              t("echoPage.trust3", { count: loaded ? String(stats.echos) : "552" }),
              t("echoPage.trust4"),
              t("echoPage.trust5"),
            ].map((txt) => (
              <div key={txt} className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                <p className="text-white/70 text-sm">{txt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          {t("echoPage.proofTitle")}
        </h2>
        <div className="space-y-4">
          {socialProofs.map((s) => (
            <div
              key={s.name}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <p className="text-white/80 italic mb-4">
                &ldquo;{s.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-white/40">{s.city}</p>
                </div>
                <span className="text-teal-400 font-bold">
                  {s.clicks} clics
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          {t("brandPage.faqTitle")}
        </h2>
        {echoFAQ.map((f) => (
          <FAQItem key={f.q} question={f.q} answer={f.a} />
        ))}
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-6">
          {t("echoPage.ctaTitle")}
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
          >
            📱 {t("echoPage.heroCTA")}
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-bold transition-colors"
          >
            🤝 {t("echoPage.referralCTA")}
          </Link>
        </div>
        <p className="mt-6 text-white/30 text-sm flex items-center justify-center gap-3">
          <a href="mailto:support@tamma.me" className="hover:underline">
            support@tamma.me
          </a>
          <span className="text-white/20">·</span>
          <a
            href="https://wa.me/221762799393?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20Tamtam"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            💬 WhatsApp
          </a>
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}
