"use client";

import { useState } from "react";
import { formatFCFA } from "@/lib/utils";

interface FixButtonProps {
  /** Verb shown on the button, e.g. "Rembourser". */
  label: string;
  /** Amount at stake. Shown on the button and named in the confirmation. */
  amountFcfa?: number;
  /** Who receives the money. Named in the confirmation. */
  beneficiary?: string;
  /** One extra sentence explaining what the click does. */
  detail: string;
  /** Runs the fix and resolves with the French line to show afterwards. */
  onConfirm: () => Promise<string>;
  /** Called after a successful fix, to refresh the card. */
  onDone?: () => void;
  disabled?: boolean;
}

/**
 * The only way this page moves money: a button that always states the amount
 * and the beneficiary before doing anything, then reports what happened.
 */
export default function FixButton({
  label,
  amountFcfa,
  beneficiary,
  detail,
  onConfirm,
  onDone,
  disabled,
}: FixButtonProps) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountLabel = amountFcfa !== undefined ? formatFCFA(amountFcfa) : null;

  const run = async () => {
    const lines = [
      amountLabel && beneficiary
        ? `${label} ${amountLabel} au profit de ${beneficiary} ?`
        : amountLabel
          ? `${label} ${amountLabel} ?`
          : `${label} ?`,
      "",
      detail,
    ];
    if (!confirm(lines.join("\n"))) return;

    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await onConfirm());
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={disabled || pending}
        className="text-xs font-bold text-white bg-[#D35400] hover:bg-[#B34700] disabled:opacity-50 px-4 py-1.5 rounded-lg whitespace-nowrap"
      >
        {pending ? "En cours..." : amountLabel ? `${label} ${amountLabel}` : label}
      </button>
      {result && <p className="text-[11px] text-green-400">{result}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
