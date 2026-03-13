"use client";

import { useEffect, useState } from "react";

interface Profile {
  name: string;
  email: string;
  phone: string;
  city: string;
  mobile_money_provider: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", city: "", mobile_money_provider: "" });

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const res = await fetch("/api/admin/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        city: data.city || "",
        mobile_money_provider: data.mobile_money_provider || "",
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
      } else {
        setProfile(data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);

    if (passwords.new_password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: passwords.new_password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
      } else {
        setSuccess(true);
        setPasswords({ new_password: "", confirm: "" });
        setShowPassword(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    }
    setPwSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">Paramètres</h1>

      {/* Profile section */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-6">Informations du compte</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Email</label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed"
            />
            <p className="text-xs text-white/20 mt-1">L&apos;email ne peut pas être modifié</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Nom de la marque *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Wave Sénégal"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Dakar"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 mb-2">Moyen de paiement préféré</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "wave", label: "Wave" },
                { id: "orange_money", label: "Orange Money" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setForm({ ...form, mobile_money_provider: option.id })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    form.mobile_money_provider === option.id
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-sm">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            Modifications enregistrées avec succès.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="btn-primary mt-6 disabled:opacity-40"
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>

      {/* Password section */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Mot de passe</h2>
          {!showPassword && (
            <button
              onClick={() => { setShowPassword(true); setError(null); setSuccess(false); }}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Changer le mot de passe
            </button>
          )}
        </div>
        {showPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Nouveau mot de passe</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder="Min. 6 caractères"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Confirmer le mot de passe</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Répétez le mot de passe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                onKeyDown={(e) => e.key === "Enter" && !pwSaving && passwords.new_password && passwords.confirm && handleChangePassword()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !passwords.new_password || !passwords.confirm}
                className="btn-primary disabled:opacity-40"
              >
                {pwSaving ? "Mise à jour..." : "Mettre à jour le mot de passe"}
              </button>
              <button
                onClick={() => { setShowPassword(false); setPasswords({ new_password: "", confirm: "" }); }}
                className="px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/30">Utilisez un mot de passe fort d&apos;au moins 6 caractères.</p>
        )}
      </div>

      {/* Account info */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Informations</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">Membre depuis</span>
            <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Type de compte</span>
            <span className="badge-active">Batteur</span>
          </div>
        </div>
      </div>
    </div>
  );
}
