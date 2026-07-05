"use client";

import CitySelect from "@/components/ui/CitySelect";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import FormField from "./FormField";
import type { NewBrandForm } from "./types";

export default function CreateBrandDrawer({
  open,
  onClose,
  value,
  onChange,
  creating,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  value: NewBrandForm;
  onChange: (value: NewBrandForm) => void;
  creating: boolean;
  onSubmit: () => void;
}) {
  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title="Créer une marque"
      subtitle="Remplissez les informations"
    >
      <div className="space-y-4">
        <FormField label="Nom de la marque">
          <input type="text" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Ex : SenegalShop" className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </FormField>
        <FormField label="Email">
          <input type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="contact@marque.com" className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </FormField>
        <FormField label="Mot de passe">
          <input type="password" value={value.password} onChange={(e) => onChange({ ...value, password: e.target.value })}
            placeholder="Min. 6 caractères" className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Téléphone">
            <input type="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="+221..." className="w-full rounded-xl px-4 py-3 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </FormField>
          <FormField label="Ville">
            <CitySelect value={value.city} onChange={(city) => onChange({ ...value, city })} />
          </FormField>
        </div>
        <button onClick={onSubmit} disabled={creating}
          className="w-full py-3 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
          style={{ background: "#D35400", color: "#fff" }}>
          {creating ? "Création..." : "Créer la marque"}
        </button>
      </div>
    </AdminDrawer>
  );
}
