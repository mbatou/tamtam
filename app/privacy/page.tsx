"use client";

import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "introduction", label: "1. Introduction" },
  { id: "responsable", label: "2. Responsable" },
  { id: "donnees", label: "3. Données collectées" },
  { id: "utilisation", label: "4. Utilisation" },
  { id: "base-legale", label: "5. Base légale" },
  { id: "protection", label: "6. Protection" },
  { id: "partage", label: "7. Partage" },
  { id: "conservation", label: "8. Conservation" },
  { id: "droits", label: "9. Vos droits" },
  { id: "cookies", label: "10. Cookies" },
  { id: "mineurs", label: "11. Mineurs" },
  { id: "modifications", label: "12. Modifications" },
  { id: "contact", label: "13. Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated="mai 2026" toc={toc}>
      <section id="introduction">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">1. Introduction</h2>
        <p>
          Tamtam (accessible via tamma.me) est une plateforme de micro-influence opérée par Pandorus,
          société de droit sénégalais basée à Dakar. Nous nous engageons à protéger la vie privée
          de nos utilisateurs conformément à la loi n° 2008-12 du 25 janvier 2008 sur la protection
          des données à caractère personnel au Sénégal et aux réglementations de la Commission des
          Données Personnelles (CDP) du Sénégal.
        </p>
      </section>

      <section id="responsable">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">2. Responsable du traitement</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-[#0A0A1A]/70">Entité :</strong> Pandorus</li>
          <li><strong className="text-[#0A0A1A]/70">Siège :</strong> Dakar, Sénégal</li>
          <li><strong className="text-[#0A0A1A]/70">Email :</strong> <a href="mailto:contact@tamma.me" className="text-[#D35400] hover:underline">contact@tamma.me</a></li>
          <li><strong className="text-[#0A0A1A]/70">Site :</strong> tamma.me</li>
        </ul>
      </section>

      <section id="donnees">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">3. Données collectées</h2>
        <p className="mb-3">Nous collectons les données suivantes :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-[#0A0A1A]/70">Données d&apos;inscription :</strong> nom, prénom, adresse email,
            numéro de téléphone, ville, mot de passe (haché de manière irréversible).
          </li>
          <li>
            <strong className="text-[#0A0A1A]/70">Données de paiement :</strong> numéro de téléphone mobile money
            (Wave, Orange Money) pour les retraits. Nous ne stockons aucune donnée bancaire.
          </li>
          <li>
            <strong className="text-[#0A0A1A]/70">Données d&apos;utilisation :</strong> clics sur les liens de campagne,
            adresses IP, user-agent du navigateur, horodatage des actions, pages visitées.
          </li>
          <li>
            <strong className="text-[#0A0A1A]/70">Données de campagne :</strong> contenu des campagnes créées
            par les Batteurs (annonceurs), médias uploadés, URLs de destination.
          </li>
          <li>
            <strong className="text-[#0A0A1A]/70">Données de géolocalisation :</strong> ville déclarée lors
            de l&apos;inscription (pas de géolocalisation en temps réel).
          </li>
        </ul>
      </section>

      <section id="utilisation">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">4. Utilisation des données</h2>
        <p className="mb-3">Vos données sont utilisées exclusivement pour :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Fournir, maintenir et améliorer nos services.</li>
          <li>Valider les clics et détecter la fraude (analyse IP, user-agent, patterns).</li>
          <li>Traiter les paiements, rechargements et retraits via nos prestataires.</li>
          <li>Communiquer avec vous concernant votre compte (notifications, alertes).</li>
          <li>Générer des statistiques agrégées et anonymisées pour les Batteurs.</li>
          <li>Assurer la sécurité de la plateforme et prévenir les abus.</li>
        </ul>
      </section>

      <section id="base-legale">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">5. Base légale du traitement</h2>
        <p>
          Conformément à la loi n° 2008-12, le traitement de vos données repose sur :
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li><strong className="text-[#0A0A1A]/70">Consentement :</strong> acceptation des CGU lors de l&apos;inscription.</li>
          <li><strong className="text-[#0A0A1A]/70">Exécution du contrat :</strong> nécessaire pour fournir le service.</li>
          <li><strong className="text-[#0A0A1A]/70">Intérêt légitime :</strong> détection de fraude et sécurité de la plateforme.</li>
        </ul>
      </section>

      <section id="protection">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">6. Protection des données</h2>
        <p>
          Nous mettons en place des mesures techniques et organisationnelles pour protéger vos données :
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>Chiffrement SSL/TLS pour toutes les communications.</li>
          <li>Hachage irréversible des mots de passe (bcrypt).</li>
          <li>Contrôles d&apos;accès stricts à la base de données (Row Level Security).</li>
          <li>Hébergement sécurisé via des prestataires certifiés (Supabase, Vercel).</li>
          <li>Journalisation des accès et audits réguliers.</li>
        </ul>
      </section>

      <section id="partage">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">7. Partage des données</h2>
        <p className="mb-3">
          Nous ne vendons jamais vos données personnelles. Nous pouvons partager des données avec :
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-[#0A0A1A]/70">Prestataires de paiement :</strong> Wave et Orange Money pour traiter les transactions.</li>
          <li><strong className="text-[#0A0A1A]/70">Hébergeurs :</strong> Supabase (base de données) et Vercel (hébergement web).</li>
          <li><strong className="text-[#0A0A1A]/70">Autorités :</strong> si la loi sénégalaise l&apos;exige ou en cas d&apos;ordonnance judiciaire.</li>
        </ul>
        <p className="mt-3">
          Les statistiques partagées avec les Batteurs sont toujours agrégées et anonymisées.
          Aucune donnée personnelle d&apos;un Écho n&apos;est communiquée à un Batteur.
        </p>
      </section>

      <section id="conservation">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">8. Conservation des données</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Les données de compte sont conservées tant que le compte est actif.</li>
          <li>Après suppression du compte, les données sont anonymisées sous 30 jours.</li>
          <li>Les données de transaction sont conservées 5 ans conformément aux obligations comptables sénégalaises.</li>
          <li>Les logs de sécurité et anti-fraude sont conservés 12 mois.</li>
        </ul>
      </section>

      <section id="droits">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">9. Vos droits</h2>
        <p className="mb-3">
          Conformément à la loi n° 2008-12 et aux décisions de la CDP du Sénégal, vous disposez des droits suivants :
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-[#0A0A1A]/70">Droit d&apos;accès :</strong> obtenir une copie de vos données personnelles.</li>
          <li><strong className="text-[#0A0A1A]/70">Droit de rectification :</strong> corriger vos données inexactes ou incomplètes.</li>
          <li><strong className="text-[#0A0A1A]/70">Droit de suppression :</strong> demander la suppression de vos données et de votre compte.</li>
          <li><strong className="text-[#0A0A1A]/70">Droit d&apos;opposition :</strong> vous opposer au traitement de vos données.</li>
          <li><strong className="text-[#0A0A1A]/70">Droit de retrait du consentement :</strong> retirer votre consentement à tout moment.</li>
        </ul>
        <p className="mt-3">
          Pour exercer vos droits, contactez-nous à{" "}
          <a href="mailto:contact@tamma.me" className="text-[#D35400] hover:underline font-semibold">
            contact@tamma.me
          </a>. Nous répondrons sous 30 jours.
        </p>
        <p className="mt-3">
          Vous pouvez également introduire une réclamation auprès de la Commission des Données
          Personnelles (CDP) du Sénégal : <span className="text-[#0A0A1A]/70">cdp.sn</span>
        </p>
      </section>

      <section id="cookies">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">10. Cookies</h2>
        <p className="mb-3">Nous utilisons uniquement des cookies essentiels :</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-[#0A0A1A]/70">Cookies de session :</strong> authentification et maintien de la session utilisateur.</li>
          <li><strong className="text-[#0A0A1A]/70">Préférences :</strong> langue sélectionnée (tamtam-locale).</li>
        </ul>
        <p className="mt-3">
          Aucun cookie publicitaire, de suivi tiers ou analytique n&apos;est utilisé.
          Aucune donnée n&apos;est transmise à des régies publicitaires.
        </p>
      </section>

      <section id="mineurs">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">11. Mineurs</h2>
        <p>
          Tamtam n&apos;est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas
          sciemment de données personnelles de mineurs. Si nous découvrons qu&apos;un mineur s&apos;est
          inscrit, son compte sera supprimé.
        </p>
      </section>

      <section id="modifications">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">12. Modifications de cette politique</h2>
        <p>
          Pandorus se réserve le droit de modifier cette politique à tout moment.
          Les utilisateurs seront informés des changements significatifs par email.
          La date de dernière mise à jour est indiquée en haut de cette page.
        </p>
      </section>

      <section id="contact">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">13. Contact</h2>
        <p>
          Pour toute question relative à la protection de vos données :{" "}
          <a href="mailto:contact@tamma.me" className="text-[#D35400] hover:underline font-semibold">
            contact@tamma.me
          </a>{" "}
          ou{" "}
          <a
            href="https://wa.me/221762799393"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1D9E75] hover:underline font-semibold"
          >
            WhatsApp +221 76 279 93 93
          </a>
        </p>
        <p className="mt-4 text-xs text-black/30">
          Pandorus &middot; Dakar, Sénégal &middot; Loi applicable : loi n° 2008-12 du 25 janvier 2008
        </p>
      </section>
    </LegalLayout>
  );
}
