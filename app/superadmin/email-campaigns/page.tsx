"use client";

import { useEffect, useState, useCallback } from "react";

interface Campaign {
  id: string;
  name: string;
  subject_line: string;
  template_key: string;
  target_segment: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface SegmentPreview {
  total: number;
  segments: { active: number; semi_active: number; dormant: number };
}

interface CampaignMetrics {
  campaign: Campaign;
  totals: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    failed: number;
  };
  completions: {
    fromEmailRecipients: number;
    total: number;
  };
}

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [campaignsRes, previewRes] = await Promise.all([
      fetch("/api/superadmin/email-campaigns"),
      fetch("/api/superadmin/email-campaigns/interests"),
    ]);

    if (campaignsRes.ok) {
      const data = await campaignsRes.json();
      setCampaigns(data.campaigns || []);
    }

    if (previewRes.ok) {
      const data = await previewRes.json();
      setPreview(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMetrics = async (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setLoadingMetrics(true);
    setReminderResult(null);
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaignId}/metrics`);
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch {}
    setLoadingMetrics(false);
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/superadmin/email-campaigns/interests", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setShowConfirm(false);
        // Reload campaigns
        await loadData();
        // Show the new campaign metrics
        if (data.campaign_id) {
          loadMetrics(data.campaign_id);
        }
      }
    } catch {}
    setLaunching(false);
  };

  const handleSendReminder = async () => {
    if (!selectedCampaign) return;
    setSendingReminder(true);
    setReminderResult(null);
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${selectedCampaign}/send-reminder`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setReminderResult(`Reminder sent to ${data.sent} recipients (${data.failed} failed)`);
      } else {
        setReminderResult(data.error || data.message || "Failed");
      }
    } catch {
      setReminderResult("Network error");
    }
    setSendingReminder(false);
  };

  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const hasActiveCampaign = campaigns.some((c) => c.status === "sending");
  const hasAnyCampaign = campaigns.length > 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">&#9993; Email Campaigns</h1>

      {/* Launch card */}
      {!hasActiveCampaign && preview && preview.total > 0 && (
        <div className="bg-card rounded-xl p-6 mb-6 border border-orange-500/20">
          <h2 className="text-white font-bold text-lg mb-3">
            Interests Collection Campaign
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Send personalized emails to {preview.total} &Eacute;chos who haven&apos;t completed
            their interest profile yet. Each segment gets a different template.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <p className="text-green-400 text-xl font-bold">{preview.segments.active}</p>
              <p className="text-gray-500 text-xs">Active (7d)</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
              <p className="text-yellow-400 text-xl font-bold">{preview.segments.semi_active}</p>
              <p className="text-gray-500 text-xs">Semi-active (8-30d)</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center">
              <p className="text-red-400 text-xl font-bold">{preview.segments.dormant}</p>
              <p className="text-gray-500 text-xs">Dormant (30d+)</p>
            </div>
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Launch Campaign
            </button>
          ) : (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-white text-sm mb-3">
                This will send <strong>{preview.total}</strong> emails via Resend.
                Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {launching ? "Launching..." : "Confirm Launch"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="bg-white/5 text-gray-400 py-2 px-4 rounded-lg hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No recipients */}
      {preview && preview.total === 0 && !hasAnyCampaign && (
        <div className="bg-card rounded-xl p-6 mb-6">
          <p className="text-gray-400 text-sm">
            All &Eacute;chos have already completed their interests. No campaign needed.
          </p>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length > 0 && (
        <div className="bg-card rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">Campaigns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left py-2">Name</th>
                  <th className="text-center py-2">Status</th>
                  <th className="text-center py-2">Recipients</th>
                  <th className="text-center py-2">Sent</th>
                  <th className="text-center py-2">Failed</th>
                  <th className="text-center py-2">Date</th>
                  <th className="text-center py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-gray-800">
                    <td className="py-3 text-white">{c.name}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.status === "completed" ? "bg-green-500/15 text-green-400" :
                        c.status === "sending" ? "bg-yellow-500/15 text-yellow-400" :
                        c.status === "cancelled" ? "bg-red-500/15 text-red-400" :
                        "bg-white/10 text-gray-400"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 text-center text-gray-400">{c.total_recipients}</td>
                    <td className="py-3 text-center text-green-400">{c.sent_count}</td>
                    <td className="py-3 text-center text-red-400">{c.failed_count}</td>
                    <td className="py-3 text-center text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("en-US")}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => loadMetrics(c.id)}
                        className="text-xs text-orange-400 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign detail/metrics */}
      {selectedCampaign && (
        <div className="bg-card rounded-xl p-6 mb-6">
          {loadingMetrics ? (
            <div className="space-y-3">
              <div className="skeleton h-6 w-48 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
            </div>
          ) : metrics ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">{metrics.campaign.name}</h2>
                <button
                  onClick={() => loadMetrics(selectedCampaign)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  &#8635; Refresh
                </button>
              </div>

              {/* Progress bar */}
              {metrics.campaign.status === "sending" && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{metrics.totals.sent + metrics.totals.failed} / {metrics.totals.total}</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${pct(metrics.totals.sent + metrics.totals.failed, metrics.totals.total)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Funnel */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
                {[
                  { label: "Total", value: metrics.totals.total, color: "text-white" },
                  { label: "Sent", value: metrics.totals.sent, color: "text-blue-400" },
                  { label: "Delivered", value: metrics.totals.delivered, color: "text-cyan-400" },
                  { label: "Opened", value: metrics.totals.opened, color: "text-green-400" },
                  { label: "Clicked", value: metrics.totals.clicked, color: "text-orange-400" },
                  { label: "Bounced", value: metrics.totals.bounced, color: "text-red-400" },
                  { label: "Failed", value: metrics.totals.failed, color: "text-red-500" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-gray-500 text-xs">{item.label}</p>
                    {item.label !== "Total" && metrics.totals.total > 0 && (
                      <p className="text-gray-600 text-[10px]">{pct(item.value, metrics.totals.total)}%</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Conversion rates */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-green-400 text-lg font-bold">{pct(metrics.totals.opened, metrics.totals.delivered)}%</p>
                  <p className="text-gray-500 text-xs">Open Rate</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-orange-400 text-lg font-bold">{pct(metrics.totals.clicked, metrics.totals.opened)}%</p>
                  <p className="text-gray-500 text-xs">Click Rate</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-teal-400 text-lg font-bold">{metrics.completions.fromEmailRecipients}</p>
                  <p className="text-gray-500 text-xs">Completed Interests</p>
                </div>
              </div>

              {/* Bounce warning */}
              {metrics.totals.bounced > 0 && pct(metrics.totals.bounced, metrics.totals.total) > 5 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-5">
                  <p className="text-red-400 text-sm font-semibold">
                    &#9888; High bounce rate: {pct(metrics.totals.bounced, metrics.totals.total)}%
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Consider cleaning email list. Bounced users are auto-excluded from future sends.
                  </p>
                </div>
              )}

              {/* Reminder button */}
              {metrics.campaign.status === "completed" && (
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSendReminder}
                      disabled={sendingReminder}
                      className="bg-orange-500/10 border border-orange-500/30 text-orange-400 font-semibold py-2 px-4 rounded-lg hover:bg-orange-500/20 transition disabled:opacity-50 text-sm"
                    >
                      {sendingReminder ? "Sending..." : "Send Reminder to Non-Clickers"}
                    </button>
                    <p className="text-gray-600 text-xs">
                      Sends to recipients who were sent/delivered/opened but never clicked, 3+ days ago
                    </p>
                  </div>
                  {reminderResult && (
                    <p className="text-gray-400 text-sm mt-2">{reminderResult}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">Failed to load metrics</p>
          )}
        </div>
      )}
    </div>
  );
}
