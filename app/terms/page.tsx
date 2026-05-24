"use client";

import LegalLayout from "@/components/legal/LegalLayout";

const toc = [
  { id: "acceptation", label: "1. Acceptation" },
  { id: "description", label: "2. Description du service" },
  { id: "inscription", label: "3. Inscription" },
  { id: "echos", label: "4. Règles Échos" },
  { id: "batteurs", label: "5. Règles Batteurs" },
  { id: "paiements", label: "6. Paiements" },
  { id: "soldes", label: "7. Soldes et retraits" },
  { id: "antifraud", label: "8. Anti-fraude" },
  { id: "propriete", label: "9. Propriété intellectuelle" },
  { id: "responsabilite", label: "10. Responsabilité" },
  { id: "modification", label: "11. Modifications" },
  { id: "droit", label: "12. Droit applicable" },
  { id: "contact", label: "13. Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" lastUpdated="mai 2026" toc={toc}>
      <section id="acceptation">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">1. Acceptation des conditions</h2>
        <p>
          En utilisant Tamtam (accessible via tamma.me), vous acceptez les présentes conditions générales
          d&apos;utilisation (CGU). Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser la plateforme.
          L&apos;utilisation continue de Tamtam après toute modification des CGU vaut acceptation des nouvelles conditions.
        </p>
      </section>

      <section id="description">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">2. Description du service</h2>
        <p>
          Tamtam est une plateforme de micro-influence qui met en relation des annonceurs
          (&laquo; Batteurs &raquo;) et des partageurs (&laquo; Échos &raquo;). Les Batteurs créent des campagnes
          publicitaires et les Échos partagent les liens sur WhatsApp et autres canaux pour générer
          du trafic qualifié. La rémunération est basée sur les clics validés (CPC — coût par clic).
        </p>
      </section>

      <section id="inscription">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">3. Inscription et compte</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Vous devez avoir au moins 18 ans pour utiliser Tamtam.</li>
          <li>Les informations fournies lors de l&apos;inscription doivent être exactes et à jour.</li>
          <li>Vous êtes responsable de la sécurité de votre mot de passe et de votre compte.</li>
          <li>Un même numéro de téléphone peut être associé à un compte Écho et un compte Batteur.</li>
          <li>Tamtam se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.</li>
        </ul>
      </section>

      <section id="echos">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">4. Règles pour les Échos</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Les clics doivent provenir de personnes réelles et uniques.</li>
          <li>Toute forme de fraude (clics artificiels, bots, auto-clics, fermes à clics) est strictement interdite.</li>
          <li>Les liens doivent être partagés sur WhatsApp ou d&apos;autres canaux de communication légitimes.</li>
          <li>Le spam, l&apos;envoi en masse non sollicité et le partage dans des groupes non pertinents sont interdits.</li>
          <li>En cas de fraude avérée, le compte sera suspendu et les gains confisqués.</li>
        </ul>
      </section>

      <section id="batteurs">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">5. Règles pour les Batteurs</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Les campagnes doivent respecter la législation sénégalaise en vigueur.</li>
          <li>Le contenu publicitaire ne doit pas être trompeur, offensant, discriminatoire ou illégal.</li>
          <li>Le budget de campagne est débité lors de la création. En cas d&apos;annulation, le solde non consommé est restitué.</li>
          <li>Tamtam se réserve le droit de rejeter, suspendre ou supprimer toute campagne sans préavis.</li>
          <li>Les Batteurs sont responsables du contenu de leurs campagnes et des pages de destination associées.</li>
        </ul>
      </section>

      <section id="paiements">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">6. Paiements et commissions</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-[#0A0A1A]/70">Répartition CPC :</strong> Tamtam prélève une commission de 25% sur chaque clic validé.
            Les Échos reçoivent 75% du coût par clic (CPC) défini par le Batteur.
            Cette répartition 75/25 est fixe et non négociable.
          </li>
          <li>Les rechargements Batteur se font via Wave ou Orange Money.</li>
          <li>Tous les montants sont exprimés en FCFA (Franc CFA — XOF).</li>
          <li>Les frais de transaction mobile money sont à la charge de l&apos;utilisateur.</li>
        </ul>
      </section>

      <section id="soldes">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">7. Soldes et retraits</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-[#0A0A1A]/70">Double solde :</strong> Les Échos disposent de deux soldes :
            un solde disponible (retirable) et un solde en attente (en cours de validation).
          </li>
          <li>Le montant minimum de retrait est de 500 FCFA.</li>
          <li>Les retraits sont traités via Wave ou Orange Money selon le moyen de paiement enregistré.</li>
          <li>Les délais de traitement sont généralement instantanés via Wave, sous réserve de disponibilité du service.</li>
          <li>Tamtam se réserve le droit de bloquer un retrait en cas de suspicion de fraude.</li>
        </ul>
      </section>

      <section id="antifraud">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">8. Anti-fraude</h2>
        <p className="mb-3">
          Tamtam utilise un système de détection de fraude avancé incluant l&apos;analyse des adresses IP,
          des user-agents, des patterns de clics et du comportement utilisateur.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>En cas de comportement suspect, le compte peut être signalé, suspendu ou définitivement banni.</li>
          <li>Les gains issus de clics frauduleux ne seront pas versés et pourront être récupérés.</li>
          <li>Les décisions de l&apos;équipe anti-fraude sont souveraines et non contestables.</li>
        </ul>
      </section>

      <section id="propriete">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">9. Propriété intellectuelle</h2>
        <p>
          Tout le contenu de la plateforme Tamtam (logo, design, code, textes) est la propriété
          de Lupandu SARL. Les créatifs et contenus des campagnes restent la propriété de leurs
          Batteurs respectifs. Toute reproduction non autorisée est interdite.
        </p>
      </section>

      <section id="responsabilite">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">10. Limitation de responsabilité</h2>
        <p>
          Tamtam (Lupandu SARL) ne peut être tenu responsable des pertes ou dommages résultant de
          l&apos;utilisation de la plateforme, y compris les interruptions de service,
          les erreurs techniques, les retards de paiement liés aux prestataires tiers (Wave, Orange Money),
          ou les actes de fraude commis par des tiers.
        </p>
      </section>

      <section id="modification">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">11. Modification des conditions</h2>
        <p>
          Lupandu SARL se réserve le droit de modifier ces conditions à tout moment.
          Les utilisateurs seront informés des changements significatifs par email ou notification
          dans l&apos;application. L&apos;utilisation continue de la plateforme après notification
          vaut acceptation des nouvelles conditions.
        </p>
      </section>

      <section id="droit">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">12. Droit applicable</h2>
        <p>
          Les présentes conditions sont régies par le droit sénégalais. Tout litige relatif à
          l&apos;interprétation ou à l&apos;exécution des présentes sera soumis aux tribunaux compétents
          de Dakar, Sénégal. Les parties s&apos;engagent à tenter un règlement amiable avant toute
          action judiciaire.
        </p>
      </section>

      <section id="contact">
        <h2 className="text-lg font-bold text-[#0A0A1A] mb-3 font-syne">13. Contact</h2>
        <p>
          Pour toute question relative aux présentes CGU :{" "}
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
          Lupandu SARL &middot; NINEA: [en cours] &middot; RC: [en cours] &middot; Siège: Dakar, Sénégal
        </p>
      </section>
    </LegalLayout>
  );
}
