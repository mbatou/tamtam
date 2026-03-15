"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import Pagination, { paginate } from "@/components/ui/Pagination";

interface Lead {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string | null;
  message: string | null;
  status: "new" | "contacted" | "converted" | "rejected";
  notes: string | null;
  created_at: string;
}

type Filter = "all" | "new" | "contacted" | "converted" | "rejected";

export default function SuperadminLeadsPage() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [emailConflict, setEmailConflict] = useState(false);
  const [alternativeEmail, setAlternativeEmail] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const [conversionResult, setConversionResult] = useState<{ email: string; success: boolean } | null>(null);

  useEffect(() => { loadLeads(); }, []);

  async function loadLeads() {
    const res = await fetch("/api/superadmin/leads");
    const data = await res.json();
    setLeads(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function updateLead(id: string, updates: { status?: string; notes?: string }) {
    setUpdating(true);
    const res = await fetch("/api/superadmin/leads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setSelectedLead(updated);
    } else {
      const err = await res.json();
      alert(err.error || t("common.error"));
    }
    setUpdating(false);
  }

  const [conflictData, setConflictData] = useState<{ existing_role?: string; can_promote?: boolean } | null>(null);

  async function convertLead(id: string, opts?: { overrideEmail?: string; promoteEcho?: boolean }) {
    if (!opts && !confirm(t("superadmin.leads.createBatteur") + " ?")) return;
    setConverting(true);
    setEmailConflict(false);
    setConflictData(null);
    const payload: { id: string; email?: string; promote_echo?: boolean } = { id };
    if (opts?.overrideEmail) payload.email = opts.overrideEmail;
    if (opts?.promoteEcho) payload.promote_echo = true;

    const res = await fetch("/api/superadmin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      setConversionResult({ email: data.email_used || selectedLead?.email || "", success: true });
      setAlternativeEmail("");
      await loadLeads();
    } else if (res.status === 409 && data.email_conflict) {
      setEmailConflict(true);
      setConflictData({ existing_role: data.existing_role, can_promote: data.can_promote });
    } else {
      alert(data.error || t("common.error"));
    }
    setConverting(false);
  }

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);
  const counts = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  // Calculate urgency for "new" leads based on age
  function getLeadAgeHours(createdAt: string): number {
    return Math.round((Date.now() - new Date(createdAt).getTime()) / 3600000);
  }

  const statusBadge = (status: string, createdAt?: string) => {
    let badgeClass = "";
    if (status === "new" && createdAt) {
      const ageH = getLeadAgeHours(createdAt);
      if (ageH > 24) badgeClass = "bg-red-500/20 text-red-400";
      else if (ageH > 2) badgeClass = "bg-orange-500/20 text-orange-400";
      else badgeClass = "bg-emerald-500/20 text-emerald-400";
    } else {
      const map: Record<string, string> = {
        new: "bg-orange-500/20 text-orange-400",
        contacted: "bg-blue-500/20 text-blue-400",
        converted: "bg-emerald-500/20 text-emerald-400",
        rejected: "bg-white/10 text-white/40",
      };
      badgeClass = map[status] || "";
    }
    const labels: Record<string, string> = {
      new: t("superadmin.leads.newStatus"), contacted: t("superadmin.leads.contactedStatus"), converted: t("superadmin.leads.convertedStatus"), rejected: t("superadmin.leads.rejectedStatus"),
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Oldest new lead age
  const newLeads = leads.filter((l) => l.status === "new");
  const oldestNewLeadAge = newLeads.length > 0
    ? Math.max(...newLeads.map((l) => getLeadAgeHours(l.created_at)))
    : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">{t("superadmin.leads.title")}</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t("superadmin.leads.total"), value: counts.total, color: "text-white" },
          { label: t("superadmin.leads.new"), value: counts.new, color: "text-orange-400" },
          { label: t("superadmin.leads.contacted"), value: counts.contacted, color: "text-blue-400" },
          { label: t("superadmin.leads.converted"), value: counts.converted, color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* New leads banner */}
      {newLeads.length > 0 && (
        <div className={`mb-4 p-4 rounded-xl border ${oldestNewLeadAge > 24 ? "bg-red-500/10 border-red-500/20" : "bg-orange-500/10 border-orange-500/20"}`}>
          <div className="flex items-center gap-3">
            <span className={`font-bold text-sm ${oldestNewLeadAge > 24 ? "text-red-400" : "text-orange-400"}`}>
              {t("superadmin.leads.newLeadsBanner", { count: String(newLeads.length), age: String(oldestNewLeadAge) })}
            </span>
            <button
              onClick={() => { setFilter("new"); setPage(1); }}
              className="text-xs font-bold text-white/50 hover:text-white/80 transition ml-auto"
            >
              {t("superadmin.leads.startContacting")} &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["all", "new", "contacted", "converted", "rejected"] as const).map((f) => {
          const labels: Record<string, string> = { all: t("superadmin.leads.allTab"), new: t("superadmin.leads.new"), contacted: t("superadmin.leads.contacted"), converted: t("superadmin.leads.converted"), rejected: t("superadmin.leads.rejectedTab") };
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                filter === f ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40 hover:text-white/60"
              }`}
            >
              {labels[f]} {f !== "all" && `(${f === "new" ? counts.new : f === "contacted" ? counts.contacted : f === "converted" ? counts.converted : leads.filter((l) => l.status === "rejected").length})`}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-white/30 text-sm">{t("superadmin.leads.noLeads")}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-xs">
                  <th className="text-left p-4 font-semibold">{t("common.date")}</th>
                  <th className="text-left p-4 font-semibold">{t("superadmin.leads.company")}</th>
                  <th className="text-left p-4 font-semibold">{t("superadmin.leads.contact")}</th>
                  <th className="text-left p-4 font-semibold">{t("common.email")}</th>
                  <th className="text-left p-4 font-semibold">{t("superadmin.leads.whatsapp")}</th>
                  <th className="text-left p-4 font-semibold">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filtered, page, PAGE_SIZE).map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => { setSelectedLead(lead); setNotes(lead.notes || ""); setEmailConflict(false); setAlternativeEmail(""); setConversionResult(null); setConflictData(null); }}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition"
                  >
                    <td className="p-4 text-white/30 text-xs whitespace-nowrap">{timeAgo(lead.created_at)}</td>
                    <td className="p-4 font-semibold">{lead.business_name}</td>
                    <td className="p-4 text-white/60">{lead.contact_name}</td>
                    <td className="p-4">
                      <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                        {lead.email}
                      </a>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {lead.whatsapp ? (
                          <a
                            href={`https://wa.me/221${lead.whatsapp.replace(/\s/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-400 hover:underline"
                          >
                            {lead.whatsapp}
                          </a>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                        {/* Quick contact icons */}
                        <div className="flex items-center gap-1 ml-auto">
                          {lead.whatsapp && (
                            <a
                              href={`https://wa.me/221${lead.whatsapp.replace(/\s/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition"
                              title="WhatsApp"
                            >
                              <span className="text-xs">W</span>
                            </a>
                          )}
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition"
                            title="Email"
                          >
                            <span className="text-xs">@</span>
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{statusBadge(lead.status, lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}

      {/* Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <div className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{selectedLead.business_name}</h2>
                <p className="text-sm text-white/40">{selectedLead.contact_name}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-white/30 hover:text-white/60 text-xl">x</button>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">{t("common.email")}</span>
                <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">{t("superadmin.leads.whatsapp")}</span>
                {selectedLead.whatsapp ? (
                  <a href={`https://wa.me/221${selectedLead.whatsapp.replace(/\s/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    {selectedLead.whatsapp}
                  </a>
                ) : (
                  <span className="text-white/20">{t("superadmin.leads.notProvided")}</span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">{t("common.date")}</span>
                <span>{new Date(selectedLead.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {selectedLead.message && (
                <div>
                  <p className="text-xs text-white/40 mb-1">{t("superadmin.support.message")}</p>
                  <p className="text-sm bg-white/5 rounded-xl p-3">{selectedLead.message}</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("common.status")}</label>
              <select
                value={selectedLead.status}
                onChange={(e) => updateLead(selectedLead.id, { status: e.target.value })}
                disabled={updating}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              >
                <option value="new">{t("superadmin.leads.newStatus")}</option>
                <option value="contacted">{t("superadmin.leads.contactedStatus")}</option>
                <option value="converted">{t("superadmin.leads.convertedStatus")}</option>
                <option value="rejected">{t("superadmin.leads.rejectedStatus")}</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-white/40 mb-2">{t("superadmin.leads.internalNotes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("superadmin.leads.addNotes")}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none"
              />
              <button
                onClick={() => updateLead(selectedLead.id, { notes })}
                disabled={updating || notes === (selectedLead.notes || "")}
                className="mt-2 px-4 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 transition disabled:opacity-30"
              >
                {updating ? "..." : t("superadmin.leads.saveNotes")}
              </button>
            </div>

            {/* Conversion Result */}
            {conversionResult && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400 font-semibold">{t("superadmin.leads.batteurCreated")}</p>
                <p className="text-xs text-white/50 mt-1">
                  {t("superadmin.leads.credentialsSent", { email: conversionResult.email })}
                </p>
              </div>
            )}

            {/* Email Conflict */}
            {emailConflict && (
              <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-3">
                <p className="text-sm text-orange-400 font-semibold">
                  {t("superadmin.leads.emailAlreadyUsed", { role: conflictData?.existing_role === "echo" ? "Echo" : conflictData?.existing_role || "" })}
                </p>

                {/* Option 1: Promote Echo to Batteur */}
                {conflictData?.can_promote && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                    <p className="text-xs text-blue-300">
                      {t("superadmin.leads.alreadyEcho")}
                    </p>
                    <button
                      onClick={() => convertLead(selectedLead.id, { promoteEcho: true })}
                      disabled={converting}
                      className="w-full px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition disabled:opacity-40"
                    >
                      {converting ? t("superadmin.leads.promoting") : t("superadmin.leads.promoteEchoBatteur")}
                    </button>
                  </div>
                )}

                {/* Option 2: Use different email */}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-white/40 mb-2">
                    {t("superadmin.leads.altEmailLabel")}
                  </p>
                  <input
                    type="email"
                    value={alternativeEmail}
                    onChange={(e) => setAlternativeEmail(e.target.value)}
                    placeholder={t("superadmin.leads.altEmailPlaceholder")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                  />
                  <button
                    onClick={() => {
                      if (!alternativeEmail || !alternativeEmail.includes("@")) {
                        alert(t("superadmin.leads.invalidEmail"));
                        return;
                      }
                      convertLead(selectedLead.id, { overrideEmail: alternativeEmail });
                    }}
                    disabled={converting || !alternativeEmail}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40"
                  >
                    {converting ? t("superadmin.leads.creating") : t("superadmin.leads.createWithEmail")}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {selectedLead.status !== "converted" && !conversionResult && (
                <button
                  onClick={() => convertLead(selectedLead.id)}
                  disabled={converting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40"
                >
                  {converting ? t("superadmin.leads.creating") : t("superadmin.leads.createBatteur")}
                </button>
              )}
              <a
                href={`mailto:${selectedLead.email}?subject=${encodeURIComponent(t("superadmin.leads.emailSubject"))}`}
                className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition"
              >
                {t("superadmin.leads.sendEmail")}
              </a>
              {selectedLead.whatsapp && (
                <a
                  href={`https://wa.me/221${selectedLead.whatsapp.replace(/\s/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition"
                >
                  {t("superadmin.leads.openWhatsApp")}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
