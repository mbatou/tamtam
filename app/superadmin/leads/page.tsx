"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);

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
      alert(err.error || "Erreur");
    }
    setUpdating(false);
  }

  async function convertLead(id: string) {
    if (!confirm("Créer un compte Batteur pour ce lead ? Un email avec les identifiants sera envoyé.")) return;
    setConverting(true);
    const res = await fetch("/api/superadmin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Compte Batteur créé avec succès !");
      await loadLeads();
      setSelectedLead(null);
    } else {
      alert(data.error || "Erreur");
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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: "bg-orange-500/20 text-orange-400",
      contacted: "bg-blue-500/20 text-blue-400",
      converted: "bg-emerald-500/20 text-emerald-400",
      rejected: "bg-white/10 text-white/40",
    };
    const labels: Record<string, string> = {
      new: "Nouveau", contacted: "Contacté", converted: "Converti", rejected: "Rejeté",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || ""}`}>
        {labels[status] || status}
      </span>
    );
  };

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
      <h1 className="text-2xl font-bold mb-6">Leads Batteur</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: counts.total, color: "text-white" },
          { label: "Nouveaux", value: counts.new, color: "text-orange-400" },
          { label: "Contactés", value: counts.contacted, color: "text-blue-400" },
          { label: "Convertis", value: counts.converted, color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="glass-card p-4">
            <p className="text-xs text-white/40 font-semibold mb-1">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["all", "new", "contacted", "converted", "rejected"] as const).map((f) => {
          const labels: Record<string, string> = { all: "Tous", new: "Nouveaux", contacted: "Contactés", converted: "Convertis", rejected: "Rejetés" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
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
        <div className="glass-card p-12 text-center text-white/30 text-sm">Aucun lead</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-xs">
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Entreprise</th>
                  <th className="text-left p-4 font-semibold">Contact</th>
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-left p-4 font-semibold">WhatsApp</th>
                  <th className="text-left p-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => { setSelectedLead(lead); setNotes(lead.notes || ""); }}
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
                    </td>
                    <td className="p-4">{statusBadge(lead.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                <span className="text-white/40">Email</span>
                <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">WhatsApp</span>
                {selectedLead.whatsapp ? (
                  <a href={`https://wa.me/221${selectedLead.whatsapp.replace(/\s/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    {selectedLead.whatsapp}
                  </a>
                ) : (
                  <span className="text-white/20">Non fourni</span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Date</span>
                <span>{new Date(selectedLead.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {selectedLead.message && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Message</p>
                  <p className="text-sm bg-white/5 rounded-xl p-3">{selectedLead.message}</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-white/40 mb-2">Statut</label>
              <select
                value={selectedLead.status}
                onChange={(e) => updateLead(selectedLead.id, { status: e.target.value })}
                disabled={updating}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              >
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="converted">Converti</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-white/40 mb-2">Notes internes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez vos notes..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none"
              />
              <button
                onClick={() => updateLead(selectedLead.id, { notes })}
                disabled={updating || notes === (selectedLead.notes || "")}
                className="mt-2 px-4 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 transition disabled:opacity-30"
              >
                {updating ? "..." : "Sauvegarder les notes"}
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {selectedLead.status !== "converted" && (
                <button
                  onClick={() => convertLead(selectedLead.id)}
                  disabled={converting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40"
                >
                  {converting ? "Création..." : "Créer un compte Batteur"}
                </button>
              )}
              <a
                href={`mailto:${selectedLead.email}?subject=${encodeURIComponent("Tamtam — Votre demande de compte Batteur")}`}
                className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition"
              >
                Envoyer un email
              </a>
              {selectedLead.whatsapp && (
                <a
                  href={`https://wa.me/221${selectedLead.whatsapp.replace(/\s/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition"
                >
                  Ouvrir WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
