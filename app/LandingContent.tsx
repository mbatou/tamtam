"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SoundWave from "@/components/ui/SoundWave";
import Footer from "@/components/Footer";
import { formatFCFA } from "@/lib/utils";

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


/* ─── Main Landing Content ─── */
export default function LandingContent() {
  const searchParams = useSearchParams();
  const [side, setSide] = useState<"brand" | "echo">("brand");
  const [stats, setStats] = useState({ echos: 0, campaigns: 0, validClicks: 0, totalPaid: 0, withdrawalCount: 0, batteurs: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    const param = searchParams.get("side");
    if (param === "echo") setSide("echo");
    if (param === "brand") setSide("brand");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) { setStats(data); setStatsLoaded(true); }
      })
      .catch(() => {});
  }, []);

  const handleSwitch = (newSide: "brand" | "echo") => {
    setSide(newSide);
    window.history.replaceState(null, "", newSide === "brand" ? "/" : "?side=echo");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={4} className="h-4 sm:h-5 opacity-60" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Live stats bar */}
          {statsLoaded && (
            <div className="hidden md:flex items-center gap-3 text-[11px] text-white/30 mr-2">
              <span className="live-dot !w-[5px] !h-[5px]" />
              <span>{stats.echos} Échos</span>
              <span className="text-white/10">·</span>
              <span>{stats.batteurs} Marques</span>
              <span className="text-white/10">·</span>
              <span>{formatFCFA(stats.totalPaid)} versés</span>
            </div>
          )}
          <Link href="/login" className="text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition">
            Connexion
          </Link>
          <Link
            href={side === "echo" ? "/register" : "/signup/brand"}
            className="btn-primary text-xs sm:text-sm !py-2 !px-4 sm:!px-5"
          >
            S&apos;inscrire
          </Link>
        </div>
      </header>

      {/* ─── Section 1: HERO + CHOOSER ─── */}
      <section className="relative px-4 sm:px-6 py-10 sm:py-16 md:py-20 max-w-5xl mx-auto text-center noise-overlay">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.08] mb-4 sm:mb-6 tracking-tight">
          Le bouche-à-oreille digital<br />
          au <span className="gradient-text">Sénégal</span>
        </h1>
        <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto mb-10 sm:mb-14">
          Tamtam connecte les marques qui veulent être vues avec les Sénégalais qui partagent sur{" "}
          <span className="text-[#25D366]">WhatsApp</span>.
        </p>

        {/* THE CHOOSER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
          <button
            onClick={() => handleSwitch("brand")}
            className={`relative rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 border-2 ${
              side === "brand"
                ? "border-orange-500 bg-orange-500/5 scale-[1.02] shadow-lg shadow-orange-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <span className="text-2xl mb-2 block">📢</span>
            <span className="text-base sm:text-lg font-bold block mb-1">Je suis une marque</span>
            <span className="text-xs sm:text-sm text-white/40">Je veux être vu par des milliers de personnes</span>
          </button>

          <button
            onClick={() => handleSwitch("echo")}
            className={`relative rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 border-2 ${
              side === "echo"
                ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <span className="text-2xl mb-2 block">💰</span>
            <span className="text-base sm:text-lg font-bold block mb-1">Je suis un Écho</span>
            <span className="text-xs sm:text-sm text-white/40">Je veux gagner de l&apos;argent avec mon WhatsApp</span>
          </button>
        </div>
      </section>

      {/* ─── Section 2: SIDE-SPECIFIC CONTENT ─── */}
      <div className="relative">
        {side === "brand" && <BrandContent stats={stats} statsLoaded={statsLoaded} />}
        {side === "echo" && <EchoContent stats={stats} statsLoaded={statsLoaded} />}
      </div>

      {/* ─── Section 3: DYNAMIC FAQ ─── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-12">
          Questions fréquentes
        </h2>
        <div className="glass-card p-4 sm:p-6">
          {side === "brand" ? (
            <>
              <FAQItem
                question="Comment fonctionne le coût par clic?"
                answer="Vous définissez combien vous êtes prêt à payer par clic vérifié (CPC). Seuls les clics uniques et authentiques sont comptabilisés grâce à notre système anti-fraude. Vous ne payez jamais pour des clics invalides."
              />
              <FAQItem
                question="Combien de temps dure une campagne?"
                answer="La durée dépend de votre budget et de votre CPC. En général, les premiers résultats arrivent dans les 24h. Vous pouvez mettre en pause ou arrêter à tout moment."
              />
              <FAQItem
                question="Puis-je mettre en pause ma campagne?"
                answer="Oui, vous pouvez mettre en pause et reprendre votre campagne à tout moment depuis votre tableau de bord. Le budget non dépensé reste disponible."
              />
              <FAQItem
                question="Comment recharger mon portefeuille?"
                answer="Via Wave, Orange Money ou virement bancaire. Les recharges sont instantanées pour les paiements mobiles."
              />
              <FAQItem
                question="Quel budget minimum pour commencer?"
                answer="Vous pouvez lancer une campagne dès 5 000 FCFA. Nous recommandons 10 000 FCFA pour voir des résultats significatifs."
              />
            </>
          ) : (
            <>
              <FAQItem
                question="Est-ce que c'est une arnaque?"
                answer="Non ! Tamtam est une plateforme réelle. Nous avons déjà versé plus de 56 000 FCFA à nos Échos. Vos gains sont retirables via Wave ou Orange Money dès 1 000 FCFA."
              />
              <FAQItem
                question="Comment retirer mon argent?"
                answer="Depuis l'onglet 'Gains' de l'application, cliquez sur 'Retirer'. Choisissez Wave ou Orange Money, entrez votre numéro, et recevez votre argent en quelques minutes."
              />
              <FAQItem
                question="Combien puis-je gagner?"
                answer="Ça dépend de votre réseau ! En moyenne, un Écho actif gagne entre 1 000 et 7 500 FCFA par semaine en partageant 2-3 liens. Les meilleurs Échos dépassent 5 000 FCFA/semaine."
              />
              <FAQItem
                question="Comment fonctionne le parrainage?"
                answer="Partagez votre code de parrainage avec vos amis. Quand ils s'inscrivent et commencent à partager, vous recevez 150 FCFA de bonus."
              />
              <FAQItem
                question="Dois-je investir de l'argent?"
                answer="Absolument pas. Tamtam est 100% gratuit pour les Échos. Vous n'avez besoin que de votre téléphone et de WhatsApp."
              />
            </>
          )}
        </div>
      </section>

      {/* ─── Live Stats Footer Bar ─── */}
      <section className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="glass-card p-4 sm:p-6 border border-primary/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <AnimatedCounter target={statsLoaded ? stats.echos : 0} suffix="+" />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1 font-semibold">Échos inscrits</p>
            </div>
            <div>
              <AnimatedCounter target={statsLoaded ? stats.batteurs : 0} suffix="+" />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1 font-semibold">Marques</p>
            </div>
            <div>
              <AnimatedCounter target={statsLoaded ? stats.validClicks : 0} suffix="+" />
              <p className="text-[10px] sm:text-xs text-white/40 mt-1 font-semibold">Clics vérifiés</p>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-black gradient-text">
                {statsLoaded ? formatFCFA(stats.totalPaid) : "—"}
              </span>
              <p className="text-[10px] sm:text-xs text-white/40 mt-1 font-semibold">FCFA versés</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-3 flex items-center justify-center gap-1.5">
            <span className="live-dot !w-[5px] !h-[5px]" />
            Live from Dakar
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BRAND CONTENT
   ═══════════════════════════════════════════════════════════════════ */
interface ContentProps {
  stats: { echos: number; campaigns: number; validClicks: number; totalPaid: number; withdrawalCount: number; batteurs: number };
  statsLoaded: boolean;
}

function BrandContent({ stats, statsLoaded }: ContentProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Value prop */}
      <section className="py-10 sm:py-16 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
          Touchez des milliers de personnes via le<br className="hidden sm:block" /> bouche-à-oreille{" "}
          <span className="text-[#25D366]">WhatsApp</span>
        </h2>
        <p className="text-white/40 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          {statsLoaded ? stats.echos : "552"}+ Échos partagent votre lien sur leur statut WhatsApp.
          Leurs contacts cliquent. Vous ne payez que les clics vérifiés.
        </p>
      </section>

      {/* Key metrics */}
      <section className="pb-10 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 sm:p-6 text-center">
            <p className="text-3xl font-black text-orange-400">20 FCFA</p>
            <p className="text-xs text-white/40 mt-1">par clic vérifié</p>
          </div>
          <div className="glass-card p-5 sm:p-6 text-center">
            <p className="text-3xl font-black">{statsLoaded ? stats.echos : "552"}+</p>
            <p className="text-xs text-white/40 mt-1">Échos actifs</p>
          </div>
          <div className="glass-card p-5 sm:p-6 text-center">
            <p className="text-3xl font-black text-accent">24h</p>
            <p className="text-xs text-white/40 mt-1">premiers résultats</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-10 sm:pb-16">
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-12">Comment ça marche</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { step: "01", title: "Créez votre compte", desc: "Inscription gratuite en 2 minutes avec email", icon: "📝" },
            { step: "02", title: "Lancez une campagne", desc: "Choisissez votre budget, votre CPC, uploadez votre visuel", icon: "🚀" },
            { step: "03", title: "Les Échos partagent", desc: `${statsLoaded ? stats.echos : "552"} personnes partagent votre lien sur WhatsApp Status — résultats en temps réel`, icon: "📊" },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 text-center hover-lift">
              <span className="text-3xl mb-3 block">{item.icon}</span>
              <span className="text-xs font-bold text-orange-400 mb-2 block">{item.step}</span>
              <h4 className="text-lg font-bold mb-2">{item.title}</h4>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI comparison */}
      <section className="pb-10 sm:pb-16">
        <div className="glass-card p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-center mb-6">Comparez les coûts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-white/40 mb-1 text-xs font-semibold">Facebook Ads</p>
              <p className="font-bold text-lg">200-500 FCFA</p>
              <p className="text-xs text-white/30">par clic</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-white/40 mb-1 text-xs font-semibold">Instagram Ads</p>
              <p className="font-bold text-lg">300-800 FCFA</p>
              <p className="text-xs text-white/30">par clic</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-emerald-400 mb-1 text-xs font-semibold">Tamtam</p>
              <p className="font-bold text-lg text-emerald-400">dès 20 FCFA</p>
              <p className="text-xs text-emerald-400/60">par clic vérifié — jusqu&apos;à 75% moins cher</p>
            </div>
          </div>
        </div>
      </section>

      {/* Case study teaser */}
      <section className="pb-10 sm:pb-16">
        <div className="glass-card p-6 sm:p-8 border border-orange-500/10 max-w-2xl mx-auto">
          <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-3">Étude de cas</p>
          <blockquote className="text-base sm:text-lg text-white/80 leading-relaxed mb-4">
            &quot;Nous avons dépensé 5 000 FCFA pour promouvoir un article LinkedIn.
            Résultat : 319 vues, 136 visiteurs vérifiés, 31 Échos actifs.&quot;
          </blockquote>
          <div className="flex items-center gap-4 text-sm text-white/30">
            <span>319 vues</span>
            <span className="text-white/10">·</span>
            <span>136 clics vérifiés</span>
            <span className="text-white/10">·</span>
            <span>31 Échos</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-10 sm:pb-16">
        <div className="bg-card rounded-2xl p-6 sm:p-8 text-center max-w-2xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">
            Prêt à toucher des milliers de personnes ?
          </h3>
          <p className="text-white/40 text-sm mb-5">
            Dès 10 000 FCFA — lancez votre première campagne. Résultats en 24h.
          </p>

          {/* Promo banner */}
          {new Date() < new Date("2026-04-01") && (
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-3 mb-5">
              <div className="text-white font-bold">10 000 FCFA offerts à l&apos;inscription !</div>
              <div className="text-white/80 text-xs">Offre limitée — jusqu&apos;au 1er avril 2026</div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup/brand" className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base sm:text-lg transition text-center">
              🚀 Créer mon compte gratuitement
            </Link>
            <a
              href="https://wa.me/221781234567?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20Tamtam"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-xl border border-green-500 text-green-400 hover:bg-green-500/10 font-bold text-base sm:text-lg transition text-center"
            >
              💬 WhatsApp
            </a>
          </div>
          <p className="text-white/30 text-sm mt-4">
            Déjà inscrit ?{" "}
            <Link href="/login?tab=batteur" className="text-accent underline">Se connecter →</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ÉCHO CONTENT
   ═══════════════════════════════════════════════════════════════════ */
function EchoContent({ stats, statsLoaded }: ContentProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Value prop */}
      <section className="py-10 sm:py-16 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
          Gagne de l&apos;argent avec ton<br className="hidden sm:block" /> statut{" "}
          <span className="text-[#25D366]">WhatsApp</span>
        </h2>
        <p className="text-white/40 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Partage des liens sur ton statut. Tes contacts cliquent. Tu gagnes de l&apos;argent.
          Retrait via Wave ou Orange Money.
        </p>
      </section>

      {/* Key metrics */}
      <section className="pb-10 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 sm:p-6 text-center">
            <p className="text-3xl font-black text-accent">{statsLoaded ? formatFCFA(stats.totalPaid) : "56 010"}</p>
            <p className="text-xs text-white/40 mt-1">FCFA déjà versés</p>
          </div>
          <div className="glass-card p-5 sm:p-6 text-center">
            <p className="text-3xl font-black">{statsLoaded ? stats.echos : "552"}+</p>
            <p className="text-xs text-white/40 mt-1">Échos inscrits</p>
          </div>
          <div className="glass-card p-5 sm:p-6 text-center">
            <p className="text-3xl font-black text-primary">1 000 FCFA</p>
            <p className="text-xs text-white/40 mt-1">retrait minimum</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-10 sm:pb-16">
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-12">Comment ça marche</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { step: "01", title: "Inscris-toi gratuitement", desc: "Crée ton compte en 30 secondes", icon: "📱" },
            { step: "02", title: "Accepte un Rythme", desc: "Choisis parmi les campagnes disponibles — tu reçois un lien personnalisé", icon: "🎵" },
            { step: "03", title: "Partage sur ton statut", desc: "Tes contacts cliquent → tu gagnes 15-188 FCFA par clic vérifié → retire sur Wave ou Orange Money", icon: "💰" },
          ].map((item) => (
            <div key={item.step} className="glass-card p-6 text-center hover-lift">
              <span className="text-3xl mb-3 block">{item.icon}</span>
              <span className="text-xs font-bold text-primary mb-2 block">{item.step}</span>
              <h4 className="text-lg font-bold mb-2">{item.title}</h4>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings examples */}
      <section className="pb-10 sm:pb-16">
        <div className="glass-card p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-center mb-6">Combien tu peux gagner</h3>
          <div className="space-y-3 max-w-lg mx-auto">
            {[
              { action: "Partage 1 lien", result: "10-50 clics", earn: "150 — 2 500 FCFA" },
              { action: "Partage 3 liens/semaine", result: "", earn: "1 000 — 7 500 FCFA/semaine" },
              { action: "Top Échos", result: "", earn: "5 000+ FCFA/semaine" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{row.action}</p>
                  {row.result && <p className="text-xs text-white/30">{row.result}</p>}
                </div>
                <p className="text-sm font-bold text-accent">{row.earn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gamification teaser */}
      <section className="pb-10 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 text-center hover-lift">
            <span className="text-2xl block mb-2">🔥</span>
            <h4 className="text-sm font-bold mb-1">Série quotidienne</h4>
            <p className="text-xs text-white/40">Maintiens ta série → bonus</p>
          </div>
          <div className="glass-card p-5 text-center hover-lift">
            <span className="text-2xl block mb-2">🏅</span>
            <h4 className="text-sm font-bold mb-1">Badges</h4>
            <p className="text-xs text-white/40">Gagne des badges → récompenses</p>
          </div>
          <div className="glass-card p-5 text-center hover-lift">
            <span className="text-2xl block mb-2">🏆</span>
            <h4 className="text-sm font-bold mb-1">Classement</h4>
            <p className="text-xs text-white/40">Monte au classement → visibilité</p>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="pb-10 sm:pb-16">
        <div className="glass-card p-6 sm:p-8 max-w-2xl mx-auto">
          <h3 className="text-lg font-bold mb-4 text-center">Pourquoi nous faire confiance</h3>
          <div className="space-y-3">
            {[
              { icon: "✓", text: "Paiement via Wave et Orange Money" },
              { icon: "✓", text: `Pas d'arnaque — vos gains sont réels (${statsLoaded ? formatFCFA(stats.totalPaid) : "56 010"} FCFA déjà versés)` },
              { icon: "✓", text: "Aucun investissement requis — c'est 100% gratuit" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold shrink-0">{item.icon}</span>
                <span className="text-sm text-white/60">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="pb-10 sm:pb-16">
        <div className="glass-card p-6 border border-accent/10 max-w-2xl mx-auto text-center">
          <blockquote className="text-base sm:text-lg text-white/80 leading-relaxed mb-3">
            &quot;J&apos;ai gagné 6 438 FCFA en partageant 3 liens&quot;
          </blockquote>
          <p className="text-sm text-white/30">— Biggy ndaw, Rufisque</p>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-10 sm:pb-16">
        <div className="bg-card rounded-2xl p-6 sm:p-8 text-center max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary-light/5">
          <SoundWave bars={5} className="h-5 sm:h-6 justify-center mb-4 opacity-40" />
          <h3 className="text-xl sm:text-2xl font-bold mb-2">
            Prêt à gagner avec WhatsApp ?
          </h3>
          <p className="text-white/40 text-sm mb-5">
            Inscription gratuite — commence à gagner en 30 secondes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary text-base sm:text-lg px-8 py-3 text-center">
              📱 Devenir un Écho — c&apos;est gratuit
            </Link>
          </div>
          <p className="text-white/30 text-sm mt-4">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-accent underline">Se connecter →</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
