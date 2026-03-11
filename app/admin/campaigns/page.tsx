"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import type { Campaign } from "@/lib/types";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/campaigns?batteur_id=${session.user.id}`);
    const data = await res.json();
    setCampaigns(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function createCampaign() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          destination_url: form.destination_url,
          cpc: form.cpc,
          budget: form.budget,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        setSubmitting(false);
        return;
      }

      setForm({ title: "", description: "", destination_url: "", cpc: "", budget: "", starts_at: "", ends_at: "" });
      setShowForm(false);
      setSubmitting(false);
      loadCampaigns();
    } catch (err) {
      console.error("Campaign creation error:", err);
      setError("Erreur réseau. Veuillez réessayer.");
      setSubmitting(false);
    }
  }

  async function toggleStatus(campaign: Campaign) {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await supabase.from("campaigns").update({ status: newStatus }).eq("id", campaign.id);
    loadCampaigns();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Rythmes</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? "Annuler" : "Nouveau Rythme"}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Lancer un Rythme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">Titre *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promo Ramadan 2024" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description de la campagne..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white/40 mb-2">URL de destination *</label>
              <input type="url" value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} placeholder="https://marque.sn/promo" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">CPC (FCFA) *</label>
              <input type="number" value={form.cpc} onChange={(e) => setForm({ ...form, cpc: e.target.value })} placeholder="25" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Budget total (FCFA) *</label>
              <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="100000" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Date de début</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Date de fin</label>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition" />
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <button onClick={createCampaign} disabled={submitting || !form.title || !form.destination_url || !form.cpc || !form.budget} className="btn-primary mt-4 disabled:opacity-40">
            {submitting ? "Création..." : "Lancer le Rythme"}
          </button>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Titre</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Statut</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Budget</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">CPC</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Progression</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const progress = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
                return (
                  <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-semibold">{campaign.title}</td>
                    <td className="px-5 py-4">
                      <span className={`badge-${campaign.status}`}>
                        {campaign.status === "active" ? "Actif" : campaign.status === "paused" ? "Pausé" : campaign.status === "completed" ? "Terminé" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/60">{formatFCFA(campaign.spent)} / {formatFCFA(campaign.budget)}</td>
                    <td className="px-5 py-4">{campaign.cpc} FCFA</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <span className="text-xs text-white/40">{Math.round(progress)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {(campaign.status === "active" || campaign.status === "paused") && (
                        <button onClick={() => toggleStatus(campaign)} className="text-xs font-semibold text-primary hover:underline">
                          {campaign.status === "active" ? "Pauser" : "Activer"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {campaigns.length === 0 && (
          <div className="p-8 text-center"><p className="text-white/30 text-sm">Aucun rythme créé.</p></div>
        )}
      </div>
    </div>
  );
}
