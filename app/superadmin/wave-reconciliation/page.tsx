"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import HealthVerdict from "./_components/HealthVerdict";
import StuckPendingCard from "./_components/StuckPendingCard";
import FailedPayoutsCard from "./_components/FailedPayoutsCard";
import WaveSyncCard from "./_components/WaveSyncCard";
import OrphanCreditsCard from "./_components/OrphanCreditsCard";
import TechnicalDetails from "./_components/TechnicalDetails";
import IssueHistory from "./_components/IssueHistory";

/**
 * Réconciliation — one question, one answer, and the buttons that fix it.
 *
 * The hero states whether the money is OK. Under it, one card per anomaly a
 * superadmin can actually act on; each collapses to a green line when clean and
 * carries its own guarded fix. Everything that is diagnosis rather than a
 * verdict lives behind the two closed disclosures at the bottom.
 */
export default function WaveReconciliationPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Réconciliation</h1>
        <Link
          href="/superadmin/finance"
          className="text-xs text-white/40 hover:text-white/70 transition flex items-center gap-1"
        >
          Revenus et marges <ExternalLink size={12} />
        </Link>
      </div>

      <HealthVerdict />

      <div className="space-y-3">
        <FailedPayoutsCard />
        <OrphanCreditsCard />
        <StuckPendingCard />
        <WaveSyncCard />
      </div>

      <TechnicalDetails />
      <IssueHistory />
    </div>
  );
}
