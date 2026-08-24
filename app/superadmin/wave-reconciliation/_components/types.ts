export type IssueSeverity = "critical" | "warning" | "info";

/** One live issue as returned by /api/superadmin/reconciliation/live. */
export interface LiveIssue {
  severity: IssueSeverity;
  category: string;
  subjectType: string;
  subjectId: string;
  description: string;
  expectedValue?: number;
  actualValue?: number;
  discrepancy?: number;
  suggestedAction: string;
  autoHealable: boolean;
  metadata?: Record<string, unknown>;
}

export interface LiveResult {
  issues: LiveIssue[];
  checkedAt: string;
}

export type VerdictStatus = "ok" | "warning" | "critical";

/** The single "is the money OK?" answer, shared by the hero and the banner. */
export interface Verdict {
  status: VerdictStatus;
  moneyOwedFcfa: number;
  actionableCount: number;
  checkedAt: string;
}

/** A row of the reconciliation_issues table. */
export interface StoredIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  subject_type: string;
  subject_id: string;
  description: string;
  discrepancy: number | null;
  suggested_action: string;
  resolved: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

/** The latest cached snapshot from the nightly reconciliation cron. */
export interface Snapshot {
  brand_balance_total: number;
  echo_balance_total: number;
  platform_liabilities_total: number;
  wave_checkouts_total: number;
  wave_payouts_total: number;
  wave_fees_total: number;
  wave_wallet_expected: number;
  computed_at: string;
}

export interface SnapshotStatus {
  snapshot: Snapshot | null;
  unresolvedCount: number;
}

/** Fetch JSON from a superadmin endpoint, throwing the API's French error. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data as T;
}
