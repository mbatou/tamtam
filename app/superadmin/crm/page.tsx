"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Pagination from "@/components/ui/Pagination";

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
  crm_tags?: string[];
  crm_stage?: string;
}

interface CRMNote {
  id: string;
  content: string;
  note_type: string;
  followup_date: string | null;
  created_at: string;
  author_id: string;
}

interface BrandCampaign {
  id: string;
  title: string;
  status: string;
  budget: number;
  cpc: number;
  created_at: string;
  moderation_status: string;
  target_city: string | null;
  echoCount: number;
}

interface BrandPayment {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
}

interface BrandTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface BrandDetail {
  campaigns: BrandCampaign[];
  payments: BrandPayment[];
  transactions: BrandTransaction[];
  totalSpent: number;
  totalRecharged: number;
}

interface StageCounts {
  registered: number;
  recharged: number;
  first_campaign: number;
  repeat: number;
  vip: number;
}

interface CRMData {
  users: BrandUser[];
  total: number;
  page: number;
  limit: number;
  stageCounts?: StageCounts;
}

const AVAILABLE_TAGS = [
  "VIP", "Prioritaire", "Nouveau", "Inactif", "Relance", "Fidèle",
  "Grand compte", "PME", "Startup", "E-commerce", "Service", "Média",
];

export default function CRMPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [data, setData] = useState<CRMData>({ users: [], total: 0, page: 1, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<BrandUser | null>(null);
  const [detailUser, setDetailUser] = useState<BrandUser | null>(null);
  const [detailNotes, setDetailNotes] = useState<CRMNote[]>([]);
  const [detailNotesLoading, setDetailNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState("note");
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [brandDetail, setBrandDetail] = useState<BrandDetail | null>(null);
  const [brandDetailLoading, setBrandDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "campaigns" | "finance">("info");
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: "brands",
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
  }, [search, cityFilter, stageFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchNotes = useCallback(async (userId: string) => {
    setDetailNotesLoading(true);
    try {
      const res = await fetch(`/api/superadmin/crm/notes?contact_id=${userId}&contact_type=brand`);
      if (res.ok) {
        const notes = await res.json();
        setDetailNotes(notes);
      }
    } catch {
      setDetailNotes([]);
    }
    setDetailNotesLoading(false);
  }, []);

  const handleAddNote = async () => {
    if (!detailUser || !newNote.trim()) return;
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_note",
          contact_id: detailUser.id,
          contact_type: "brand",
          content: newNote.trim(),
          note_type: newNoteType,
        }),
      });
      if (res.ok) {
        setNewNote("");
        fetchNotes(detailUser.id);
        showToast("Note ajoutée", "success");
      }
    } catch {
      showToast("Erreur", "error");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_note", note_id: noteId }),
      });
      if (detailUser) fetchNotes(detailUser.id);
    } catch {
      showToast("Erreur", "error");
    }
  };

  const handleUpdateTags = async (userId: string, tags: string[]) => {
    try {
      await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_tags",
          contact_id: userId,
          contact_type: "brand",
          tags,
        }),
      });
      if (detailUser) {
        setDetailUser({ ...detailUser, crm_tags: tags });
      }
      fetchData();
      showToast("Tags mis à jour", "success");
    } catch {
      showToast("Erreur", "error");
    }
  };

  const fetchBrandDetail = useCallback(async (userId: string) => {
    setBrandDetailLoading(true);
    try {
      const res = await fetch(`/api/superadmin/crm/detail?user_id=${userId}`);
      if (res.ok) {
        const detail = await res.json();
        setBrandDetail(detail);
      }
    } catch {
      setBrandDetail(null);
    }
    setBrandDetailLoading(false);
  }, []);

  const openDetail = (user: BrandUser) => {
    setDetailUser(user);
    setDetailTab("info");
    fetchNotes(user.id);
    fetchBrandDetail(user.id);
  };

  const handleTopup = async () => {
    if (!detailUser || !topupAmount || parseInt(topupAmount) <= 0) return;
    setToppingUp(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "topup",
          user_id: detailUser.id,
          amount: topupAmount,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(`Nouveau solde: ${Number(result.new_balance).toLocaleString("fr-FR")} F`, "success");
        setShowTopup(false);
        setTopupAmount("");
        setDetailUser({ ...detailUser, balance: result.new_balance });
        fetchBrandDetail(detailUser.id);
        fetchData();
      } else {
        showToast(result.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setToppingUp(false);
  };

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
            company_name: editingUser.company_name,
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
      <h1 className="text-2xl font-bold text-white mb-6">CRM</h1>

      {/* Brand pipeline stages */}
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

      {/* Search + filters + bulk actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par nom, email, entreprise..."
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
              Email
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs hover:bg-red-500/30 transition"
            >
              Supprimer
            </button>
            <button
              onClick={handleExport}
              className="bg-white/5 text-white/50 px-3 py-2 rounded-lg text-xs hover:bg-white/10 transition"
            >
              CSV
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
                    <th className="py-3 px-4 text-left">Entreprise</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Ville</th>
                    <th className="py-3 px-4 text-right">Solde</th>
                    <th className="py-3 px-4 text-center">Campagnes</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-left">Inscrit</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(user => {
                    const brand = user as BrandUser;
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
                          <button
                            onClick={() => openDetail(brand)}
                            className="text-left hover:opacity-80 transition group"
                          >
                            <div className="text-white font-medium group-hover:text-orange-400 transition">
                              {brand.company_name || user.name}
                            </div>
                            {brand.company_name && <div className="text-white/30 text-xs">{user.name}</div>}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-white/40">{user.email}</td>
                        <td className="py-3 px-4 text-white/40">{user.city || "—"}</td>
                        <td className="py-3 px-4 text-right text-white">
                          {Number(user.balance || 0).toLocaleString("fr-FR")} F
                        </td>
                        <td className="py-3 px-4 text-center text-white/40">
                          {brand.campaignCount || 0}
                          {(brand.activeCampaigns || 0) > 0 && (
                            <span className="text-green-400 text-xs ml-1">({brand.activeCampaigns} active)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <PipelineStageBadge stage={brand.pipelineStage || "registered"} />
                        </td>
                        <td className="py-3 px-4 text-white/30 text-xs">
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingUser(brand)}
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
                              onClick={() => router.push(`/superadmin/users?id=${user.id}`)}
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
            <div className="px-4 py-3 border-t border-white/5">
              <Pagination
                currentPage={page}
                totalItems={data.total}
                pageSize={25}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Brand detail modal */}
      {detailUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailUser(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {detailUser.company_name || detailUser.name}
                  </h3>
                  {detailUser.company_name && (
                    <p className="text-white/40 text-sm">{detailUser.name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <PipelineStageBadge stage={detailUser.pipelineStage || "registered"} />
                    {detailUser.city && (
                      <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded">{detailUser.city}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setDetailUser(null)} className="text-white/30 hover:text-white/60 text-xl">&times;</button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 p-6 border-b border-white/5">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-white font-bold">{Number(detailUser.balance || 0).toLocaleString("fr-FR")} F</div>
                <div className="text-white/30 text-xs mt-1">Solde</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-white font-bold">{detailUser.campaignCount || 0}</div>
                <div className="text-white/30 text-xs mt-1">Campagnes</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-green-400 font-bold">{detailUser.activeCampaigns || 0}</div>
                <div className="text-white/30 text-xs mt-1">Actives</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-white font-bold">{detailUser.teamMembers || 0}</div>
                <div className="text-white/30 text-xs mt-1">Equipe</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {(["info", "campaigns", "finance"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`flex-1 py-3 text-xs font-medium uppercase tracking-wide transition ${
                    detailTab === tab
                      ? "text-white border-b-2 border-primary"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  {tab === "info" ? "Infos" : tab === "campaigns" ? "Campagnes" : "Finance"}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {detailTab === "info" && (
              <>
                {/* Contact info */}
                <div className="p-6 border-b border-white/5 space-y-2">
                  <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Contact</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/30 w-16">Email</span>
                    <span className="text-white">{detailUser.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/30 w-16">Tel.</span>
                    <span className="text-white">{detailUser.phone || "—"}</span>
                    {detailUser.phone && (
                      <a
                        href={`https://wa.me/${detailUser.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 text-xs transition"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/30 w-16">Inscrit</span>
                    <span className="text-white">{new Date(detailUser.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="p-6 border-b border-white/5">
                  <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map(tag => {
                      const isActive = (detailUser.crm_tags || []).includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            const current = detailUser.crm_tags || [];
                            const newTags = isActive ? current.filter(t => t !== tag) : [...current, tag];
                            handleUpdateTags(detailUser.id, newTags);
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            isActive
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : "bg-white/5 text-white/30 border border-white/5 hover:text-white/50 hover:border-white/10"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="p-6 border-b border-white/5">
                  <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Notes</h4>
                  {detailNotesLoading ? (
                    <div className="text-white/20 text-sm py-4 text-center">Chargement...</div>
                  ) : detailNotes.length === 0 ? (
                    <div className="text-white/20 text-sm py-4 text-center">Aucune note</div>
                  ) : (
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                      {detailNotes.map(note => (
                        <div key={note.id} className="bg-white/5 rounded-lg p-3 group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <NoteTypeBadge type={note.note_type} />
                                <span className="text-white/20 text-xs">
                                  {new Date(note.created_at).toLocaleDateString("fr-FR")}
                                </span>
                              </div>
                              <p className="text-white/70 text-sm">{note.content}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-white/10 hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={newNoteType}
                      onChange={e => setNewNoteType(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white/50 text-xs focus:outline-none"
                    >
                      <option value="note">Note</option>
                      <option value="call">Appel</option>
                      <option value="email">Email</option>
                      <option value="followup">Relance</option>
                      <option value="meeting">Reunion</option>
                    </select>
                    <input
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddNote(); }}
                      placeholder="Ajouter une note..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="bg-gradient-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 transition"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Tab: Campaigns */}
            {detailTab === "campaigns" && (
              <div className="p-6">
                <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Campagnes</h4>
                {brandDetailLoading ? (
                  <div className="text-white/20 text-sm py-8 text-center">Chargement...</div>
                ) : !brandDetail || brandDetail.campaigns.length === 0 ? (
                  <div className="text-white/20 text-sm py-8 text-center">Aucune campagne</div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {brandDetail.campaigns.map(campaign => (
                      <div key={campaign.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/[0.07] transition">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium text-sm truncate">{campaign.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <CampaignStatusBadge status={campaign.status} moderation={campaign.moderation_status} />
                              {campaign.target_city && (
                                <span className="text-xs text-white/20">{campaign.target_city}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-white font-bold text-sm">{Number(campaign.budget || 0).toLocaleString("fr-FR")} F</div>
                            <div className="text-white/20 text-xs">{campaign.cpc} F/clic</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/30 mt-2 pt-2 border-t border-white/5">
                          <span>{new Date(campaign.created_at).toLocaleDateString("fr-FR")}</span>
                          <span>{campaign.echoCount} echo{campaign.echoCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Finance */}
            {detailTab === "finance" && (
              <div className="p-6">
                {brandDetailLoading ? (
                  <div className="text-white/20 text-sm py-8 text-center">Chargement...</div>
                ) : !brandDetail ? (
                  <div className="text-white/20 text-sm py-8 text-center">Aucune donnee</div>
                ) : (
                  <>
                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-white font-bold text-sm">{Number(detailUser.balance || 0).toLocaleString("fr-FR")} F</div>
                        <div className="text-white/30 text-xs mt-1">Solde actuel</div>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3 text-center">
                        <div className="text-green-400 font-bold text-sm">{Number(brandDetail.totalRecharged || 0).toLocaleString("fr-FR")} F</div>
                        <div className="text-white/30 text-xs mt-1">Total recharge</div>
                      </div>
                      <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                        <div className="text-orange-400 font-bold text-sm">{Number(brandDetail.totalSpent || 0).toLocaleString("fr-FR")} F</div>
                        <div className="text-white/30 text-xs mt-1">Total depense</div>
                      </div>
                    </div>

                    {/* Recharge history */}
                    <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Historique des recharges</h4>
                    {brandDetail.payments.length === 0 ? (
                      <div className="text-white/20 text-sm py-4 text-center mb-6">Aucune recharge</div>
                    ) : (
                      <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                        {brandDetail.payments.map(payment => (
                          <div key={payment.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <PaymentStatusBadge status={payment.status} />
                              <div>
                                <div className="text-white text-sm font-medium">{Number(payment.amount || 0).toLocaleString("fr-FR")} F</div>
                                <div className="text-white/20 text-xs">{payment.payment_method || "Wave"}</div>
                              </div>
                            </div>
                            <span className="text-white/20 text-xs">{new Date(payment.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent transactions */}
                    <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Transactions recentes</h4>
                    {brandDetail.transactions.length === 0 ? (
                      <div className="text-white/20 text-sm py-4 text-center">Aucune transaction</div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {brandDetail.transactions.map(tx => (
                          <div key={tx.id} className="bg-white/5 rounded-lg px-3 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`text-xs font-mono font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {tx.amount >= 0 ? "+" : ""}{Number(tx.amount).toLocaleString("fr-FR")} F
                              </span>
                              <span className="text-white/30 text-xs truncate">{tx.description || tx.type}</span>
                            </div>
                            <span className="text-white/20 text-xs ml-2 shrink-0">{new Date(tx.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="p-6 border-t border-white/5 flex gap-3 flex-wrap">
              <button
                onClick={() => setShowTopup(true)}
                className="flex-1 bg-blue-500/10 text-blue-400 py-2.5 rounded-lg text-sm hover:bg-blue-500/20 transition font-medium"
              >
                Recharger
              </button>
              <button
                onClick={() => {
                  setDetailUser(null);
                  setEditingUser(detailUser);
                }}
                className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
              >
                Modifier
              </button>
              <button
                onClick={() => {
                  setDetailUser(null);
                  router.push(`/superadmin/users?id=${detailUser.id}`);
                }}
                className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
              >
                Investigation
              </button>
              {detailUser.phone && (
                <a
                  href={`https://wa.me/${detailUser.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-500/10 text-green-400 py-2.5 rounded-lg text-sm text-center hover:bg-green-500/20 transition"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Topup modal */}
      {showTopup && detailUser && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setShowTopup(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-1">Recharger le compte</h3>
            <p className="text-white/40 text-sm mb-4">{detailUser.company_name || detailUser.name}</p>
            <div className="bg-white/5 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-white/40 text-sm">Solde actuel</span>
              <span className="text-white font-bold">{Number(detailUser.balance || 0).toLocaleString("fr-FR")} F</span>
            </div>
            <input
              type="number"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              placeholder="Montant (FCFA)"
              min="0"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 mb-3"
            />
            <div className="flex gap-2 mb-4">
              {[5000, 10000, 25000, 50000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(String(amt))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                    topupAmount === String(amt)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  {(amt / 1000)}k
                </button>
              ))}
            </div>
            {topupAmount && parseInt(topupAmount) > 0 && (
              <div className="bg-green-500/10 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-white/40 text-sm">Nouveau solde</span>
                <span className="text-green-400 font-bold">
                  {Number((detailUser.balance || 0) + parseInt(topupAmount)).toLocaleString("fr-FR")} F
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTopup(false); setTopupAmount(""); }}
                className="flex-1 bg-white/5 text-white/50 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleTopup}
                disabled={toppingUp || !topupAmount || parseInt(topupAmount) <= 0}
                className="flex-1 bg-gradient-primary text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-30 transition"
              >
                {toppingUp ? "Recharge..." : `Recharger ${topupAmount ? Number(topupAmount).toLocaleString("fr-FR") + " F" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">
              Modifier {editingUser.company_name || editingUser.name}
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
              <div>
                <label className="text-white/30 text-xs">Entreprise</label>
                <input
                  type="text"
                  value={editingUser.company_name || ""}
                  onChange={e => setEditingUser({ ...editingUser, company_name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
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
    vip: { label: "VIP", color: "bg-yellow-500/20 text-yellow-400" },
    repeat: { label: "Récurrent", color: "bg-green-500/20 text-green-400" },
    first_campaign: { label: "1ère campagne", color: "bg-teal-500/20 text-teal-400" },
    recharged: { label: "Rechargé", color: "bg-blue-500/20 text-blue-400" },
    registered: { label: "Inscrit", color: "bg-white/10 text-white/40" },
  };
  const c = config[stage] || config.registered;
  return <span className={`text-xs px-2 py-1 rounded ${c.color}`}>{c.label}</span>;
}

function NoteTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    note: { label: "Note", color: "bg-white/10 text-white/40" },
    call: { label: "Appel", color: "bg-blue-500/20 text-blue-400" },
    email: { label: "Email", color: "bg-purple-500/20 text-purple-400" },
    followup: { label: "Relance", color: "bg-orange-500/20 text-orange-400" },
    meeting: { label: "Réunion", color: "bg-teal-500/20 text-teal-400" },
  };
  const c = config[type] || config.note;
  return <span className={`text-xs px-1.5 py-0.5 rounded ${c.color}`}>{c.label}</span>;
}

function CampaignStatusBadge({ status, moderation }: { status: string; moderation: string }) {
  const config: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-green-500/20 text-green-400" },
    paused: { label: "Pause", color: "bg-yellow-500/20 text-yellow-400" },
    completed: { label: "Terminee", color: "bg-white/10 text-white/40" },
    draft: { label: "Brouillon", color: "bg-white/10 text-white/30" },
  };
  const modConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "bg-orange-500/20 text-orange-400" },
    rejected: { label: "Rejetee", color: "bg-red-500/20 text-red-400" },
  };
  if (moderation === "pending" || moderation === "rejected") {
    const m = modConfig[moderation];
    return <span className={`text-xs px-1.5 py-0.5 rounded ${m.color}`}>{m.label}</span>;
  }
  const c = config[status] || config.draft;
  return <span className={`text-xs px-1.5 py-0.5 rounded ${c.color}`}>{c.label}</span>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    completed: { label: "OK", color: "bg-green-500/20 text-green-400" },
    pending: { label: "En attente", color: "bg-orange-500/20 text-orange-400" },
    failed: { label: "Echoue", color: "bg-red-500/20 text-red-400" },
  };
  const c = config[status] || { label: status, color: "bg-white/10 text-white/40" };
  return <span className={`text-xs px-1.5 py-0.5 rounded ${c.color}`}>{c.label}</span>;
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
