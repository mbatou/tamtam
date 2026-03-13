"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SoundWave from "@/components/ui/SoundWave";
import Footer from "@/components/Footer";

function BrandLeadForm() {
  const [form, setForm] = useState({ business_name: "", contact_name: "", email: "", whatsapp: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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
        <p className="text-sm font-semibold text-teal-400">Inscription recue !</p>
        <p className="text-xs text-white/40 mt-1">Vous recevrez vos identifiants d&apos;acces tres bientot.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Nom de l'entreprise"
          required
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          className="input-field text-sm"
        />
        <input
          type="text"
          placeholder="Votre nom"
          required
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          className="input-field text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="email"
          placeholder="Email professionnel"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="input-field text-sm"
        />
        <input
          type="tel"
          placeholder="WhatsApp (optionnel)"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          className="input-field text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full text-sm py-3 disabled:opacity-50"
      >
        {submitting ? "Envoi..." : "Obtenir mon acces"}
      </button>
    </form>
  );
}

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
    <span className="text-3xl sm:text-4xl md:text-5xl font-black gradient-text animate-count">
      {new Intl.NumberFormat("fr-FR").format(count)}{suffix}
    </span>
  );
}

function RippleCircles() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="ripple-circle absolute w-32 sm:w-40 h-32 sm:h-40"
          style={{ animationDelay: `${i * 0.8}s` }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={4} className="h-4 sm:h-5 opacity-60" />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition">
            Connexion
          </Link>
          <Link href="/register" className="btn-primary text-xs sm:text-sm !py-2 !px-4 sm:!px-5">
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 sm:px-6 py-14 sm:py-20 md:py-32 max-w-7xl mx-auto text-center noise-overlay">
        <RippleCircles />
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1] mb-4 sm:mb-6 tracking-tight">
            Ton statut a de la{" "}
            <span className="gradient-text">valeur</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            Partage des liens de marques sur ton WhatsApp Status et gagne de l&apos;argent
            pour chaque clic.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/register" className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto text-center">
              Deviens un Echo
            </Link>
            <a href="#pour-les-marques" className="btn-outline text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto text-center">
              Je suis une marque
            </a>
          </div>
          <p className="mt-6 sm:mt-8 text-xs sm:text-sm font-semibold text-white/30 tracking-widest uppercase">
            Partage. Resonne. Gagne.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 max-w-7xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-10 sm:mb-16">
          Comment ca marche ?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
          {[
            {
              step: "01",
              title: "Choisis un Rythme",
              desc: "Parcours les campagnes disponibles et accepte celles qui te plaisent. Tu recois un lien unique.",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
            },
            {
              step: "02",
              title: "Propage l'Echo",
              desc: "Partage ton lien sur WhatsApp Status, dans tes groupes, avec tes contacts.",
              icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
            },
            {
              step: "03",
              title: "Gagne tes FCFA",
              desc: "Chaque clic valide te rapporte de l'argent. Retire via Wave ou Orange Money.",
              icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 sm:p-8 text-center hover-lift">
              <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 sm:mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
              <span className="text-xs font-bold text-primary mb-2 block">{item.step}</span>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{item.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 max-w-7xl mx-auto">
        <div className="glass-card p-6 sm:p-10 md:p-16 animate-pulse-glow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { value: 12500, suffix: "+", label: "Echos actifs" },
              { value: 340, suffix: "", label: "Rythmes lances" },
              { value: 2800000, suffix: "", label: "Resonances" },
              { value: 45000000, suffix: "", label: "FCFA distribues" },
            ].map((stat) => (
              <div key={stat.label}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 sm:mt-2 font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Brands */}
      <section id="pour-les-marques" className="px-4 sm:px-6 py-14 sm:py-20 max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-3 sm:mb-4 block">
            Pour les marques
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Touchez des milliers de personnes via le{" "}
            <span className="gradient-text">bouche-a-oreille digital</span>
          </h2>
          <p className="text-white/40 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Lancez une campagne, definissez votre budget et votre cout par clic.
            Des milliers d&apos;Echos partagent votre lien sur WhatsApp. Vous ne payez
            que pour les clics reels et verifies.
          </p>
        </div>

        {/* Brand benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-14">
          {[
            { icon: "🎯", title: "Ciblage local", desc: "Vos campagnes touchent de vraies personnes au Senegal via WhatsApp" },
            { icon: "💰", title: "Cout par clic", desc: "Ne payez que pour les clics verifies. Zero gaspillage de budget." },
            { icon: "📊", title: "Suivi en temps reel", desc: "Dashboard complet avec stats de clics, conversions et ROI." },
          ].map((b) => (
            <div key={b.title} className="glass-card p-5 sm:p-6 text-center">
              <span className="text-2xl mb-3 block">{b.icon}</span>
              <h3 className="text-sm sm:text-base font-bold mb-2">{b.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Lead gen + campaign preview */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* Lead capture form */}
          <div className="glass-card p-6 sm:p-8 border border-secondary/20" style={{ boxShadow: "0 0 40px rgba(26,188,156,0.06)" }}>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Obtenez votre acces Batteur</h3>
            <p className="text-xs text-white/40 mb-5">Inscrivez-vous et commencez a lancer vos campagnes WhatsApp.</p>
            <BrandLeadForm />
            <p className="text-[10px] text-white/20 mt-3 text-center">
              Deja un compte ?{" "}
              <Link href="/login?tab=batteur" className="text-secondary/60 hover:text-secondary transition">
                Connectez-vous
              </Link>
            </p>
          </div>

          {/* Campaign preview card */}
          <div className="glass-card p-6 sm:p-8 hover-lift">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Campagne: Promo Ramadan</span>
                <span className="badge-active">Actif</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full transition-all duration-1000" style={{ width: "68%" }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl sm:text-2xl font-black">2,340</p>
                  <p className="text-[10px] text-white/40">Resonances</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black">156</p>
                  <p className="text-[10px] text-white/40">Echos</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black gradient-text">25 FCFA</p>
                  <p className="text-[10px] text-white/40">CPC</p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-xs text-white/30 mb-3">Pourquoi les marques choisissent Tamtam :</p>
              <div className="space-y-2">
                {["Resultats mesurables en 24h", "Budget a partir de 10 000 FCFA", "Support dedie pour chaque campagne"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-teal-400 shrink-0" />
                    <span className="text-xs text-white/40">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-14 sm:py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Echo CTA */}
          <div className="glass-card p-8 sm:p-10 text-center bg-gradient-to-br from-primary/10 to-primary-light/5">
            <SoundWave bars={5} className="h-5 sm:h-6 justify-center mb-4 opacity-40" />
            <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">
              Gagne de l&apos;argent avec ton WhatsApp
            </h2>
            <p className="text-white/40 mb-6 text-sm max-w-sm mx-auto">
              Partage des liens de marques sur ton statut et gagne pour chaque clic.
            </p>
            <Link href="/register" className="btn-primary text-sm sm:text-base px-8 py-3">
              Devenir un Echo
            </Link>
          </div>

          {/* Brand CTA */}
          <div className="glass-card p-8 sm:p-10 text-center bg-gradient-to-br from-secondary/10 to-secondary/5">
            <span className="text-2xl sm:text-3xl block mb-3">🎯</span>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">
              Boostez votre visibilite
            </h2>
            <p className="text-white/40 mb-6 text-sm max-w-sm mx-auto">
              Lancez des campagnes WhatsApp et touchez des milliers de personnes au Senegal.
            </p>
            <a href="#pour-les-marques" className="btn-outline text-sm sm:text-base px-8 py-3 border-secondary/30 text-secondary hover:bg-secondary/10">
              Obtenir mon acces
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
