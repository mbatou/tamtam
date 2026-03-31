"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface BrandUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  city: string | null;
  role: string;
  balance: number;
  created_at: string;
  pipelineStage?: string;
  campaignCount?: number;
  activeCampaigns?: number;
  hasRecharged?: boolean;
  teamMembers?: number;
}

interface EchoUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  role: string;
  balance: number;
  created_at: string;
  totalClicks?: number;
  validClicks?: number;
}

type CRMUser = BrandUser | EchoUser;

interface StageCounts {
  registered: number;
  recharged: number;
  first_campaign: number;
  repeat: number;
  vip: number;
}

interface CRMData {
  users: CRMUser[];
  total: number;
  page: number;
  limit: number;
  stageCounts?: StageCounts;
}

export default function CRMPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [view, setView] = useState<"brands" | "echos">("brands");
  const [data, setData] = useState<CRMData>({ users: [], total: 0, page: 1, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<CRMUser | null>(null);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view,
        search,
        city: cityFilter,
        status: stageFilter,
        page: String(page),
      });
      const res = await fetch(`/api/superadmin/crm?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }, [view, search, cityFilter, stageFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedUsers.length === data.users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(data.users.map(u => u.id));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/superadmin/crm/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export", userIds: selectedUsers }),
      });
      const { users } = await res.json();
      if (!users || users.length === 0) return;
      const headers = Object.keys(users[0]);
      const csv = [
        headers.join(","),
        ...users.map((u: Record<string, unknown>) =>
          headers.map(h => {
            const val = String(u[h] ?? "");
            return val.includes(",") ? `"${val}"` : val;
          }).join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tamtam-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Export CSV téléchargé", "success");
    } catch {
      showToast("Erreur d'export", "error");
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch("/api/superadmin/crm/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          updates: {
            name: editingUser.name,
            email: editingUser.email,
            phone: editingUser.phone,
            city: editingUser.city,
            company_name: (editingUser as BrandUser).company_name,
            balance: editingUser.balance,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
        return;
      }
      showToast("Utilisateur mis à jour", "success");
      setEditingUser(null);
      fetchData();
    } catch {
      showToast("Erreur de mise à jour", "error");
    }
  };

  const stageCounts = data.stageCounts || { registered: 0, recharged: 0, first_campaign: 0, repeat: 0, vip: 0 };

  return (
    <div className="p-6">
      {ToastComponent}
      <h1 className="text-2xl font-bold text-white mb-6">👥 CRM</h1>

      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setView("brands"); setStageFilter(""); setSelectedUsers([]); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            view === "brands" ? "bg-gradient-primary text-white shadow-lg" : "bg-white/5 text-white/50 hover:text-white/80"
          }`}
        >
          Marques ({view === "brands" ? data.total : "..."})
        </button>
        <button
          onClick={() => { setView("echos"); setStageFilter(""); setSelectedUsers([]); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            view === "echos" ? "bg-gradient-primary text-white shadow-lg" : "bg-white/5 text-white/50 hover:text-white/80"
          }`}
        >
          Échos ({view === "echos" ? data.total : "..."})
        </button>
      </div>

      {/* Brand pipeline stages (only for brands view) */}
      {view === "brands" && (
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "", label: "Tous", count: data.total },
            { key: "registered", label: "Inscrits", count: stageCounts.registered, color: "text-white/40" },
            { key: "recharged", label: "Rechargé", count: stageCounts.recharged, color: "text-blue-400" },
            { key: "first_campaign", label: "1ère campagne", count: stageCounts.first_campaign, color: "text-teal-400" },
            { key: "repeat", label: "Récurrent", count: stageCounts.repeat, color: "text-green-400" },
            { key: "vip", label: "VIP", count: stageCounts.vip, color: "text-yellow-400" },
          ].map(stage => (
            <button
              key={stage.key}
              onClick={() => { setStageFilter(stage.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                stageFilter === stage.key
                  ? "bg-gradient-primary text-white"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              {stage.label} ({stage.count || 0})
            </button>
          ))}
        </div>
      )}

      {/* Search + filters + bulk actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={view === "brands" ? "Rechercher par nom, email, entreprise..." : "Rechercher par nom, email, téléphone..."}
          className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-primary/50"
        />

        <select
          value={cityFilter}
          onChange={e => { setCityFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/70 text-sm focus:outline-none"
        >
          <option value="">Toutes les villes</option>
          <option value="Dakar">Dakar</option>
          <option value="Rufisque">Rufisque</option>
          <option value="Thiès">Thiès</option>
          <option value="Pikine">Pikine</option>
          <option value="Saint-Louis">Saint-Louis</option>
        </select>

        {/* Bulk actions */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">{selectedUsers.length} sélectionné(s)</span>
            <button
              onClick={() => setShowBulkEmail(true)}
              className="bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-xs hover:bg-blue-500/30 transition"
            >
              ✉️ Email
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs hover:bg-red-500/30 transition"
            >
              🗑️ Supprimer
            </button>
            <button
              onClick={handleExport}
              className="bg-white/5 text-white/50 px-3 py-2 rounded-lg text-xs hover:bg-white/10 transition"
            >
              📥 CSV
            </button>
          </div>
        )}
      </div>

      {/* User table */}
      <div className="sa-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
            Chargement...
          </div>
        ) : data.users.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-sm">
            Aucun utilisateur trouvé
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs uppercase border-b border-white/5">
                    <th className="py-3 px-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === data.users.length && data.users.length > 0}
                        onChange={selectAll}
                        className="rounded accent-orange-500"
                      />
                    </th>
                    <th className="py-3 px-4 text-left">{view === "brands" ? "Entreprise" : "Nom"}</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Ville</th>
                    <th className="py-3 px-4 text-right">Solde</th>
                    {view === "brands" && <th className="py-3 px-4 text-center">Campagnes</th>}
                    {view === "brands" && <th className="py-3 px-4 text-center">Statut</th>}
                    {view === "echos" && <th className="py-3 px-4 text-center">Clics valides</th>}
                    <th className="py-3 px-4 text-left">Inscrit</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(user => {
                    const brand = user as BrandUser;
                    const echo = user as EchoUser;
                    return (
                      <tr key={user.id} className="border-t border-white/5 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            className="rounded accent-orange-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{brand.company_name || user.name}</div>
                          {brand.company_name && <div className="text-white/30 text-xs">{user.name}</div>}
                        </td>
                        <td className="py-3 px-4 text-white/40">{user.email}</td>
                        <td className="py-3 px-4 text-white/40">{user.city || "—"}</td>
                        <td className="py-3 px-4 text-right text-white">
                          {Number(user.balance || 0).toLocaleString("fr-FR")} F
                        </td>
                        {view === "brands" && (
                          <td className="py-3 px-4 text-center text-white/40">
                            {brand.campaignCount || 0}
                            {(brand.activeCampaigns || 0) > 0 && (
                              <span className="text-green-400 text-xs ml-1">({brand.activeCampaigns} active)</span>
                            )}
                          </td>
                        )}
                        {view === "brands" && (
                          <td className="py-3 px-4 text-center">
                            <PipelineStageBadge stage={brand.pipelineStage || "registered"} />
                          </td>
                        )}
                        {view === "echos" && (
                          <td className="py-3 px-4 text-center text-green-400">
                            {echo.validClicks || 0}
                          </td>
                        )}
                        <td className="py-3 px-4 text-white/30 text-xs">
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-white/30 hover:text-orange-400 text-xs px-2 py-1 transition"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            {user.phone && (
                              <a
                                href={`https://wa.me/${user.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/30 hover:text-green-400 text-xs px-2 py-1 transition"
                                title="WhatsApp"
                              >
                                💬
                              </a>
                            )}
                            <button
                              onClick={() => router.push(`/superadmin/users/${user.id}`)}
                              className="text-white/30 hover:text-blue-400 text-xs px-2 py-1 transition"
                              title="Investigation"
                            >
                              🔍
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.total > 25 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <span className="text-white/30 text-xs">
                  {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} sur {data.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-white/5 text-white/40 px-3 py-1 rounded text-xs disabled:opacity-30 hover:bg-white/10 transition"
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 25 >= data.total}
                    className="bg-white/5 text-white/40 px-3 py-1 rounded text-xs disabled:opacity-30 hover:bg-white/10 transition"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">
              Modifier {(editingUser as BrandUser).company_name || editingUser.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-white/30 text-xs">Nom</label>
                <input
                  type="text"
                  value={editingUser.name || ""}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              {view === "brands" && (
                <div>
                  <label className="text-white/30 text-xs">Entreprise</label>
                  <input
                    type="text"
                    value={(editingUser as BrandUser).company_name || ""}
                    onChange={e => setEditingUser({ ...editingUser, company_name: e.target.value } as CRMUser)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
              )}
              <div>
                <label className="text-white/30 text-xs">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-white/30 text-xs">Téléphone</label>
                <input
                  type="text"
                  value={editingUser.phone || ""}
                  onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-white/30 text-xs">Ville</label>
                <input
                  type="text"
                  value={editingUser.city || ""}
                  onChange={e => setEditingUser({ ...editingUser, city: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-white/30 text-xs">Solde (FCFA)</label>
                <input
                  type="number"
                  value={editingUser.balance || 0}
                  onChange={e => setEditingUser({ ...editingUser, balance: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
                <p className="text-white/20 text-xs mt-1">Les ajustements de solde sont loggés automatiquement</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-white/5 text-white/50 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 bg-gradient-primary text-white py-2.5 rounded-lg text-sm font-medium"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk email modal */}
      {showBulkEmail && (
        <BulkEmailModal
          count={selectedUsers.length}
          onSend={async (subject, message) => {
            try {
              await fetch("/api/superadmin/crm/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "send_invitation",
                  userIds: selectedUsers,
                  data: { subject, message },
                }),
              });
              showToast(`${selectedUsers.length} emails envoyés`, "success");
              setShowBulkEmail(false);
              setSelectedUsers([]);
            } catch {
              showToast("Erreur d'envoi", "error");
            }
          }}
          onClose={() => setShowBulkEmail(false)}
        />
      )}

      {/* Bulk delete modal */}
      {showBulkDelete && (
        <BulkDeleteModal
          count={selectedUsers.length}
          onDelete={async (reason) => {
            try {
              await fetch("/api/superadmin/crm/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "delete",
                  userIds: selectedUsers,
                  data: { reason },
                }),
              });
              showToast(`${selectedUsers.length} comptes supprimés`, "success");
              setShowBulkDelete(false);
              setSelectedUsers([]);
              fetchData();
            } catch {
              showToast("Erreur de suppression", "error");
            }
          }}
          onClose={() => setShowBulkDelete(false)}
        />
      )}
    </div>
  );
}

function PipelineStageBadge({ stage }: { stage: string }) {
  const config: Record<string, { label: string; color: string }> = {
    vip: { label: "⭐ VIP", color: "bg-yellow-500/20 text-yellow-400" },
    repeat: { label: "🔄 Récurrent", color: "bg-green-500/20 text-green-400" },
    first_campaign: { label: "🚀 1ère campagne", color: "bg-teal-500/20 text-teal-400" },
    recharged: { label: "💰 Rechargé", color: "bg-blue-500/20 text-blue-400" },
    registered: { label: "📝 Inscrit", color: "bg-white/10 text-white/40" },
  };
  const c = config[stage] || config.registered;
  return <span className={`text-xs px-2 py-1 rounded ${c.color}`}>{c.label}</span>;
}

function BulkEmailModal({ count, onSend, onClose }: {
  count: number;
  onSend: (subject: string, message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("Votre compte Tamtam vous attend!");
  const [message, setMessage] = useState("Connectez-vous pour découvrir les nouvelles fonctionnalités et lancer votre première campagne.");
  const [sending, setSending] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold mb-4">Envoyer un email à {count} utilisateur(s)</h3>
        <div className="space-y-3">
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Objet"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
          />
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message"
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 bg-white/5 text-white/50 py-2 rounded-lg text-sm hover:bg-white/10 transition">
            Annuler
          </button>
          <button
            onClick={async () => { setSending(true); await onSend(subject, message); }}
            disabled={sending}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {sending ? "Envoi..." : `Envoyer à ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteModal({ count, onDelete, onClose }: {
  count: number;
  onDelete: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-red-500/30 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-red-400 font-bold mb-2">Supprimer {count} compte(s)</h3>
        <p className="text-white/40 text-sm mb-4">Cette action est irréversible. Les données seront anonymisées.</p>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Raison de la suppression..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm mb-4 focus:outline-none focus:border-red-500/50"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-white/5 text-white/50 py-2 rounded-lg text-sm hover:bg-white/10 transition">
            Annuler
          </button>
          <button
            onClick={async () => { setDeleting(true); await onDelete(reason); }}
            disabled={deleting || !reason}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {deleting ? "Suppression..." : `Supprimer ${count} compte(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
