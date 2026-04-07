import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmailSafe } from "@/lib/email";
import type { Issue, ReconciliationSnapshot } from "./engine";

// ---------------------------------------------------------------------------
// Reconciliation email alerts with deduplication
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || "support@tamma.me";

export async function sendReconciliationAlerts(
  snapshot: ReconciliationSnapshot
): Promise<void> {
  const criticalIssues = snapshot.issues.filter((i) => i.severity === "critical");

  if (criticalIssues.length === 0) return;

  // Build a unique key per critical issue batch to avoid spamming
  const alertKey = `recon_critical_${new Date().toISOString().slice(0, 13)}`; // hourly dedup

  // Check if we already sent this alert
  const { data: existing } = await supabaseAdmin
    .from("reconciliation_alerts_sent")
    .select("id")
    .eq("alert_key", alertKey)
    .single();

  if (existing) return; // Already sent this hour

  // Build email
  const issueRows = criticalIssues
    .map(
      (i) =>
        `<tr>
          <td style="padding: 6px 10px; border: 1px solid #333;">${i.category}</td>
          <td style="padding: 6px 10px; border: 1px solid #333;">${escapeHtml(i.description)}</td>
          <td style="padding: 6px 10px; border: 1px solid #333;">${i.discrepancy ? `${i.discrepancy} F` : "-"}</td>
          <td style="padding: 6px 10px; border: 1px solid #333;">${i.suggestedAction}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">Reconciliation Alert: ${criticalIssues.length} Critical Issue${criticalIssues.length > 1 ? "s" : ""}</h2>
      <p style="color: #666;">Snapshot computed at ${new Date().toLocaleString("fr-SN")} in ${snapshot.computeDurationMs}ms</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #1a1a2e; color: #fff;">
          <th style="padding: 8px 10px; text-align: left;">Category</th>
          <th style="padding: 8px 10px; text-align: left;">Description</th>
          <th style="padding: 8px 10px; text-align: left;">Discrepancy</th>
          <th style="padding: 8px 10px; text-align: left;">Action</th>
        </tr>
        ${issueRows}
      </table>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 10px; font-weight: bold;">Platform Liabilities</td>
          <td style="padding: 6px 10px;">${snapshot.platformLiabilitiesTotal.toLocaleString()} F</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: bold;">Total Discrepancy</td>
          <td style="padding: 6px 10px; color: ${snapshot.totalDiscrepancy > 0 ? "#e74c3c" : "#27ae60"};">${snapshot.totalDiscrepancy.toLocaleString()} F</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: bold;">Wave Checkouts</td>
          <td style="padding: 6px 10px;">${snapshot.waveCheckoutsCount} (${snapshot.waveCheckoutsTotal.toLocaleString()} F)</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: bold;">Wave Payouts</td>
          <td style="padding: 6px 10px;">${snapshot.wavePayoutsCount} (${snapshot.wavePayoutsTotal.toLocaleString()} F)</td>
        </tr>
      </table>

      <p style="color: #999; font-size: 12px;">
        <a href="https://www.tamma.me/superadmin/wave-reconciliation" style="color: #D35400;">View Dashboard</a>
      </p>
    </div>
  `;

  const result = await sendEmailSafe({
    to: ADMIN_EMAIL,
    subject: `[TAMTAM] ${criticalIssues.length} Critical Reconciliation Issue${criticalIssues.length > 1 ? "s" : ""}`,
    html,
    tags: [{ name: "category", value: "reconciliation-alert" }],
  });

  // Record that we sent this alert
  await supabaseAdmin.from("reconciliation_alerts_sent").insert({
    alert_key: alertKey,
    severity: "critical",
    subject: `${criticalIssues.length} critical issues`,
  });

  if (!result.success) {
    console.error("Failed to send reconciliation alert:", result.error);
  }
}

/** Send a specific issue alert (for manual trigger) */
export async function sendIssueAlert(issue: Issue): Promise<void> {
  const alertKey = `issue_${issue.category}_${issue.subjectId}_${new Date().toISOString().slice(0, 13)}`;

  const { data: existing } = await supabaseAdmin
    .from("reconciliation_alerts_sent")
    .select("id")
    .eq("alert_key", alertKey)
    .single();

  if (existing) return;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: ${issue.severity === "critical" ? "#e74c3c" : "#f39c12"};">
        Reconciliation ${issue.severity.toUpperCase()}: ${issue.category}
      </h2>
      <p>${escapeHtml(issue.description)}</p>
      ${issue.discrepancy ? `<p><strong>Discrepancy:</strong> ${issue.discrepancy} F</p>` : ""}
      ${issue.suggestedAction ? `<p><strong>Suggested action:</strong> ${issue.suggestedAction}</p>` : ""}
      <p style="color: #999; font-size: 12px;">
        <a href="https://www.tamma.me/superadmin/wave-reconciliation" style="color: #D35400;">View Dashboard</a>
      </p>
    </div>
  `;

  await sendEmailSafe({
    to: ADMIN_EMAIL,
    subject: `[TAMTAM] ${issue.severity.toUpperCase()}: ${issue.category} — ${issue.subjectType}/${issue.subjectId.slice(0, 8)}`,
    html,
    tags: [{ name: "category", value: "reconciliation-alert" }],
  });

  await supabaseAdmin.from("reconciliation_alerts_sent").insert({
    alert_key: alertKey,
    severity: issue.severity,
    subject: issue.description.slice(0, 200),
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
