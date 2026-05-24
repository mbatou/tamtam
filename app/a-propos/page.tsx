import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos | Tamtam",
  description: "Tamtam est la plateforme de micro-influence qui connecte les marques sénégalaises aux voix qui comptent.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A1A]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/tamtam-horizontal-orange.png"
            alt="Tamtam"
            width={120}
            height={32}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <Link
          href="/login"
          className="text-xs sm:text-sm font-semibold text-white/50 hover:text-white transition font-dm"
        >
          Connexion
        </Link>
      </header>

      {/* Hero / Mission */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold font-syne tracking-tight text-white mb-6">
          Le bouche-à-oreille,
          <br />
          <span className="gradient-text">digitalisé.</span>
        </h1>
        <p className="text-lg text-white/45 font-dm leading-relaxed max-w-2xl mx-auto">
          Tamtam est la première plateforme de micro-influence au Sénégal.
          Nous connectons les marques aux voix qui comptent : les gens ordinaires
          qui partagent ce qu&apos;ils aiment sur WhatsApp, et qui méritent d&apos;être rémunérés pour ça.
        </p>
      </section>

      {/* How it started */}
      <section className="px-4 sm:px-6 py-16 max-w-4xl mx-auto">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold font-syne text-white mb-6">Comment tout a commencé</h2>
          <div className="space-y-4 text-sm text-white/45 font-dm leading-relaxed">
            <p>
              Au Sénégal, le bouche-à-oreille est la forme de marketing la plus puissante.
              Quand quelqu&apos;un de confiance vous recommande un produit sur WhatsApp, vous écoutez.
              Pourtant, les marques dépensent des millions en publicités que personne ne regarde.
            </p>
            <p>
              Tamtam est né d&apos;une idée simple : et si on pouvait transformer chaque partage WhatsApp
              en une opportunité mesurable pour les marques, et en revenus réels pour les partageurs ?
            </p>
            <p>
              Aujourd&apos;hui, plus de 2 500 Échos gagnent de l&apos;argent chaque mois en partageant les
              campagnes des marques sénégalaises. Et les marques ne paient que pour les vrais clics
              — pas pour des impressions vides.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "2 500+", label: "Échos actifs" },
            { value: "500+", label: "Campagnes lancées" },
            { value: "75%", label: "Reversé aux Échos" },
            { value: "48h", label: "Durée moyenne campagne" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 text-center"
            >
              <p className="text-2xl sm:text-3xl font-bold font-syne text-white">{stat.value}</p>
              <p className="text-xs text-white/30 font-dm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="px-4 sm:px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold font-syne text-white mb-8 text-center">L&apos;équipe</h2>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center max-w-[480px] mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D35400] to-[#F39C12] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold font-syne text-white">P</span>
          </div>
          <p className="text-[15px] font-semibold text-white mb-2">Pandorus</p>
          <p className="text-[13px] text-white/45">Dakar, Sénégal &middot; 2024</p>
          <p className="text-[13px] text-white/35 mt-3 leading-relaxed">
            Une startup tech africaine qui construit l&apos;infrastructure publicitaire
            de demain pour l&apos;Afrique de l&apos;Ouest.
          </p>
          <div className="mt-4 pt-4 border-t border-white/[0.07]">
            <p className="text-[11px] text-white/30 leading-relaxed">
              Tamtam est un produit{" "}
              <a
                href="https://lupandu.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D35400] hover:underline underline-offset-2"
              >
                Lupandu
              </a>
              {" "}&mdash; une structure dédiée à la construction de produits tech africains.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-4 sm:px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold font-syne text-white mb-8 text-center">Contact</h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <a
            href="mailto:contact@tamma.me"
            className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#D35400]/15 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-[#D35400]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-dm">Email</p>
              <p className="text-xs text-white/35 font-dm group-hover:text-[#D35400] transition">contact@tamma.me</p>
            </div>
          </a>
          <a
            href="https://wa.me/221762799393"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/15 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white font-dm">WhatsApp</p>
              <p className="text-xs text-white/35 font-dm group-hover:text-[#1D9E75] transition">+221 76 279 93 93</p>
            </div>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-8 border-t border-white/[0.06] max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20 font-dm">
            Pandorus &middot; Dakar, Sénégal
          </p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-xs text-white/25 hover:text-white/40 transition font-dm">
              CGU
            </Link>
            <Link href="/privacy" className="text-xs text-white/25 hover:text-white/40 transition font-dm">
              Confidentialité
            </Link>
            <Link href="/" className="text-xs text-white/25 hover:text-white/40 transition font-dm">
              Accueil
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
