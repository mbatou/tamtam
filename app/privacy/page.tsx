import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import SoundWave from "@/components/ui/SoundWave";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={120} height={32} priority className="h-7 w-auto" />
          <SoundWave bars={4} className="h-4 sm:h-5 opacity-60" />
        </Link>
        <Link href="/login" className="text-xs sm:text-sm font-semibold text-white/60 hover:text-white transition">
          Connexion
        </Link>
      </header>

      <main className="px-4 sm:px-6 py-10 sm:py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Politique de confidentialité</h1>
        <p className="text-sm text-white/30 mb-8">Dernière mise à jour : mars 2026</p>

        <div className="prose-custom space-y-8 text-sm text-white/50 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">1. Introduction</h2>
            <p>
              Tamtam (accessible via tamma.me) est une plateforme de micro-influence opérant au Sénégal.
              Nous nous engageons à protéger la vie privée de nos utilisateurs. Cette politique décrit
              comment nous collectons, utilisons et protégeons vos données personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-white/60">Informations d&apos;inscription :</strong> nom, prénom, email, numéro de téléphone, mot de passe (chiffré)</li>
              <li><strong className="text-white/60">Données de paiement :</strong> numéro de téléphone mobile money (Wave, Orange Money) pour les retraits</li>
              <li><strong className="text-white/60">Données d&apos;utilisation :</strong> clics sur les liens, adresses IP, user-agent du navigateur, horodatage des actions</li>
              <li><strong className="text-white/60">Données de campagne :</strong> contenu des campagnes créées par les Batteurs (annonceurs)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">3. Utilisation des données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Fournir et améliorer nos services</li>
              <li>Valider les clics et prévenir la fraude</li>
              <li>Traiter les paiements et retraits</li>
              <li>Communiquer avec vous concernant votre compte</li>
              <li>Assurer la sécurité de la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">4. Protection des données</h2>
            <p>
              Nous utilisons des mesures de sécurité techniques et organisationnelles pour protéger
              vos données, notamment le chiffrement SSL/TLS, le hachage des mots de passe,
              et des contrôles d&apos;accès stricts à notre base de données.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">5. Partage des données</h2>
            <p>
              Nous ne vendons jamais vos données personnelles. Nous pouvons partager des données avec :
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nos prestataires de paiement (PayTech) pour traiter les transactions</li>
              <li>Les autorités compétentes si la loi l&apos;exige</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">6. Conservation des données</h2>
            <p>
              Vos données sont conservées aussi longtemps que votre compte est actif.
              Vous pouvez demander la suppression de votre compte et de vos données
              en nous contactant par email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">7. Vos droits</h2>
            <p>Vous avez le droit de :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier vos données inexactes</li>
              <li>Demander la suppression de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">8. Cookies</h2>
            <p>
              Nous utilisons des cookies essentiels pour le fonctionnement de la plateforme
              (authentification, session). Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/80 mb-3">9. Contact</h2>
            <p>
              Pour toute question concernant cette politique : <a href="mailto:contact@tamma.me" className="text-primary hover:underline">contact@tamma.me</a> ou{" "}
              <a href="https://wa.me/221762799393" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">WhatsApp +221 76 279 93 93</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
