"use client";

import { useCallback, useEffect, useState } from "react";
import AdminBadge, { type AdminBadgeProps } from "@/components/superadmin/AdminBadge";
import { formatFCFA } from "@/lib/utils";
import { fetchJson, type IssueSeverity, type StoredIssue } from "./types";

const SEVERITY_BADGE: Record<IssueSeverity, AdminBadgeProps["status"]> = {
  critical: "error",
  warning: "pending",
  info: "draft",
};

/**
 * The reconciliation_issues table: what the nightly cron recorded, and what a
 * human did about it. Resolving asks for a note, because "resolved" with no
 * explanation is how an anomaly comes back six months later.
 */
export default function IssueHistory() {
  const [opened, setOpened] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [issues, setIssues] = useState<StoredIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!opened) return;
    setLoading(true);
    setError(null);
    fetchJson<{ issues: StoredIssue[] }>(
      `/api/superadmin/reconciliation/issues?resolved=${showResolved}&limit=50`
    )
      .then((d) => setIssues(d.issues))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur réseau"))
      .finally(() => setLoading(false));
  }, [opened, showResolved]);

  useEffect(() => load(), [load]);

  const resolve = async (issueId: string) => {
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/superadmin/reconciliation/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          issueId,
          note: note.trim() || "Résolu manuellement",
        }),
      });
      setNoteFor(null);
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details
      onToggle={(e) => setOpened(e.currentTarget.open)}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02]"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-white/70 hover:text-white">
        Historique
      </summary>

      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          {([false, true] as const).map((resolved) => (
            <button
              key={String(resolved)}
              onClick={() => setShowResolved(resolved)}
              className={`text-xs px-3 py-1.5 rounded-lg ${
                showResolved === resolved
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-400 hover:text-white bg-white/5"
              }`}
            >
              {resolved ? "Résolues" : "Non résolues"}
            </button>
          ))}
        </div>

        {loading && <p className="text-xs text-gray-500">Chargement...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}

        {!loading && issues.length === 0 && (
          <p className="text-xs text-gray-500">
            {showResolved ? "Aucune anomalie résolue." : "Aucune anomalie en attente."} Les anomalies
            sont enregistrées chaque nuit par le cron de réconciliation (02:00 UTC).
          </p>
        )}

        {issues.map((issue) => (
          <div key={issue.id} className="py-2 border-b border-white/[0.04] last:border-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <AdminBadge status={SEVERITY_BADGE[issue.severity]} label={issue.severity} />
                <div className="min-w-0">
                  <p className="text-xs text-white/80">{issue.description}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {issue.category} · {issue.subject_type}/{issue.subject_id?.slice(0, 8)}
                    {issue.discrepancy ? ` · ${formatFCFA(issue.discrepancy)}` : ""}
                    {issue.resolution_note ? ` · « ${issue.resolution_note} »` : ""}
                  </p>
                </div>
              </div>
              {!issue.resolved && noteFor !== issue.id && (
                <button
                  onClick={() => {
                    setNoteFor(issue.id);
                    setNote("");
                  }}
                  className="text-xs text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg"
                >
                  Résoudre
                </button>
              )}
            </div>

            {noteFor === issue.id && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Qu'avez-vous fait ? (note de résolution)"
                  className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder:text-white/25"
                />
                <button
                  onClick={() => resolve(issue.id)}
                  disabled={saving}
                  className="text-xs font-bold text-white bg-[#D35400] hover:bg-[#B34700] disabled:opacity-50 px-3 py-1.5 rounded-lg"
                >
                  {saving ? "..." : "Valider"}
                </button>
                <button
                  onClick={() => setNoteFor(null)}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
