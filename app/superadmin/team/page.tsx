"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import { Users, UserPlus, Pencil, Trash2, ShieldCheck, Briefcase, HeadphonesIcon, BarChart3, Wallet, MessageCircle } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  team_position: string;
  team_permissions: string[];
  created_at: string;
}

const POSITION_LABELS: Record<string, { label: string; icon: typeof Briefcase; color: string }> = {
  coo: { label: "COO", icon: Briefcase, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  customer_success: { label: "Customer Success", icon: HeadphonesIcon, color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  campaign_manager: { label: "Campaign Manager", icon: BarChart3, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  finance_manager: { label: "Finance Manager", icon: Wallet, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  community_manager: { label: "Community Manager", icon: MessageCircle, color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  custom: { label: "Personnalisé", icon: ShieldCheck, color: "bg-white/5 text-white/60 border-white/10" },
};

const ALL_PAGES = [
  { key: "briefing", label: "Briefing" },
  { key: "overview", label: "Vue d'ensemble" },
  { key: "fraud", label: "Anti-Fraude" },
  { key: "campaigns", label: "Campagnes" },
  { key: "leads", label: "Leads" },
  { key: "finance", label: "Finance" },
  { key: "users", label: "Utilisateurs" },
  { key: "health", label: "Santé" },
  { key: "support", label: "Support" },
  { key: "crm", label: "CRM" },
];

const POSITION_DEFAULTS: Record<string, string[]> = {
  coo: ["briefing", "overview", "fraud", "campaigns", "leads", "finance", "users", "health", "support", "crm"],
  customer_success: ["briefing", "overview", "users", "support", "leads", "crm"],
  campaign_manager: ["briefing", "overview", "campaigns", "leads", "users"],
  finance_manager: ["briefing", "overview", "finance", "users"],
  community_manager: ["briefing", "overview", "users", "support"],
  custom: [],
};

export default function TeamPage() {
  const { showToast, ToastComponent } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);

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
      showToast("Erreur réseau", "error");
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
      showToast("Erreur réseau", "error");
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
      showToast("Erreur réseau", "error");
    }
    setSaving(false);
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(`Retirer ${name} de l'équipe ? Son accès au dashboard sera révoqué.`)) return;
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
      showToast("Erreur réseau", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {ToastComponent}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-syne font-bold flex items-center gap-3">
            <Users size={24} className="text-[#D35400]" />
            Équipe
          </h1>
          <p className="text-sm font-dm text-white/40 mt-1">
            {members.length} membre{members.length !== 1 ? "s" : ""} · Gérer les accès de votre équipe
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-[#D35400] hover:bg-[#D35400]/90 text-white text-sm font-dm font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <UserPlus size={16} />
          Ajouter
        </button>
      </div>

      {/* Team members list */}
      <div className="space-y-3">
        {members.map((member) => {
          const pos = POSITION_LABELS[member.team_position] || POSITION_LABELS.custom;
          const PosIcon = pos.icon;
          const isEditing = editing?.id === member.id;

          return (
            <div key={member.id} className="bg-[#111128] border border-white/[0.07] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D35400]/20 flex items-center justify-center text-sm font-syne font-bold text-[#D35400]">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-syne font-bold">{member.name}</span>
                      <span className={`text-[10px] font-dm font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${pos.color}`}>
                        <PosIcon size={10} />
                        {pos.label}
                      </span>
                    </div>
                    <p className="text-xs font-dm text-white/30 mt-0.5">
                      Ajouté {timeAgo(member.created_at)} · {(member.team_permissions || []).length} page{(member.team_permissions || []).length !== 1 ? "s" : ""} autorisée{(member.team_permissions || []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(isEditing ? null : member)}
                    className="text-xs font-dm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/50 hover:text-white/80 font-semibold flex items-center gap-1.5"
                  >
                    <Pencil size={12} />
                    {isEditing ? "Fermer" : "Modifier"}
                  </button>
                  <button
                    onClick={() => removeMember(member.id, member.name)}
                    className="text-xs font-dm px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition text-red-400 font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Retirer
                  </button>
                </div>
              </div>

              {/* Permissions tags (collapsed view) */}
              {!isEditing && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(member.team_permissions || []).map((perm) => {
                    const pg = ALL_PAGES.find((p) => p.key === perm);
                    return pg ? (
                      <span key={perm} className="text-[10px] font-dm px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-medium">
                        {pg.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {/* Edit panel */}
              {isEditing && (
                <EditPermissions
                  member={member}
                  onSave={(p, perms) => updateMember(member.id, p, perms)}
                  saving={saving}
                />
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-10 text-center">
            <Users size={32} className="mx-auto mb-3 text-white/20" />
            <p className="text-sm font-syne font-semibold text-white/50 mb-1">Aucun membre</p>
            <p className="text-xs font-dm text-white/30">Ajoutez des membres pour leur donner accès au dashboard</p>
          </div>
        )}
      </div>

      {/* Create Drawer */}
      <AdminDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Ajouter un membre"
        subtitle="Créer un compte avec accès personnalisé"
        width="520px"
      >
        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-dm font-medium text-white/50 mb-1 block">Nom complet *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-dm focus:outline-none focus:border-[#D35400]/50 transition"
                placeholder="Awa Diop"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-dm font-medium text-white/50 mb-1 block">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-dm focus:outline-none focus:border-[#D35400]/50 transition"
                placeholder="awa@tamtam.me"
              />
            </div>
            <div>
              <label className="text-xs font-dm font-medium text-white/50 mb-1 block">Mot de passe *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-dm focus:outline-none focus:border-[#D35400]/50 transition"
              />
            </div>
            <div>
              <label className="text-xs font-dm font-medium text-white/50 mb-1 block">Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-dm focus:outline-none focus:border-[#D35400]/50 transition"
                placeholder="+221 77 123 45 67"
              />
            </div>
          </div>

          {/* Position selector */}
          <div>
            <label className="text-xs font-dm font-medium text-white/50 mb-2 block">Poste *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(POSITION_LABELS).map(([key, val]) => {
                const Icon = val.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setForm({
                      ...form,
                      team_position: key,
                      team_permissions: POSITION_DEFAULTS[key] || [],
                    })}
                    className={`p-3 rounded-xl border text-center transition ${
                      form.team_position === key
                        ? "border-[#D35400]/40 bg-[#D35400]/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} className="mx-auto mb-1 text-white/50" />
                    <span className="text-[11px] font-dm font-bold block">{val.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions grid */}
          <div>
            <label className="text-xs font-dm font-medium text-white/50 mb-2 block">
              Pages autorisées ({form.team_permissions.length}/{ALL_PAGES.length})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_PAGES.map((pg) => {
                const active = form.team_permissions.includes(pg.key);
                return (
                  <button
                    key={pg.key}
                    onClick={() => {
                      const perms = active
                        ? form.team_permissions.filter((p) => p !== pg.key)
                        : [...form.team_permissions, pg.key];
                      setForm({ ...form, team_permissions: perms });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-dm font-semibold transition ${
                      active
                        ? "border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#1D9E75]"
                        : "border-white/10 bg-white/5 text-white/30 hover:text-white/50"
                    }`}
                  >
                    {pg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-dm font-semibold text-white/50 hover:bg-white/10 transition"
            >
              Annuler
            </button>
            <button
              onClick={createMember}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#D35400] hover:bg-[#D35400]/90 text-white text-sm font-dm font-bold transition disabled:opacity-50"
            >
              {saving ? "Création..." : "Créer le compte"}
            </button>
          </div>
        </div>
      </AdminDrawer>
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
    <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-4">
      {/* Position selector */}
      <div>
        <label className="text-xs font-dm font-medium text-white/50 mb-2 block">Poste</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(POSITION_LABELS).map(([key, val]) => {
            const Icon = val.icon;
            return (
              <button
                key={key}
                onClick={() => selectPreset(key)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-dm font-semibold transition flex items-center gap-1.5 ${
                  position === key
                    ? "border-[#D35400]/40 bg-[#D35400]/10 text-[#D35400]"
                    : "border-white/10 bg-white/5 text-white/40 hover:text-white/60"
                }`}
              >
                <Icon size={12} />
                {val.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <label className="text-xs font-dm font-medium text-white/50 mb-2 block">
          Pages autorisées ({permissions.length}/{ALL_PAGES.length})
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_PAGES.map((pg) => {
            const active = permissions.includes(pg.key);
            return (
              <button
                key={pg.key}
                onClick={() => togglePerm(pg.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-dm font-semibold transition ${
                  active
                    ? "border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#1D9E75]"
                    : "border-white/10 bg-white/5 text-white/30 hover:text-white/50"
                }`}
              >
                {pg.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onSave(position, permissions)}
        disabled={saving}
        className="bg-[#D35400] hover:bg-[#D35400]/90 text-white text-xs font-dm font-bold px-6 py-2 rounded-xl transition disabled:opacity-50"
      >
        {saving ? "Sauvegarde..." : "Enregistrer"}
      </button>
    </div>
  );
}
