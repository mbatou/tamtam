"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import Pagination from "@/components/ui/Pagination";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import {
  Building2,
  Search,
  Download,
  Mail,
  Trash2,
  Pencil,
  ExternalLink,
  MessageCircle,
  CreditCard,
  Eye,
  Megaphone,
  Wallet,
  Plus,
  X,
} from "lucide-react";

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
  target_cities: string[] | null;
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
  "VIP", "Prioritaire", "Nouveau", "Inactif", "Suivi", "Fidèle",
  "Entreprise", "PME", "Startup", "E-commerce", "Service", "Média",
];

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vip: { label: "VIP", color: "#EAB308", bg: "rgba(234,179,8,0.12)" },
  repeat: { label: "Récurrent", color: "#5DCAA5", bg: "rgba(29,158,117,0.12)" },
  first_campaign: { label: "1ère campagne", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  recharged: { label: "Rechargé", color: "#C084FC", bg: "rgba(192,132,252,0.12)" },
  registered: { label: "Inscrit", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" },
};

const NOTE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  note: { label: "Note", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" },
  call: { label: "Appel", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  email: { label: "Email", color: "#C084FC", bg: "rgba(192,132,252,0.12)" },
  followup: { label: "Suivi", color: "#D35400", bg: "rgba(211,84,0,0.12)" },
  meeting: { label: "Réunion", color: "#5DCAA5", bg: "rgba(29,158,117,0.12)" },
};

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
      const params = new URLSearchParams({ view: "brands", search, city: cityFilter, status: stageFilter, page: String(page) });
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
      if (res.ok) setDetailNotes(await res.json());
    } catch { setDetailNotes([]); }
    setDetailNotesLoading(false);
  }, []);

  const handleAddNote = async () => {
    if (!detailUser || !newNote.trim()) return;
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_note", contact_id: detailUser.id, contact_type: "brand", content: newNote.trim(), note_type: newNoteType }),
      });
      if (res.ok) { setNewNote(""); fetchNotes(detailUser.id); showToast("Note ajoutée", "success"); }
    } catch { showToast("Erreur", "error"); }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_note", note_id: noteId }),
      });
      if (detailUser) fetchNotes(detailUser.id);
    } catch { showToast("Erreur", "error"); }
  };

  const handleUpdateTags = async (userId: string, tags: string[]) => {
    try {
      await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_tags", contact_id: userId, contact_type: "brand", tags }),
      });
      if (detailUser) setDetailUser({ ...detailUser, crm_tags: tags });
      fetchData();
      showToast("Tags mis à jour", "success");
    } catch { showToast("Erreur", "error"); }
  };

  const fetchBrandDetail = useCallback(async (userId: string) => {
    setBrandDetailLoading(true);
    try {
      const res = await fetch(`/api/superadmin/crm/detail?user_id=${userId}`);
      if (res.ok) setBrandDetail(await res.json());
    } catch { setBrandDetail(null); }
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
        body: JSON.stringify({ action: "topup", user_id: detailUser.id, amount: topupAmount }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(`Nouveau solde : ${formatFCFA(result.new_balance)}`, "success");
        setShowTopup(false);
        setTopupAmount("");
        setDetailUser({ ...detailUser, balance: result.new_balance });
        fetchBrandDetail(detailUser.id);
        fetchData();
      } else { showToast(result.error || "Erreur", "error"); }
    } catch { showToast("Erreur réseau", "error"); }
    setToppingUp(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedUsers(selectedUsers.length === data.users.length ? [] : data.users.map(u => u.id));
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
      const csv = [headers.join(","), ...users.map((u: Record<string, unknown>) =>
        headers.map(h => { const val = String(u[h] ?? ""); return val.includes(",") ? `"${val}"` : val; }).join(",")
      )].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "tamtam-export.csv"; a.click();
      URL.revokeObjectURL(url);
      showToast("Export CSV téléchargé", "success");
    } catch { showToast("Erreur d'export", "error"); }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch("/api/superadmin/crm/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingUser.id, updates: { name: editingUser.name, email: editingUser.email, phone: editingUser.phone, city: editingUser.city, company_name: editingUser.company_name, balance: editingUser.balance } }),
      });
      if (!res.ok) { const err = await res.json(); showToast(err.error || "Erreur", "error"); return; }
      showToast("Utilisateur mis à jour", "success");
      setEditingUser(null);
      fetchData();
    } catch { showToast("Erreur", "error"); }
  };

  const stageCounts = data.stageCounts || { registered: 0, recharged: 0, first_campaign: 0, repeat: 0, vip: 0 };

  return (
    <div className="p-6 max-w-[1400px]">
      {ToastComponent}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard label="Total marques" value={data.total} icon={<Building2 size={16} />} />
        <AdminStatCard label="Rechargées" value={stageCounts.recharged + stageCounts.first_campaign + stageCounts.repeat + stageCounts.vip} icon={<CreditCard size={16} />} accent="teal" />
        <AdminStatCard label="Actives" value={stageCounts.first_campaign + stageCounts.repeat + stageCounts.vip} icon={<Megaphone size={16} />} accent="teal" />
        <AdminStatCard label="VIP" value={stageCounts.vip} icon={<Wallet size={16} />} accent="orange" />
      </div>

      {/* Pipeline stages */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        {[
          { key: "", label: "Toutes", count: data.total },
          { key: "registered", label: "Inscrites", count: stageCounts.registered },
          { key: "recharged", label: "Rechargées", count: stageCounts.recharged },
          { key: "first_campaign", label: "1ère campagne", count: stageCounts.first_campaign },
          { key: "repeat", label: "Récurrentes", count: stageCounts.repeat },
          { key: "vip", label: "VIP", count: stageCounts.vip },
        ].map(stage => (
          <button
            key={stage.key}
            onClick={() => { setStageFilter(stage.key); setPage(1); }}
            className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
            style={{
              background: stageFilter === stage.key ? "rgba(211,84,0,0.12)" : "transparent",
              color: stageFilter === stage.key ? "#D35400" : "rgba(255,255,255,0.4)",
            }}
          >
            {stage.label} <span className="font-bold ml-1">{stage.count || 0}</span>
          </button>
        ))}
      </div>

      {/* Search + filters + bulk */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, email, entreprise..."
            className="w-full pl-9 pr-4 py-2 rounded-xl font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>

        <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); }}
          className="rounded-xl px-3 py-2 font-dm text-sm focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
          <option value="">Toutes villes</option>
          <option value="Dakar">Dakar</option>
          <option value="Rufisque">Rufisque</option>
          <option value="Thiès">Thiès</option>
          <option value="Pikine">Pikine</option>
          <option value="Saint-Louis">Saint-Louis</option>
        </select>

        {selectedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{selectedUsers.length} sélectionnés</span>
            <button onClick={() => setShowBulkEmail(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-bold transition"
              style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}><Mail size={12} /> Email</button>
            <button onClick={() => setShowBulkDelete(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-bold transition"
              style={{ background: "rgba(226,75,74,0.12)", color: "#F09595" }}><Trash2 size={12} /> Supprimer</button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-bold transition"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}><Download size={12} /> CSV</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: "rgba(255,255,255,0.25)" }}>
            <div className="animate-spin w-5 h-5 rounded-full mr-3" style={{ border: "2px solid #D35400", borderTopColor: "transparent" }} />
            <span className="font-dm text-sm">Chargement...</span>
          </div>
        ) : data.users.length === 0 ? (
          <div className="text-center py-20 font-dm text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Aucune marque trouvée</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#111128" }}>
                    <th className="py-3 px-4 text-left w-10">
                      <input type="checkbox" checked={selectedUsers.length === data.users.length && data.users.length > 0}
                        onChange={selectAll} className="rounded accent-orange-500" />
                    </th>
                    {["Entreprise", "Email", "Ville", "Solde", "Campagnes", "Étape", "Inscrit", "Actions"].map(h => (
                      <th key={h} className="py-3 px-4 text-left font-dm font-medium uppercase tracking-wider" style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(user => {
                    const stage = STAGE_CONFIG[user.pipelineStage || "registered"] || STAGE_CONFIG.registered;
                    return (
                      <tr key={user.id} className="transition-colors" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleSelect(user.id)} className="rounded accent-orange-500" />
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => openDetail(user)} className="text-left group">
                            <div className="font-dm text-sm font-semibold text-white group-hover:text-[#D35400] transition">{user.company_name || user.name}</div>
                            {user.company_name && <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{user.name}</div>}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</td>
                        <td className="py-3 px-4 font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{user.city || "—"}</td>
                        <td className="py-3 px-4 font-syne font-bold text-sm text-white text-right">{formatFCFA(user.balance || 0)}</td>
                        <td className="py-3 px-4 font-dm text-sm text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {user.campaignCount || 0}
                          {(user.activeCampaigns || 0) > 0 && (
                            <span className="ml-1" style={{ color: "#5DCAA5", fontSize: "11px" }}>({user.activeCampaigns})</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-dm text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
                        </td>
                        <td className="py-3 px-4 font-dm text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setEditingUser(user)} className="p-1.5 rounded-lg transition" title="Modifier"
                              style={{ color: "rgba(255,255,255,0.3)" }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#D35400"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                              <Pencil size={13} />
                            </button>
                            {user.phone && (
                              <a href={`https://wa.me/${user.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-lg transition" title="WhatsApp"
                                style={{ color: "rgba(255,255,255,0.3)" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#5DCAA5"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)"; }}>
                                <MessageCircle size={13} />
                              </a>
                            )}
                            <button onClick={() => router.push(`/superadmin/users?id=${user.id}`)} className="p-1.5 rounded-lg transition" title="Investigation"
                              style={{ color: "rgba(255,255,255,0.3)" }}
                              onMouseEnter={e => { e.currentTarget.style.color = "#60A5FA"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
              <Pagination currentPage={page} totalItems={data.total} pageSize={25} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Brand Detail Drawer */}
      <AdminDrawer
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        title={detailUser ? (detailUser.company_name || detailUser.name) : ""}
        subtitle={detailUser?.company_name ? detailUser.name : undefined}
        width="560px"
      >
        {detailUser && (
          <div className="space-y-5">
            {/* Stage + city */}
            <div className="flex items-center gap-2">
              <span className="font-dm text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{ background: (STAGE_CONFIG[detailUser.pipelineStage || "registered"] || STAGE_CONFIG.registered).bg, color: (STAGE_CONFIG[detailUser.pipelineStage || "registered"] || STAGE_CONFIG.registered).color }}>
                {(STAGE_CONFIG[detailUser.pipelineStage || "registered"] || STAGE_CONFIG.registered).label}
              </span>
              {detailUser.city && (
                <span className="font-dm text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{detailUser.city}</span>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: formatFCFA(detailUser.balance || 0), label: "Solde", color: "#fff" },
                { value: String(detailUser.campaignCount || 0), label: "Campagnes", color: "#fff" },
                { value: String(detailUser.activeCampaigns || 0), label: "Actives", color: "#5DCAA5" },
                { value: String(detailUser.teamMembers || 0), label: "Équipe", color: "#fff" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="font-syne font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              {([
                { key: "info" as const, label: "Info", icon: Eye },
                { key: "campaigns" as const, label: "Campagnes", icon: Megaphone },
                { key: "finance" as const, label: "Finance", icon: Wallet },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-dm text-xs font-medium transition-all"
                  style={{ background: detailTab === tab.key ? "rgba(211,84,0,0.12)" : "transparent", color: detailTab === tab.key ? "#D35400" : "rgba(255,255,255,0.4)" }}>
                  <tab.icon size={12} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {detailTab === "info" && (
              <>
                {/* Contact */}
                <div className="space-y-2">
                  <h4 className="font-dm text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Contact</h4>
                  {[
                    { label: "Email", value: detailUser.email || "—" },
                    { label: "Tél.", value: detailUser.phone || "—", wa: detailUser.phone },
                    { label: "Inscrit", value: new Date(detailUser.created_at).toLocaleDateString("fr-FR") },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2 font-dm text-sm">
                      <span className="w-14" style={{ color: "rgba(255,255,255,0.3)" }}>{row.label}</span>
                      <span className="text-white">{row.value}</span>
                      {row.wa && (
                        <a href={`https://wa.me/${row.wa.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="font-dm text-xs transition" style={{ color: "#5DCAA5" }}>WhatsApp</a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div>
                  <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map(tag => {
                      const isActive = (detailUser.crm_tags || []).includes(tag);
                      return (
                        <button key={tag} onClick={() => {
                          const current = detailUser.crm_tags || [];
                          handleUpdateTags(detailUser.id, isActive ? current.filter(t => t !== tag) : [...current, tag]);
                        }}
                          className="px-2.5 py-1 rounded-full font-dm text-xs font-medium transition"
                          style={{
                            background: isActive ? "rgba(211,84,0,0.12)" : "rgba(255,255,255,0.04)",
                            color: isActive ? "#D35400" : "rgba(255,255,255,0.3)",
                            border: `0.5px solid ${isActive ? "rgba(211,84,0,0.3)" : "rgba(255,255,255,0.05)"}`,
                          }}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Notes</h4>
                  {detailNotesLoading ? (
                    <div className="font-dm text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Chargement...</div>
                  ) : detailNotes.length === 0 ? (
                    <div className="font-dm text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune note</div>
                  ) : (
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                      {detailNotes.map(note => {
                        const nc = NOTE_CONFIG[note.note_type] || NOTE_CONFIG.note;
                        return (
                          <div key={note.id} className="rounded-lg p-3 group" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-dm text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: nc.bg, color: nc.color }}>{nc.label}</span>
                                  <span className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(note.created_at).toLocaleDateString("fr-FR")}</span>
                                </div>
                                <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{note.content}</p>
                              </div>
                              <button onClick={() => handleDeleteNote(note.id)}
                                className="opacity-0 group-hover:opacity-100 transition p-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <select value={newNoteType} onChange={e => setNewNoteType(e.target.value)}
                      className="rounded-lg px-2 py-2 font-dm text-xs focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                      <option value="note">Note</option>
                      <option value="call">Appel</option>
                      <option value="email">Email</option>
                      <option value="followup">Suivi</option>
                      <option value="meeting">Réunion</option>
                    </select>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddNote(); }}
                      placeholder="Ajouter une note..."
                      className="flex-1 rounded-lg px-3 py-2 font-dm text-sm focus:outline-none transition"
                      style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                    <button onClick={handleAddNote} disabled={!newNote.trim()}
                      className="px-4 py-2 rounded-lg font-dm text-sm font-bold transition disabled:opacity-30"
                      style={{ background: "#D35400", color: "#fff" }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Tab: Campaigns */}
            {detailTab === "campaigns" && (
              <div>
                {brandDetailLoading ? (
                  <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Chargement...</div>
                ) : !brandDetail || brandDetail.campaigns.length === 0 ? (
                  <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune campagne</div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {brandDetail.campaigns.map(c => (
                      <div key={c.id} className="rounded-xl p-4 transition" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-dm text-sm font-semibold text-white truncate">{c.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <AdminBadge status={
                                c.moderation_status === "pending" ? "pending" :
                                c.moderation_status === "rejected" ? "rejected" :
                                c.status === "active" ? "active" :
                                c.status === "paused" ? "paused" : "finished"
                              }>
                                {c.moderation_status === "pending" ? "En attente" :
                                 c.moderation_status === "rejected" ? "Rejetée" :
                                 c.status === "active" ? "Active" :
                                 c.status === "paused" ? "Pause" : c.status}
                              </AdminBadge>
                              {c.target_cities && c.target_cities.length > 0 && (
                                <span className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{c.target_cities.join(", ")}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="font-syne font-bold text-sm text-white">{formatFCFA(c.budget || 0)}</div>
                            <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{c.cpc} F/clic</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between font-dm text-xs mt-2 pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }}>
                          <span>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                          <span>{c.echoCount} écho{c.echoCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Finance */}
            {detailTab === "finance" && (
              <div>
                {brandDetailLoading ? (
                  <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Chargement...</div>
                ) : !brandDetail ? (
                  <div className="font-dm text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune donnée</div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { value: formatFCFA(detailUser.balance || 0), label: "Solde actuel", color: "#fff" },
                        { value: formatFCFA(brandDetail.totalRecharged || 0), label: "Total rechargé", color: "#5DCAA5" },
                        { value: formatFCFA(brandDetail.totalSpent || 0), label: "Total dépensé", color: "#D35400" },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div className="font-syne font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                          <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Historique recharges</h4>
                    {brandDetail.payments.length === 0 ? (
                      <div className="font-dm text-sm py-4 text-center mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune recharge</div>
                    ) : (
                      <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto">
                        {brandDetail.payments.map(p => (
                          <div key={p.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="flex items-center gap-3">
                              <AdminBadge status={p.status === "completed" ? "active" : p.status === "pending" ? "pending" : "error"}>
                                {p.status === "completed" ? "OK" : p.status === "pending" ? "Attente" : "Échoué"}
                              </AdminBadge>
                              <div>
                                <div className="font-dm text-sm font-medium text-white">{formatFCFA(p.amount || 0)}</div>
                                <div className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{p.payment_method || "Wave"}</div>
                              </div>
                            </div>
                            <span className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Transactions récentes</h4>
                    {brandDetail.transactions.length === 0 ? (
                      <div className="font-dm text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune transaction</div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {brandDetail.transactions.map(tx => (
                          <div key={tx.id} className="rounded-lg px-3 py-2.5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-mono font-bold font-dm text-xs" style={{ color: tx.amount >= 0 ? "#5DCAA5" : "#F09595" }}>
                                {tx.amount >= 0 ? "+" : ""}{formatFCFA(tx.amount)}
                              </span>
                              <span className="font-dm text-xs truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{tx.description || tx.type}</span>
                            </div>
                            <span className="font-dm text-xs ml-2 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(tx.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => { setShowTopup(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(29,158,117,0.1)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#5DCAA5" }}>
                <CreditCard size={14} /> Recharger
              </button>
              <button onClick={() => { setDetailUser(null); setEditingUser(detailUser); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                <Pencil size={14} /> Modifier
              </button>
              <button onClick={() => { setDetailUser(null); router.push(`/superadmin/users?id=${detailUser.id}`); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-dm text-sm font-semibold transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                <ExternalLink size={14} /> Voir
              </button>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Topup overlay */}
      {showTopup && detailUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowTopup(false)}>
          <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
            <h3 className="font-syne font-bold text-white mb-1">Recharger le compte</h3>
            <p className="font-dm text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>{detailUser.company_name || detailUser.name}</p>
            <div className="rounded-lg p-3 mb-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Solde actuel</span>
              <span className="font-syne font-bold text-white">{formatFCFA(detailUser.balance || 0)}</span>
            </div>
            <input type="number" value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
              placeholder="Montant (FCFA)" min="0"
              className="w-full rounded-xl px-4 py-3 font-dm text-sm mb-3 focus:outline-none transition"
              style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
            <div className="flex gap-2 mb-4">
              {[5000, 10000, 25000, 50000].map(amt => (
                <button key={amt} onClick={() => setTopupAmount(String(amt))}
                  className="flex-1 py-2 rounded-lg font-dm text-xs font-bold transition"
                  style={{ background: topupAmount === String(amt) ? "#D35400" : "rgba(255,255,255,0.04)", color: topupAmount === String(amt) ? "#fff" : "rgba(255,255,255,0.4)" }}>
                  {amt / 1000}k
                </button>
              ))}
            </div>
            {topupAmount && parseInt(topupAmount) > 0 && (
              <div className="rounded-lg p-3 mb-4 flex items-center justify-between" style={{ background: "rgba(29,158,117,0.05)", border: "0.5px solid rgba(29,158,117,0.15)" }}>
                <span className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nouveau solde</span>
                <span className="font-syne font-bold" style={{ color: "#5DCAA5" }}>{formatFCFA((detailUser.balance || 0) + parseInt(topupAmount))}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowTopup(false); setTopupAmount(""); }}
                className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
              <button onClick={handleTopup} disabled={toppingUp || !topupAmount || parseInt(topupAmount) <= 0}
                className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
                style={{ background: "#D35400", color: "#fff" }}>
                {toppingUp ? "Rechargement..." : `Recharger ${topupAmount ? formatFCFA(parseInt(topupAmount)) : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user drawer */}
      <AdminDrawer open={!!editingUser} onClose={() => setEditingUser(null)} title={editingUser ? `Modifier ${editingUser.company_name || editingUser.name}` : ""}>
        {editingUser && (
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
                <input type={field.type} value={editingUser[field.key] || ""}
                  onChange={e => setEditingUser({ ...editingUser, [field.key]: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 font-dm text-sm focus:outline-none transition"
                  style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
            ))}
            <div>
              <label className="font-dm text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Solde (FCFA)</label>
              <input type="number" value={editingUser.balance || 0}
                onChange={e => setEditingUser({ ...editingUser, balance: Number(e.target.value) })}
                className="w-full rounded-xl px-4 py-2.5 font-dm text-sm focus:outline-none transition"
                style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <p className="font-dm text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Les ajustements sont loggés automatiquement</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
              <button onClick={handleSaveUser} className="flex-1 py-3 rounded-xl font-dm text-sm font-bold transition"
                style={{ background: "#D35400", color: "#fff" }}>Sauvegarder</button>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Bulk email overlay */}
      {showBulkEmail && (
        <BulkEmailModal count={selectedUsers.length}
          onSend={async (subject, message) => {
            try {
              await fetch("/api/superadmin/crm/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "send_invitation", userIds: selectedUsers, data: { subject, message } }),
              });
              showToast(`${selectedUsers.length} emails envoyés`, "success");
              setShowBulkEmail(false);
              setSelectedUsers([]);
            } catch { showToast("Erreur d'envoi", "error"); }
          }}
          onClose={() => setShowBulkEmail(false)} />
      )}

      {/* Bulk delete overlay */}
      {showBulkDelete && (
        <BulkDeleteModal count={selectedUsers.length}
          onDelete={async (reason) => {
            try {
              await fetch("/api/superadmin/crm/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete", userIds: selectedUsers, data: { reason } }),
              });
              showToast(`${selectedUsers.length} compte(s) supprimé(s)`, "success");
              setShowBulkDelete(false);
              setSelectedUsers([]);
              fetchData();
            } catch { showToast("Erreur de suppression", "error"); }
          }}
          onClose={() => setShowBulkDelete(false)} />
      )}
    </div>
  );
}

function BulkEmailModal({ count, onSend, onClose }: { count: number; onSend: (subject: string, message: string) => Promise<void>; onClose: () => void }) {
  const [subject, setSubject] = useState("Votre compte Tamtam vous attend !");
  const [message, setMessage] = useState("Connectez-vous pour découvrir les nouvelles fonctionnalités et lancer votre première campagne.");
  const [sending, setSending] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
        <h3 className="font-syne font-bold text-white mb-4">Envoyer un email à {count} utilisateur(s)</h3>
        <div className="space-y-3">
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Sujet"
            className="w-full rounded-xl px-4 py-2.5 font-dm text-sm focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" rows={4}
            className="w-full rounded-xl px-4 py-2.5 font-dm text-sm resize-none focus:outline-none transition"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
          <button onClick={async () => { setSending(true); await onSend(subject, message); }} disabled={sending}
            className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "#D35400", color: "#fff" }}>
            {sending ? "Envoi..." : `Envoyer à ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteModal({ count, onDelete, onClose }: { count: number; onDelete: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(226,75,74,0.2)" }} onClick={e => e.stopPropagation()}>
        <h3 className="font-syne font-bold mb-2" style={{ color: "#F09595" }}>Supprimer {count} compte(s)</h3>
        <p className="font-dm text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Action irréversible. Les données seront anonymisées.</p>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison de la suppression..."
          className="w-full rounded-xl px-4 py-2.5 font-dm text-sm mb-4 focus:outline-none transition"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>Annuler</button>
          <button onClick={async () => { setDeleting(true); await onDelete(reason); }} disabled={deleting || !reason}
            className="flex-1 py-2.5 rounded-xl font-dm text-sm font-bold transition disabled:opacity-50"
            style={{ background: "rgba(226,75,74,0.15)", color: "#F09595" }}>
            {deleting ? "Suppression..." : `Supprimer ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
