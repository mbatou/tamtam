"use client";

import Link from "next/link";
import LandingNav from "../_components/LandingNav";
import LandingFooter from "../_components/LandingFooter";
import AnimatedCounter from "../_components/AnimatedCounter";
import FAQItem from "../_components/FAQItem";
import { useLandingStats } from "../_components/useLandingStats";

const echoFAQ = [
  {
    q: "Est-ce que c'est une arnaque ?",
    a: "Non. 56 010 FCFA ont déjà été versés aux Échos via Wave et Orange Money. Tamtam est une plateforme de micro-influence légitime basée au Sénégal.",
  },
  {
    q: "Combien puis-je gagner ?",
    a: "Entre 150 et 7 500 FCFA par semaine selon ton activité. Les meilleurs Échos gagnent 5 000+ FCFA par semaine.",
  },
  {
    q: "Comment retirer mon argent ?",
    a: "Via Wave ou Orange Money, dès 1 000 FCFA de solde. Le retrait est traité rapidement.",
  },
  {
    q: "Comment fonctionne le parrainage ?",
    a: "Invite un ami → il s'inscrit avec ton lien → tu gagnes 150 FCFA. Simple.",
  },
  {
    q: "Est-ce que je dois payer quelque chose ?",
    a: "Non, jamais. Tamtam est 100% gratuit pour les Échos. Tu gagnes de l'argent, tu n'en dépenses pas.",
  },
];

const socialProofs = [
  {
    quote: "J'ai gagné 6 438 FCFA en partageant 3 liens",
    name: "Biggy ndaw",
    city: "Rufisque",
    clicks: 102,
  },
  {
    quote: "J'ai retiré mon premier paiement en 2 jours",
    name: "Cheikh Ahmadou",
    city: "Dakar",
    clicks: 88,
  },
];

export default function EchoLanding() {
  const { stats, loaded } = useLandingStats();

  return (
    <div className="min-h-screen bg-[#0F0F1F] text-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Teal glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            Gagne de l&apos;argent
            <br />
            <span className="text-teal-400">avec ton statut WhatsApp</span> 💰
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-2 max-w-2xl mx-auto">
            Partage des liens. Tes contacts cliquent. Tu gagnes.
          </p>
          <p className="text-white/40 mb-8">
            Retrait via Wave ou Orange Money.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
          >
            📱 Devenir un Écho — c&apos;est gratuit
          </Link>
          <p className="mt-4 text-white/40 text-sm">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-teal-400 hover:underline">
              Se connecter →
            </Link>
          </p>
        </div>
      </section>

      {/* Money counter */}
      <section className="px-6 pb-12 text-center">
        <div className="inline-block bg-teal-500/10 border border-teal-500/20 rounded-2xl px-8 py-4">
          <p className="text-sm text-white/60 mb-1">Déjà versés aux Échos</p>
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
          Comment ça marche ?
        </h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-teal-500/50 via-teal-500/20 to-teal-500/50" />

          {[
            {
              step: "1",
              title: "Inscris-toi gratuitement",
              time: "30 sec",
              desc: "Crée ton compte avec ton numéro",
            },
            {
              step: "2",
              title: "Accepte un Rythme",
              time: "",
              desc: "Choisis parmi les campagnes disponibles. Tu reçois un lien personnalisé.",
            },
            {
              step: "3",
              title: "Partage sur WhatsApp",
              time: "",
              desc: "Tes contacts cliquent → tu gagnes 15–188 FCFA par clic vérifié",
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
            Combien tu peux gagner ?
          </h2>
          <div className="space-y-4">
            {[
              {
                label: "1 lien partagé",
                detail: "10–50 clics",
                amount: "150 – 2 500 FCFA",
              },
              {
                label: "3 liens par semaine",
                detail: "",
                amount: "1 000 – 7 500 FCFA/semaine",
              },
              {
                label: "Les meilleurs Échos",
                detail: "",
                amount: "5 000+ FCFA/semaine 🔥",
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
          Plus tu partages, plus tu gagnes
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              icon: "🔥",
              title: "Série quotidienne",
              desc: "Bonus de fidélité",
            },
            {
              icon: "🏅",
              title: "10 badges à débloquer",
              desc: "Récompenses exclusives",
            },
            {
              icon: "🏆",
              title: "Classement",
              desc: "Les meilleurs gagnent plus",
            },
            {
              icon: "🤝",
              title: "Parrainage",
              desc: "150 FCFA par ami invité",
            },
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
            100% fiable
          </h2>
          <div className="space-y-4">
            {[
              "Paiement via Wave et Orange Money",
              `${loaded ? stats.totalPaid.toLocaleString("fr-FR") : "56 010"} FCFA déjà versés — c'est réel`,
              `${loaded ? stats.echos : "552"}+ Échos déjà inscrits`,
              "100% gratuit — aucun investissement",
              "Retrait dès 1 000 FCFA",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                <p className="text-white/70 text-sm">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-10">
          Ils ont déjà gagné
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
          Questions fréquentes
        </h2>
        {echoFAQ.map((f) => (
          <FAQItem key={f.q} question={f.q} answer={f.a} />
        ))}
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-6">
          Prêt à gagner avec WhatsApp ?
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
          >
            📱 Devenir un Écho — c&apos;est gratuit
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-bold transition-colors"
          >
            🤝 Parraine un ami → 150 FCFA
          </Link>
        </div>
        <p className="mt-6 text-white/30 text-sm">
          <a href="mailto:support@tamma.me" className="hover:underline">
            support@tamma.me
          </a>
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}
