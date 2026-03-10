"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
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
  }, [target]);

  return (
    <span className="text-3xl md:text-4xl font-black gradient-text animate-count">
      {new Intl.NumberFormat("fr-FR").format(count)}{suffix}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-2xl font-black gradient-text">Tamtam</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-white/60 hover:text-white transition">
            Connexion
          </Link>
          <Link href="/register" className="btn-primary text-sm !py-2 !px-5">
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 md:py-32 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
          Ton statut a de la{" "}
          <span className="gradient-text">valeur</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10">
          Partage des liens de marques sur ton WhatsApp Status et gagne de l&apos;argent
          pour chaque clic. Simple, rapide, transparent.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="btn-primary text-lg px-10 py-4">
            Deviens un Écho
          </Link>
          <Link href="/login" className="btn-outline text-lg px-10 py-4">
            Lance ton Rythme
          </Link>
        </div>
        <p className="mt-8 text-sm font-semibold text-white/30 tracking-widest uppercase">
          Partage. Résonne. Gagne.
        </p>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-16">
          Comment ça marche ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Choisis un Rythme",
              desc: "Parcours les campagnes disponibles et accepte celles qui te plaisent. Tu reçois un lien unique.",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
            },
            {
              step: "02",
              title: "Propage l'Écho",
              desc: "Partage ton lien sur WhatsApp Status, dans tes groupes, avec tes contacts. Plus tu partages, plus tu gagnes.",
              icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
            },
            {
              step: "03",
              title: "Gagne tes FCFA",
              desc: "Chaque clic valide te rapporte de l'argent. Retire tes gains via Wave ou Orange Money.",
              icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-8 text-center group hover:scale-[1.02] transition-transform">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
              <span className="text-xs font-bold text-primary mb-2 block">{item.step}</span>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="glass-card p-10 md:p-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 12500, suffix: "+", label: "Échos actifs" },
              { value: 340, suffix: "", label: "Rythmes lancés" },
              { value: 2800000, suffix: "", label: "Résonances" },
              { value: 45000000, suffix: "", label: "FCFA distribués" },
            ].map((stat) => (
              <div key={stat.label}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <p className="text-xs text-white/40 mt-2 font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Brands */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 block">
              Pour les marques
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Touchez des milliers de personnes via le{" "}
              <span className="gradient-text">bouche-à-oreille digital</span>
            </h2>
            <p className="text-white/40 mb-8 leading-relaxed">
              Créez un Rythme, définissez votre budget et votre coût par clic.
              Des milliers d&apos;Échos partagent votre lien sur WhatsApp. Vous ne payez
              que pour les clics réels et vérifiés.
            </p>
            <Link href="/login" className="btn-outline">
              Devenir Batteur
            </Link>
          </div>
          <div className="glass-card p-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Campagne: Promo Ramadan</span>
                <span className="badge-active">Actif</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full" style={{ width: "68%" }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">2,340</p>
                  <p className="text-[10px] text-white/40">Résonances</p>
                </div>
                <div>
                  <p className="text-xl font-bold">156</p>
                  <p className="text-[10px] text-white/40">Échos</p>
                </div>
                <div>
                  <p className="text-xl font-bold">25 FCFA</p>
                  <p className="text-[10px] text-white/40">CPC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-7xl mx-auto text-center">
        <div className="glass-card p-12 md:p-16 bg-gradient-to-br from-primary/10 to-primary-light/5">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à faire résonner ?
          </h2>
          <p className="text-white/40 mb-8 max-w-lg mx-auto">
            Rejoins des milliers d&apos;Échos qui gagnent de l&apos;argent chaque jour en
            partageant simplement des liens.
          </p>
          <Link href="/register" className="btn-primary text-lg px-12 py-4">
            Commencer maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-white/5 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-black gradient-text">Tamtam</span>
          <p className="text-xs text-white/30">
            © 2024 Tamtam. Partage. Résonne. Gagne.
          </p>
        </div>
      </footer>
    </div>
  );
}
