import { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import SoundWave from "@/components/ui/SoundWave";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl font-black gradient-text">Tamtam</span>
          <SoundWave bars={4} className="h-4 sm:h-5 opacity-60" />
        </Link>
        <Link href="/login" className="text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition">
          Connexion
        </Link>
      </header>

      <main className="px-4 sm:px-6 py-10 sm:py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Conditions d&apos;utilisation</h1>
        <p className="text-sm text-white/30 mb-8">Dernière mise à jour : mars 2026</p>

        <div className="prose-custom space-y-8 text-sm text-white/50 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">1. Acceptation des conditions</h2>
            <p>
              En utilisant Tamtam (tamma.me), vous acceptez les présentes conditions d&apos;utilisation.
              Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">2. Description du service</h2>
            <p>
              Tamtam est une plateforme de micro-influence qui met en relation des annonceurs
              (« Batteurs ») et des partageurs (« Échos »). Les Batteurs créent des campagnes
              publicitaires et les Échos partagent les liens sur WhatsApp pour gagner de l&apos;argent
              par clic validé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">3. Inscription et compte</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Vous devez avoir au moins 18 ans pour utiliser Tamtam</li>
              <li>Les informations fournies lors de l&apos;inscription doivent être exactes</li>
              <li>Vous êtes responsable de la sécurité de votre mot de passe</li>
              <li>Un même numéro de téléphone peut être associé à un compte Écho et un compte Batteur</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">4. Règles pour les Échos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Les clics doivent provenir de personnes réelles et uniques</li>
              <li>Toute forme de fraude (clics artificiels, bots, auto-clics) est strictement interdite</li>
              <li>Les liens doivent être partagés sur WhatsApp ou d&apos;autres canaux légitimes</li>
              <li>Le montant minimum de retrait est de 500 FCFA</li>
              <li>Les retraits sont traités via Wave ou Orange Money</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">5. Règles pour les Batteurs</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Les campagnes doivent respecter la législation sénégalaise</li>
              <li>Le contenu publicitaire ne doit pas être trompeur, offensant ou illégal</li>
              <li>Le budget de campagne est débité lors de la création et remboursé (hors dépenses) en cas d&apos;annulation</li>
              <li>Tamtam se réserve le droit de rejeter ou suspendre toute campagne</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">6. Paiements et commissions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tamtam prélève une commission de 25% sur chaque clic validé</li>
              <li>Les Échos reçoivent 75% du coût par clic (CPC) défini par le Batteur</li>
              <li>Les rechargements se font via les méthodes de paiement disponibles (Wave, Orange Money)</li>
              <li>Les montants sont exprimés en FCFA (Franc CFA)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">7. Anti-fraude</h2>
            <p>
              Tamtam utilise un système de détection de fraude avancé. En cas de comportement
              suspect, votre compte peut être signalé, suspendu, ou définitivement banni.
              Les fonds issus de clics frauduleux ne seront pas versés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">8. Propriété intellectuelle</h2>
            <p>
              Tout le contenu de la plateforme Tamtam (logo, design, code) est la propriété
              de Tamtam. Les créatifs des campagnes restent la propriété de leurs Batteurs respectifs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">9. Limitation de responsabilité</h2>
            <p>
              Tamtam ne peut être tenu responsable des pertes ou dommages résultant de
              l&apos;utilisation de la plateforme, y compris les interruptions de service,
              les erreurs techniques ou les actes de fraude commis par des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">10. Modification des conditions</h2>
            <p>
              Tamtam se réserve le droit de modifier ces conditions à tout moment.
              Les utilisateurs seront informés des changements significatifs.
              L&apos;utilisation continue de la plateforme vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">11. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par le droit sénégalais. Tout litige sera
              soumis aux tribunaux compétents de Dakar, Sénégal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">12. Contact</h2>
            <p>
              Pour toute question, contactez-nous à :{" "}
              <a href="mailto:contact@tamma.me" className="text-primary hover:underline">contact@tamma.me</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
