"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import CrmKpiCards from "./_components/CrmKpiCards";
import PipelineStageTabs from "./_components/PipelineStageTabs";
import CrmFilterBar from "./_components/CrmFilterBar";
import BulkActionBar from "./_components/BulkActionBar";
import BrandTable from "./_components/BrandTable";
import BrandDetailDrawer from "./_components/BrandDetailDrawer";
import TopupModal from "./_components/TopupModal";
import EditUserDrawer from "./_components/EditUserDrawer";
import BulkEmailModal from "./_components/BulkEmailModal";
import BulkDeleteModal from "./_components/BulkDeleteModal";
import { BrandDetail, BrandUser, CRMData, CRMNote, DetailTab } from "./_components/types";

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
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  // Ref so fetchData can show a toast without depending on the (unstable)
  // showToast identity, which would re-trigger the fetch effect every render.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "brands", search, city: cityFilter, status: stageFilter, page: String(page) });
      const res = await fetch(`/api/superadmin/crm?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      showToastRef.current("Erreur de chargement", "error");
    }
    setLoading(false);
  }, [search, cityFilter, stageFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchNotes = useCallback(async (userId: string) => {
    setDetailNotesLoading(true);
    try {
      const res = await fetch(`/api/superadmin/crm/notes?contact_id=${userId}&contact_type=brand`);
      if (res.ok) setDetailNotes(await res.json());
    } catch (err) {
      console.error("[crm] fetchNotes failed", err);
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
    } catch (err) {
      console.error("[crm] fetchBrandDetail failed", err);
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

  const handleBulkEmail = async (subject: string, message: string) => {
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
  };

  const handleBulkDelete = async (reason: string) => {
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
  };

  const stageCounts = data.stageCounts || { registered: 0, recharged: 0, first_campaign: 0, repeat: 0, vip: 0 };

  return (
    <div className="p-6 max-w-[1400px]">
      {ToastComponent}

      <CrmKpiCards total={data.total} stageCounts={stageCounts} />

      <PipelineStageTabs
        total={data.total}
        stageCounts={stageCounts}
        stageFilter={stageFilter}
        onSelectStage={key => { setStageFilter(key); setPage(1); }}
      />

      {/* Search + filters + bulk */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <CrmFilterBar
          search={search}
          cityFilter={cityFilter}
          onSearchChange={value => { setSearch(value); setPage(1); }}
          onCityChange={value => { setCityFilter(value); setPage(1); }}
        />
        {selectedUsers.length > 0 && (
          <BulkActionBar
            selectedCount={selectedUsers.length}
            onEmail={() => setShowBulkEmail(true)}
            onDelete={() => setShowBulkDelete(true)}
            onExport={handleExport}
          />
        )}
      </div>

      <BrandTable
        users={data.users}
        loading={loading}
        total={data.total}
        page={page}
        onPageChange={setPage}
        selection={{ selected: selectedUsers, onToggle: toggleSelect, onSelectAll: selectAll }}
        rowActions={{
          onOpenDetail: openDetail,
          onEdit: setEditingUser,
          onInvestigate: userId => router.push(`/superadmin/users?id=${userId}`),
        }}
      />

      <BrandDetailDrawer
        user={detailUser}
        tab={detailTab}
        onTabChange={setDetailTab}
        onClose={() => setDetailUser(null)}
        detail={{ data: brandDetail, loading: brandDetailLoading }}
        notes={{
          notes: detailNotes,
          loading: detailNotesLoading,
          newNote,
          onNewNoteChange: setNewNote,
          newNoteType,
          onNewNoteTypeChange: setNewNoteType,
          onAdd: handleAddNote,
          onDelete: handleDeleteNote,
        }}
        onUpdateTags={handleUpdateTags}
        actions={{
          onTopup: () => setShowTopup(true),
          onEdit: user => { setDetailUser(null); setEditingUser(user); },
          onInvestigate: userId => { setDetailUser(null); router.push(`/superadmin/users?id=${userId}`); },
        }}
      />

      {showTopup && detailUser && (
        <TopupModal
          user={detailUser}
          amount={topupAmount}
          onAmountChange={setTopupAmount}
          toppingUp={toppingUp}
          onConfirm={handleTopup}
          onCancel={() => { setShowTopup(false); setTopupAmount(""); }}
          onClose={() => setShowTopup(false)}
        />
      )}

      <EditUserDrawer
        user={editingUser}
        onChange={setEditingUser}
        onSave={handleSaveUser}
        onClose={() => setEditingUser(null)}
      />

      {showBulkEmail && (
        <BulkEmailModal count={selectedUsers.length} onSend={handleBulkEmail} onClose={() => setShowBulkEmail(false)} />
      )}

      {showBulkDelete && (
        <BulkDeleteModal count={selectedUsers.length} onDelete={handleBulkDelete} onClose={() => setShowBulkDelete(false)} />
      )}
    </div>
  );
}
