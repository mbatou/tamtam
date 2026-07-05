"use client";

import { formatFCFA } from "@/lib/utils";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { Batteur, NewCampaignForm } from "./types";
import { FormField } from "./fields";

export default function CreateCampaignDrawer({
  open,
  batteurs,
  form,
  creating,
  onChange,
  onClose,
  onCreate,
}: {
  open: boolean;
  batteurs: Batteur[];
  form: NewCampaignForm;
  creating: boolean;
  onChange: (form: NewCampaignForm) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const selectedBatteur = batteurs.find((b) => b.id === form.batteur_id);

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Créer une campagne"
      subtitle="Remplissez les détails ci-dessous"
    >
      <div className="space-y-4">
        <FormField label="Marque">
          <select
            value={form.batteur_id}
            onChange={(e) => onChange({ ...form, batteur_id: e.target.value })}
            className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <option value="">Sélectionner une marque...</option>
            {batteurs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — Solde : {formatFCFA(b.balance)}
              </option>
            ))}
          </select>
        </FormField>

        {selectedBatteur && (
          <div className="px-4 py-3 rounded-xl font-dm text-xs"
            style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Solde disponible : </span>
            <span className="font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA(selectedBatteur.balance)}</span>
          </div>
        )}

        <FormField label="Objectif">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "traffic", label: "Traffic", desc: "Clics vers un lien" },
              { id: "awareness", label: "Awareness", desc: "Visuel + lien requis" },
            ].map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => onChange({ ...form, objective: obj.id })}
                className="text-left p-3 rounded-xl transition"
                style={{
                  border: `1.5px solid ${form.objective === obj.id ? "#D35400" : "rgba(255,255,255,0.1)"}`,
                  background: form.objective === obj.id ? "rgba(211,84,0,0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="font-dm text-sm font-bold text-white/80">{obj.label}</div>
                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{obj.desc}</div>
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Titre">
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            placeholder="Nom de la campagne..."
            className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            placeholder="Description optionnelle..."
            className="w-full rounded-xl px-4 py-3 font-dm text-sm resize-none h-16 focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </FormField>

        <FormField label="URL de destination">
          <input
            type="url"
            value={form.destination_url}
            onChange={(e) => onChange({ ...form, destination_url: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="CPC (FCFA)">
            <input
              type="number"
              value={form.cpc}
              onChange={(e) => onChange({ ...form, cpc: e.target.value })}
              min="5"
              className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </FormField>
          <FormField label="Budget (FCFA)">
            <input
              type="number"
              value={form.budget}
              onChange={(e) => onChange({ ...form, budget: e.target.value })}
              min="500"
              className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </FormField>
        </div>

        {selectedBatteur && parseInt(form.budget) > selectedBatteur.balance && (
          <div className="px-4 py-3 rounded-xl font-dm text-xs"
            style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.2)", color: "#F09595" }}>
            Le budget dépasse le solde disponible ({formatFCFA(selectedBatteur.balance)})
          </div>
        )}

        <button
          onClick={onCreate}
          disabled={creating}
          className="w-full py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
          style={{ background: "#D35400", color: "#fff" }}
        >
          {creating ? "Création..." : "Créer la campagne"}
        </button>
      </div>
    </AdminDrawer>
  );
}
