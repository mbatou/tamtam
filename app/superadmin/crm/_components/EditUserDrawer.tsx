"use client";

import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { BrandUser } from "./types";

export default function EditUserDrawer({
  user,
  onChange,
  onSave,
  onClose,
}: {
  user: BrandUser | null;
  onChange: (user: BrandUser) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <AdminDrawer open={!!user} onClose={onClose} title={user ? `Modifier ${user.company_name || user.name}` : ""}>
      {user && (
        <div className="space-y-4">
          {[
            { label: "Nom", key: "name" as const, type: "text" },
            { label: "Entreprise", key: "company_name" as const, type: "text" },
            { label: "Email", key: "email" as const, type: "email" },
            { label: "Téléphone", key: "phone" as const, type: "text" },
            { label: "Ville", key: "city" as const, type: "text" },
          ].map(field => (
            <div key={field.key}>
              <label className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{field.label}</label>
              <input type={field.type} value={user[field.key] || ""}
                onChange={e => onChange({ ...user, [field.key]: e.target.value })}
                className="w-full rounded-xl px-4 py-2.5 font-dm text-sm focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            </div>
          ))}
          <div>
            <label className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Solde (FCFA)</label>
            <input type="number" value={user.balance || 0}
              onChange={e => onChange({ ...user, balance: Number(e.target.value) })}
              className="w-full rounded-xl px-4 py-2.5 font-dm text-sm focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            <p className="font-dm text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Les ajustements sont loggés automatiquement</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
            <button onClick={onSave} className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
              style={{ background: "#D35400", color: "#fff" }}>Sauvegarder</button>
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}
