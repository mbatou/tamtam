"use client";

import { useState } from "react";
import ConversionFunnel from "@/components/ConversionFunnel";
import { formatFCFA } from "@/lib/utils";

const EXAMPLE_FUNNEL = {
  clicks: 5000,
  installs: 1200,
  signups: 744,
  subscriptions: 89,
  purchases: 0,
  leads: 0,
  custom: 0,
};

const EXAMPLE_RATES = {
  click_to_install: 24.0,
  install_to_signup: 62.0,
  signup_to_subscription: 12.0,
};

const STEPS = [
  {
    num: "01",
    title: "Créez un Pixel",
    time: "2 minutes",
    desc: "Dashboard → Pixel → Créer",
  },
  {
    num: "02",
    title: "Votre dev intègre",
    time: "15 minutes",
    desc: "3 appels API simples",
  },
  {
    num: "03",
    title: "Liez à une campagne",
    time: "30 secondes",
    desc: "Campagne → Pixel → Choisir",
  },
  {
    num: "04",
    title: "Voyez le funnel",
    time: "En temps réel",
    desc: "Clics → Clients",
  },
];

const FAQ = [
  {
    q: "Est-ce que le Pixel est obligatoire ?",
    a: "Non, vos campagnes fonctionnent parfaitement sans le Pixel. Le Pixel est un outil optionnel qui vous donne une visibilité supplémentaire sur les actions réalisées après le clic (installation, inscription, achat...).",
  },
  {
    q: "Est-ce que ça coûte plus cher ?",
    a: "Non, le Pixel Tamtam est entièrement gratuit. Il n'y a aucun frais supplémentaire. Vous payez uniquement pour vos campagnes comme d'habitude.",
  },
  {
    q: "Mon développeur a besoin de quoi ?",
    a: "Le Pixel ID, la clé API, et 3 endpoints à intégrer. Le guide technique complet avec les exemples cURL est disponible dans Dashboard → Pixel après création. L'intégration prend environ 15 minutes.",
  },
  {
    q: "Ça marche sur iOS et Android ?",
    a: "Oui, le Pixel fonctionne sur les deux plateformes. Sur iOS, le suivi peut être limité par les paramètres de confidentialité d'Apple (ATT), mais les événements côté serveur fonctionnent sans restriction.",
  },
];

export default function PixelGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-16">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-black leading-tight">
          Mesurez vos <span className="text-primary">vrais</span> résultats.
        </h1>
        <p className="text-lg text-white/40 max-w-lg mx-auto">
          Aujourd&apos;hui, vous voyez les clics. Avec le Pixel, vous voyez les clients.
        </p>
      </section>

      {/* How it works — 4 steps */}
      <section>
        <h2 className="text-sm font-bold text-white/30 uppercase tracking-wider text-center mb-6">
          Comment ça marche
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center"
            >
              <p className="text-3xl font-black text-primary mb-2">{step.num}</p>
              <h3 className="text-sm font-bold mb-1">{step.title}</h3>
              <p className="text-[10px] font-semibold text-accent mb-2">{step.time}</p>
              <p className="text-xs text-white/30">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Funnel preview */}
      <section>
        <h2 className="text-sm font-bold text-white/30 uppercase tracking-wider text-center mb-2">
          Exemple de funnel
        </h2>
        <p className="text-xs text-white/20 text-center mb-6">
          Campagne &quot;App Download&quot; — données simulées
        </p>
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
          <ConversionFunnel
            funnel={EXAMPLE_FUNNEL}
            rates={EXAMPLE_RATES}
            animated={true}
          />

          {/* Cost comparison callout */}
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">CPA Souscription</p>
              <p className="text-2xl font-black text-primary mt-1">{formatFCFA(2809)}</p>
              <p className="text-[10px] text-white/20">par souscription via Tamtam</p>
            </div>
            <div className="text-white/10 text-2xl font-light hidden sm:block">vs</div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Facebook / Meta Ads</p>
              <p className="text-2xl font-black text-white/20 mt-1 line-through">8 000 — 15 000 FCFA</p>
              <p className="text-[10px] text-white/20">estimation marché Afrique de l&apos;Ouest</p>
            </div>
          </div>
        </div>
      </section>

      {/* Prerequisites */}
      <section>
        <h2 className="text-sm font-bold text-white/30 uppercase tracking-wider text-center mb-6">
          Ce qu&apos;il vous faut
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { check: true, text: "Un compte Tamtam", sub: "Vous l'avez déjà" },
            { check: true, text: "Un site web ou une app", sub: "Où vous voulez tracker" },
            { check: true, text: "Un développeur", sub: "15 minutes de travail" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">{item.text}</p>
                <p className="text-[10px] text-white/30">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-sm font-bold text-white/30 uppercase tracking-wider text-center mb-6">
          Questions fréquentes
        </h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {FAQ.map((faq, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold">{faq.q}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform text-white/30 shrink-0 ml-3 ${openFaq === i ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-white/40 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pb-8">
        <h2 className="text-xl font-black mb-3">
          Prêt à voir vos vrais résultats ?
        </h2>
        <a
          href="/admin/pixel"
          className="inline-flex items-center gap-2 bg-gradient-primary text-white font-bold px-8 py-4 rounded-xl text-sm hover:opacity-90 transition"
        >
          Configurer mon Pixel
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </section>
    </div>
  );
}
