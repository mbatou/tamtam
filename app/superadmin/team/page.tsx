"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  team_position: string;
  team_permissions: string[];
  created_at: string;
}

const POSITION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  coo: { label: "COO", emoji: "👔", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  customer_success: { label: "Customer Success", emoji: "🤝", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  campaign_manager: { label: "Campaign Manager", emoji: "📢", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  finance_manager: { label: "Finance Manager", emoji: "💰", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  community_manager: { label: "Community Manager", emoji: "💬", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  custom: { label: "Custom", emoji: "⚙️", color: "bg-white/5 text-white/60 border-white/10" },
};

const ALL_PAGES = [
  { key: "briefing", label: "Briefing", emoji: "☀️" },
  { key: "overview", label: "Vue d'ensemble", emoji: "🏠" },
  { key: "roadmap", label: "Roadmap", emoji: "🎯" },
  { key: "fraud", label: "Anti-Fraude", emoji: "🛡️" },
  { key: "campaigns", label: "Modération", emoji: "🥁" },
  { key: "leads", label: "Leads", emoji: "📩" },
  { key: "finance", label: "Finances", emoji: "💰" },
  { key: "users", label: "Utilisateurs", emoji: "👥" },
  { key: "gamification", label: "Gamification", emoji: "🎮" },
  { key: "health", label: "Santé", emoji: "🩺" },
  { key: "support", label: "Support", emoji: "💬" },
];

const POSITION_DEFAULTS: Record<string, string[]> = {
  coo: ["briefing", "overview", "roadmap", "fraud", "campaigns", "leads", "finance", "users", "gamification", "health", "support"],
  customer_success: ["briefing", "overview", "users", "support", "leads"],
  campaign_manager: ["briefing", "overview", "campaigns", "leads", "users"],
  finance_manager: ["briefing", "overview", "finance", "users"],
  community_manager: ["briefing", "overview", "users", "support", "gamification"],
  custom: [],
};

export default function TeamPage() {
  const { t } = useTranslation();
  const { showToast, ToastComponent } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    team_position: "customer_success",
    team_permissions: POSITION_DEFAULTS["customer_success"],
  });

  useEffect(() => { loadTeam(); }, []);

  async function loadTeam() {
    try {
      const res = await fetch("/api/superadmin/team");
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setLoading(false);
  }

  async function createMember() {
    if (!form.name || !form.email || !form.password) {
      showToast("Nom, email et mot de passe requis", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Membre ajouté avec succès", "success");
        setShowCreate(false);
        setForm({ name: "", email: "", password: "", phone: "", team_position: "customer_success", team_permissions: POSITION_DEFAULTS["customer_success"] });
        loadTeam();
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setSaving(false);
  }

  async function updateMember(userId: string, position: string, permissions: string[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", user_id: userId, team_position: position, team_permissions: permissions }),
      });
      if (res.ok) {
        showToast("Permissions mises à jour", "success");
        setEditing(null);
        loadTeam();
      } else {
        const data = await res.json();
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setSaving(false);
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(`Retirer ${name} de l'équipe ? Son accès au dashboard admin sera révoqué.`)) return;
    try {
      const res = await fetch("/api/superadmin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", user_id: userId }),
      });
      if (res.ok) {
        showToast(`${name} retiré de l'équipe`, "success");
        loadTeam();
      } else {
        const data = await res.json();
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {ToastComponent}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Équipe</h1>
          <p className="text-sm text-white/40 mt-1">
            {members.length} membre{members.length !== 1 ? "s" : ""} · Gérez les accès de votre équipe
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-sm px-4 py-2.5"
        >
          + Ajouter un membre
        </button>
      </div>

      {/* Team members list */}
      <div className="space-y-3">
        {members.map((member) => {
          const pos = POSITION_LABELS[member.team_position] || POSITION_LABELS.custom;
          const isEditing = editing?.id === member.id;

          return (
            <div key={member.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{member.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pos.color}`}>
                        {pos.emoji} {pos.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">
                      Ajouté {timeAgo(member.created_at)} · {(member.team_permissions || []).length} page{(member.team_permissions || []).length !== 1 ? "s" : ""} autorisée{(member.team_permissions || []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(isEditing ? null : member)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/50 hover:text-white/80 font-semibold"
                  >
                    {isEditing ? "Fermer" : "Modifier"}
                  </button>
                  <button
                    onClick={() => removeMember(member.id, member.name)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition text-red-400 font-semibold"
                  >
                    Retirer
                  </button>
                </div>
              </div>

              {/* Permissions tags (collapsed view) */}
              {!isEditing && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(member.team_permissions || []).map((perm) => {
                    const page = ALL_PAGES.find((p) => p.key === perm);
                    return page ? (
                      <span key={perm} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium">
                        {page.emoji} {page.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Edit panel */}
              {isEditing && (
                <EditPermissions
                  member={member}
                  onSave={(pos, perms) => updateMember(member.id, pos, perms)}
                  saving={saving}
                />
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="glass-card p-10 text-center">
            <span className="text-3xl block mb-3">👥</span>
            <p className="text-sm font-semibold text-white/50 mb-1">Aucun membre dans l&apos;équipe</p>
            <p className="text-xs text-white/30">Ajoutez des membres pour leur donner accès au dashboard admin</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <h2 className="text-lg font-bold">Ajouter un membre</h2>
              <p className="text-xs text-white/40 mt-1">Créez un compte avec un accès personnalisé au dashboard</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-white/50 mb-1 block">Nom complet *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="Awa Diop"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-white/50 mb-1 block">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="awa@tamma.me"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 mb-1 block">Mot de passe *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50 mb-1 block">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="+221 77 123 45 67"
                  />
                </div>
              </div>

              {/* Position selector */}
              <div>
                <label className="text-xs font-medium text-white/50 mb-2 block">Poste *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(POSITION_LABELS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setForm({
                        ...form,
                        team_position: key,
                        team_permissions: POSITION_DEFAULTS[key] || [],
                      })}
                      className={`p-3 rounded-xl border text-center transition ${
                        form.team_position === key
                          ? "border-primary/40 bg-primary/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-lg block mb-1">{val.emoji}</span>
                      <span className="text-[11px] font-bold block">{val.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions grid */}
              <div>
                <label className="text-xs font-medium text-white/50 mb-2 block">
                  Pages autorisées ({form.team_permissions.length}/{ALL_PAGES.length})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_PAGES.map((page) => {
                    const active = form.team_permissions.includes(page.key);
                    return (
                      <button
                        key={page.key}
                        onClick={() => {
                          const perms = active
                            ? form.team_permissions.filter((p) => p !== page.key)
                            : [...form.team_permissions, page.key];
                          setForm({ ...form, team_permissions: perms, team_position: form.team_position === "custom" ? "custom" : form.team_position });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                          active
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-white/10 bg-white/5 text-white/30 hover:text-white/50"
                        }`}
                      >
                        <span>{page.emoji}</span>
                        <span>{page.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-semibold text-white/50 hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={createMember}
                disabled={saving}
                className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-50"
              >
                {saving ? "Création..." : "Créer le compte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditPermissions({
  member,
  onSave,
  saving,
}: {
  member: TeamMember;
  onSave: (position: string, permissions: string[]) => void;
  saving: boolean;
}) {
  const [position, setPosition] = useState(member.team_position);
  const [permissions, setPermissions] = useState<string[]>(member.team_permissions || []);

  function togglePerm(key: string) {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function selectPreset(pos: string) {
    setPosition(pos);
    setPermissions(POSITION_DEFAULTS[pos] || []);
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
      {/* Position selector */}
      <div>
        <label className="text-xs font-medium text-white/50 mb-2 block">Poste</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(POSITION_LABELS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                position === key
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/5 text-white/40 hover:text-white/60"
              }`}
            >
              {val.emoji} {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <label className="text-xs font-medium text-white/50 mb-2 block">
          Pages autorisées ({permissions.length}/{ALL_PAGES.length})
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_PAGES.map((page) => {
            const active = permissions.includes(page.key);
            return (
              <button
                key={page.key}
                onClick={() => togglePerm(page.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                  active
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-white/10 bg-white/5 text-white/30 hover:text-white/50"
                }`}
              >
                <span>{page.emoji}</span>
                <span>{page.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onSave(position, permissions)}
        disabled={saving}
        className="btn-primary text-xs px-6 py-2 disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </div>
  );
}
