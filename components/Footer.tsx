import Link from "next/link";
import SoundWave from "@/components/ui/SoundWave";

export default function Footer() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-center gap-1 py-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-[2px] bg-gradient-to-t from-primary/20 to-primary-light/10 rounded-full animate-wave-bar"
              style={{
                height: `${8 + Math.sin(i * 0.5) * 8}px`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>
      <footer className="px-4 sm:px-6 py-10 sm:py-14 border-t border-white/5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl font-black gradient-text">Tamtam</span>
              <SoundWave bars={3} className="h-3 opacity-40" />
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              La plateforme de micro-influence au Sénégal.
              Partage des liens, gagne de l&apos;argent.
            </p>
          </div>

          {/* Plateforme */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
              Plateforme
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="text-sm text-white/30 hover:text-white/60 transition">
                  Devenir un Écho
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-white/30 hover:text-white/60 transition">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">
              Légal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-white/30 hover:text-white/60 transition">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-white/30 hover:text-white/60 transition">
                  Conditions d&apos;utilisation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} Tamtam. Partage. Résonne. Gagne.
          </p>
        </div>
      </footer>
    </>
  );
}
