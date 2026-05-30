"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, RefreshCw } from "lucide-react";

interface TriggerStats {
  sent: number;
  suppressed: number;
  failed: number;
  pending: number;
}

const TRIGGERS = [
  { id: "new_campaign", name: "Nouvelle campagne", desc: "Notification immédiate quand une campagne est approuvée" },
  { id: "share_reminder", name: "Rappel de partage", desc: "Rappel aux Échos ayant rejoint mais pas partagé (3 jours)" },
  { id: "inactivity", name: "Réengagement inactifs", desc: "Relance des Échos inactifs depuis 48h+" },
  { id: "campaign_ending", name: "Fin de campagne (24h)", desc: "Alerte quand une campagne se termine bientôt" },
  { id: "streak_danger", name: "Streak en danger", desc: "Avertissement streak qui va se casser" },
];

const SEQUENCE_STEPS = [
  {
    day: "J+1",
    title: "Premier contact",
    message: "Des Échos à Dakar gagnent jusqu'à 15 000 FCFA/mois — juste en partageant des liens...",
    type: "push",
  },
  {
    day: "J+4",
    title: "Nouvelle campagne",
    message: "Une nouvelle campagne vient de se lancer dans ta ville — participe maintenant...",
    type: "email",
  },
  {
    day: "J+8",
    title: "Dernière chance",
    message: "Dernière chance — campagne active avec 50 FCFA/clic. Rejoins avant qu'il ne soit trop tard.",
    type: "push",
  },
];

export default function SequencesPage() {
  const router = useRouter();
  const [triggerStats, setTriggerStats] = useState<Record<string, TriggerStats>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/notification-stats");
      const data = await res.json();
      setTriggerStats(data.byType || {});
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/superadmin/notifications")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
            <ArrowLeft size={16} className="text-white/40" />
          </button>
          <div>
            <h1 className="text-lg font-syne font-bold text-white">Séquences automatisées</h1>
            <p className="text-[11px] text-white/30">Séquences de réengagement et triggers automatiques</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition text-xs text-white/50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Rafraîchir
        </button>
      </div>

      {/* Re-engagement sequence card */}
      <div className="rounded-2xl bg-[#111128] border border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-white">Réengagement Ghosts</p>
            <p className="text-[11px] text-white/40">Séquence 3 messages pour Échos jamais engagés (14j+)</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 font-medium">Bientôt</span>
        </div>

        {SEQUENCE_STEPS.map((step, i) => (
          <div key={i} className="flex gap-3 mb-3 last:mb-0">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[rgba(211,84,0,0.12)] flex items-center justify-center text-[10px] font-bold text-[#F0997B]">
                {step.day}
              </div>
              {i < SEQUENCE_STEPS.length - 1 && <div className="w-px flex-1 bg-white/[0.06] my-1" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-white">{step.title}</p>
                <span className="text-[10px] text-white/20 px-2 py-0.5 rounded-full bg-white/[0.04]">
                  {step.type === "push" ? "🔔 Push" : "📧 Email"}
                </span>
              </div>
              <p className="text-[11px] text-white/35 leading-relaxed truncate">{step.message}</p>
            </div>
          </div>
        ))}

        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
          <Archive size={14} className="text-white/20" />
          <p className="text-[11px] text-white/30">
            Après J+8 sans réponse — archivage automatique
          </p>
        </div>
      </div>

      {/* Active automated triggers */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <h2 className="text-sm font-bold text-white mb-4">Triggers automatiques actifs</h2>
        <p className="text-[10px] text-white/25 mb-4">Ces triggers s&apos;exécutent toutes les 15 minutes via le cron /api/cron/smart-notifications</p>

        <div className="space-y-3">
          {TRIGGERS.map((trigger) => {
            const stats = triggerStats[trigger.id];
            return (
              <div key={trigger.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{trigger.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{trigger.desc}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
                  {stats ? (
                    <>
                      <span className="text-emerald-400">{stats.sent} env.</span>
                      <span className="text-white/20">{stats.pending} att.</span>
                    </>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
