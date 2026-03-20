"use client";

import { useEffect, useState, useCallback } from "react";
import StatCard from "@/components/StatCard";
import Pagination, { paginate } from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatFCFA, timeAgo } from "@/lib/utils";

const PAGE_SIZE = 30;

type ViewTab = "all" | "leads" | "brands" | "followups";
type ContactType = "lead" | "brand";
type Stage = "onboarding" | "active" | "at_risk" | "churned";
type LeadStatus = "new" | "contacted" | "invited" | "converted" | "rejected";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: ContactType;
  stage: string;
  tags: string[];
  created_at: string;
  stats: Record<string, unknown>;
}

interface Followup {
  id: string;
  contact_id: string;
  contact_type: string;
  content: string;
  followup_date: string;
  note_type: string;
}

interface TimelineEntry {
  type: string;
  date: string;
  data: Record<string, unknown>;
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  followup_date: string | null;
  created_at: string;
  author_name: string;
}

interface ContactDetail {
  contact: Record<string, unknown> & { type: ContactType; name?: string; crm_stage?: string; crm_tags?: string[]; tags?: string[] };
  campaigns?: { id: string; title: string; budget: number; spent: number; status: string; cpc: number; created_at: string }[];
  payments?: { id: string; amount: number; status: string; payment_method: string; created_at: string }[];
  tickets?: { id: string; subject: string; status: string; created_at: string }[];
  notes: Note[];
  timeline: TimelineEntry[];
}

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "onboarding", label: "Onboarding", color: "bg-blue-400/20 text-blue-400 border-blue-400/30" },
  { key: "active", label: "Actif", color: "bg-teal-400/20 text-teal-400 border-teal-400/30" },
  { key: "at_risk", label: "At Risk", color: "bg-orange-400/20 text-orange-400 border-orange-400/30" },
  { key: "churned", label: "Churned", color: "bg-red-400/20 text-red-400 border-red-400/30" },
];

const LEAD_STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "Nouveau", color: "bg-orange-400/20 text-orange-400 border-orange-400/30" },
  { key: "contacted", label: "Contacté", color: "bg-blue-400/20 text-blue-400 border-blue-400/30" },
  { key: "invited", label: "Invité", color: "bg-purple-400/20 text-purple-400 border-purple-400/30" },
  { key: "converted", label: "Converti", color: "bg-emerald-400/20 text-emerald-400 border-emerald-400/30" },
  { key: "rejected", label: "Rejeté", color: "bg-red-400/20 text-red-400 border-red-400/30" },
];

const NOTE_TYPES = [
  { key: "note", label: "Note", emoji: "📝" },
  { key: "call", label: "Appel", emoji: "📞" },
  { key: "followup", label: "Suivi", emoji: "📅" },
  { key: "email", label: "Email", emoji: "📧" },
  { key: "meeting", label: "Réunion", emoji: "🤝" },
];

function stageBadge(stage: string) {
  const s = STAGES.find(st => st.key === stage);
  if (!s) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/10">{stage}</span>;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>;
}

function contactTypeBadge(type: ContactType) {
  return type === "brand"
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-400 border border-purple-400/30">Brand</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">Lead</span>;
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ViewTab>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { showToast, ToastComponent } = useToast();

  // Note form
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [noteFollowup, setNoteFollowup] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // Tag input
  const [newTag, setNewTag] = useState("");

  // Lead conversion
  const [converting, setConverting] = useState(false);
  const [emailConflict, setEmailConflict] = useState<{ existing_role?: string; can_promote?: boolean } | null>(null);
  const [alternativeEmail, setAlternativeEmail] = useState("");
  const [conversionResult, setConversionResult] = useState<{ email: string } | null>(null);

  // Lead invitation (LUP-67)
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkInviting, setBulkInviting] = useState(false);
  const [inviteProgress, setInviteProgress] = useState(0);

  const fetchContacts = useCallback(() => {
    setLoading(true);
    fetch(`/api/superadmin/crm?view=${tab === "followups" ? "followups" : tab}`)
      .then(r => r.json())
      .then(d => {
        setContacts(d.contacts || []);
        setFollowups(d.followups || []);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [tab]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => { setPage(1); }, [tab, search, stageFilter]);

  async function openContact(id: string, type: ContactType) {
    setDetailLoading(true);
    setEmailConflict(null);
    setAlternativeEmail("");
    setConversionResult(null);
    try {
      const res = await fetch(`/api/superadmin/crm?id=${id}&type=${type}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedContact(data);
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setDetailLoading(false);
  }

  async function addNote() {
    if (!selectedContact || !noteContent.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_note",
          contact_id: selectedContact.contact.id,
          contact_type: selectedContact.contact.type,
          content: noteContent.trim(),
          note_type: noteType,
          followup_date: noteFollowup || null,
        }),
      });
      if (res.ok) {
        showToast("Note ajoutée", "success");
        setNoteContent("");
        setNoteType("note");
        setNoteFollowup("");
        // Refresh detail
        openContact(selectedContact.contact.id as string, selectedContact.contact.type);
      } else {
        const d = await res.json();
        showToast(d.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setNoteSaving(false);
  }

  async function deleteNote(noteId: string) {
    if (!selectedContact) return;
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_note", note_id: noteId }),
      });
      if (res.ok) {
        showToast("Note supprimée", "success");
        openContact(selectedContact.contact.id as string, selectedContact.contact.type);
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function updateStage(stage: Stage) {
    if (!selectedContact || selectedContact.contact.type !== "brand") return;
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_stage", user_id: selectedContact.contact.id, crm_stage: stage }),
      });
      if (res.ok) {
        showToast("Stage mis à jour", "success");
        setSelectedContact(prev => prev ? { ...prev, contact: { ...prev.contact, crm_stage: stage } } : null);
        fetchContacts();
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function updateTags(tags: string[]) {
    if (!selectedContact) return;
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_tags",
          contact_id: selectedContact.contact.id,
          contact_type: selectedContact.contact.type,
          tags,
        }),
      });
      if (res.ok) {
        showToast("Tags mis à jour", "success");
        const tagKey = selectedContact.contact.type === "brand" ? "crm_tags" : "tags";
        setSelectedContact(prev => prev ? { ...prev, contact: { ...prev.contact, [tagKey]: tags } } : null);
        fetchContacts();
      } else {
        showToast("Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  function addTag() {
    if (!newTag.trim() || !selectedContact) return;
    const currentTags = (selectedContact.contact.type === "brand" ? selectedContact.contact.crm_tags : selectedContact.contact.tags) || [];
    if (!currentTags.includes(newTag.trim())) {
      updateTags([...currentTags, newTag.trim()]);
    }
    setNewTag("");
  }

  function removeTag(tag: string) {
    if (!selectedContact) return;
    const currentTags = (selectedContact.contact.type === "brand" ? selectedContact.contact.crm_tags : selectedContact.contact.tags) || [];
    updateTags(currentTags.filter(t => t !== tag));
  }

  async function updateLeadStatus(status: LeadStatus) {
    if (!selectedContact || selectedContact.contact.type !== "lead") return;
    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_lead_status", lead_id: selectedContact.contact.id, status }),
      });
      if (res.ok) {
        showToast("Statut mis à jour", "success");
        setSelectedContact(prev => prev ? { ...prev, contact: { ...prev.contact, stage: status, status } } : null);
        fetchContacts();
      } else {
        const d = await res.json();
        showToast(d.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
  }

  async function convertLead(opts?: { overrideEmail?: string; promoteEcho?: boolean }) {
    if (!selectedContact || selectedContact.contact.type !== "lead") return;
    if (!opts && !confirm("Créer un compte Batteur pour ce lead ?")) return;
    setConverting(true);
    setEmailConflict(null);

    const payload: Record<string, unknown> = {
      action: "convert_lead",
      lead_id: selectedContact.contact.id,
    };
    if (opts?.overrideEmail) payload.email = opts.overrideEmail;
    if (opts?.promoteEcho) payload.promote_echo = true;

    try {
      const res = await fetch("/api/superadmin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setConversionResult({ email: data.email_used });
        setAlternativeEmail("");
        showToast("Lead converti avec succès !", "success");
        openContact(selectedContact.contact.id as string, selectedContact.contact.type);
        fetchContacts();
      } else if (res.status === 409 && data.email_conflict) {
        setEmailConflict({ existing_role: data.existing_role, can_promote: data.can_promote });
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setConverting(false);
  }

  // Lead invitation handlers (LUP-67)
  async function handleInviteLead(leadId: string) {
    setInvitingId(leadId);
    try {
      const res = await fetch("/api/superadmin/leads/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Invitation envoyée !", "success");
        fetchContacts();
      } else {
        showToast(data.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setInvitingId(null);
  }

  async function handleBulkInvite() {
    setBulkInviting(true);
    let progress = 0;
    for (const leadId of selectedLeads) {
      try {
        await fetch("/api/superadmin/leads/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });
        progress++;
        setInviteProgress(progress);
        await new Promise(r => setTimeout(r, 500));
      } catch { /* continue */ }
    }
    setBulkInviting(false);
    setSelectedLeads([]);
    setInviteProgress(0);
    fetchContacts();
    showToast(`${progress} invitation${progress > 1 ? "s" : ""} envoyée${progress > 1 ? "s" : ""} !`, "success");
  }

  // Filter contacts
  const filtered = contacts.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !(c.phone || "").toLowerCase().includes(q)) return false;
    }
    if (stageFilter !== "all" && c.stage !== stageFilter) return false;
    return true;
  });

  const paged = paginate(filtered, page, PAGE_SIZE);

  // Stats
  const totalBrands = contacts.filter(c => c.type === "brand").length;
  const totalLeads = contacts.filter(c => c.type === "lead").length;
  const upcomingFollowups = followups.length;

  const tabs: { key: ViewTab; label: string; count?: number }[] = [
    { key: "all", label: "Tous", count: contacts.length },
    { key: "brands", label: "Brands", count: totalBrands },
    { key: "leads", label: "Leads", count: totalLeads },
    { key: "followups", label: "Suivis", count: upcomingFollowups },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {ToastComponent}

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Pipeline</h1>
        <p className="text-sm text-white/40">Leads, contacts et suivi commercial</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Brands" value={totalBrands.toString()} accent="purple" />
        <StatCard label="Leads" value={totalLeads.toString()} accent="teal" />
        <StatCard label="Invités" value={contacts.filter(c => c.stage === "invited").length.toString()} accent="orange" />
        <StatCard label="Convertis" value={contacts.filter(c => c.stage === "converted").length.toString()} accent="teal" />
        <StatCard label="Taux conv." value={totalLeads > 0 ? `${Math.round((contacts.filter(c => c.stage === "converted").length / totalLeads) * 100)}%` : "0%"} accent="orange" />
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t.key ? "bg-gradient-primary text-white shadow-lg" : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-white/10"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {tab !== "followups" && (
          <div className="flex gap-2 items-center">
            {(tab === "leads" || tab === "all") && (
              <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeads(
                        filtered
                          .filter(l => l.type === "lead" && l.stage !== "converted" && l.stage !== "invited" && l.email)
                          .map(l => l.id)
                      );
                    } else {
                      setSelectedLeads([]);
                    }
                  }}
                  checked={selectedLeads.length > 0 && selectedLeads.length === filtered.filter(l => l.type === "lead" && l.stage !== "converted" && l.stage !== "invited" && l.email).length}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                Tout
              </label>
            )}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition w-48"
            />
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition"
            >
              <option value="all">Tous les stages</option>
              {STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
              <option value="new">Nouveau (Lead)</option>
              <option value="contacted">Contacté (Lead)</option>
              <option value="invited">Invité (Lead)</option>
              <option value="converted">Converti (Lead)</option>
              <option value="rejected">Rejeté (Lead)</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30">Chargement...</div>
      ) : tab === "followups" ? (
        /* Follow-ups View */
        <div className="space-y-3">
          {followups.length === 0 ? (
            <div className="text-center py-12 text-white/30">Aucun suivi à venir</div>
          ) : followups.map(f => (
            <div
              key={f.id}
              className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition"
              onClick={() => openContact(f.contact_id, f.contact_type as ContactType)}
            >
              <div className="w-10 h-10 rounded-full bg-orange-400/20 flex items-center justify-center text-lg shrink-0">
                📅
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{f.content}</p>
                <p className="text-xs text-white/40">
                  {contactTypeBadge(f.contact_type as ContactType)}
                  <span className="ml-2">{new Date(f.followup_date).toLocaleDateString("fr-FR")}</span>
                </p>
              </div>
              <div className="text-xs text-white/30 shrink-0">
                {NOTE_TYPES.find(nt => nt.key === f.note_type)?.emoji || "📝"} {NOTE_TYPES.find(nt => nt.key === f.note_type)?.label || f.note_type}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Contacts List */
        <>
          {/* Bulk invite bar (LUP-67) */}
          {selectedLeads.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4 flex items-center justify-between">
              <span className="text-orange-400 font-medium text-sm">
                {selectedLeads.length} lead{selectedLeads.length > 1 ? "s" : ""} sélectionné{selectedLeads.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={handleBulkInvite}
                disabled={bulkInviting}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {bulkInviting
                  ? `Envoi (${inviteProgress}/${selectedLeads.length})...`
                  : `Inviter ${selectedLeads.length} leads`}
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-white/30">Aucun contact trouvé</div>
          ) : (
            <div className="space-y-2">
              {paged.map(c => (
                <div
                  key={`${c.type}-${c.id}`}
                  className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition"
                >
                  {/* Checkbox for leads (LUP-67) */}
                  {c.type === "lead" && (
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(c.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) setSelectedLeads([...selectedLeads, c.id]);
                        else setSelectedLeads(selectedLeads.filter(id => id !== c.id));
                      }}
                      disabled={c.stage === "converted" || c.stage === "invited" || !c.email}
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div
                    className="flex items-center gap-4 flex-1 min-w-0"
                    onClick={() => openContact(c.id, c.type)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      c.type === "brand" ? "bg-purple-400/20 text-purple-400" : "bg-primary/20 text-primary"
                    }`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{c.name}</span>
                        {contactTypeBadge(c.type)}
                        {stageBadge(c.stage)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                        {c.email && <span>{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                        <span>{timeAgo(c.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">{tag}</span>
                    ))}
                    {c.tags.length > 2 && (
                      <span className="text-[10px] text-white/30">+{c.tags.length - 2}</span>
                    )}
                  </div>
                  {/* Invite button for leads (LUP-67) */}
                  {c.type === "lead" && c.stage !== "converted" && c.stage !== "invited" && c.email && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleInviteLead(c.id); }}
                      disabled={invitingId === c.id}
                      className="bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 disabled:opacity-50"
                    >
                      {invitingId === c.id ? "Envoi..." : "Inviter"}
                    </button>
                  )}
                  {c.type === "lead" && c.stage === "invited" && (
                    <span className="text-gray-500 text-xs shrink-0">Invité</span>
                  )}
                  {c.type === "lead" && c.stage === "converted" && (
                    <span className="text-green-400 text-xs shrink-0">Converti</span>
                  )}
                  {c.type === "brand" && (
                    <div className="hidden lg:flex items-center gap-4 text-xs text-white/40 shrink-0">
                      <span>{formatFCFA((c.stats.total_recharged as number) || 0)} rechargé</span>
                      <span>{(c.stats.campaigns as number) || 0} campagnes</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {/* Contact Detail Modal */}
      <Modal
        open={!!selectedContact && !detailLoading}
        onClose={() => setSelectedContact(null)}
        title={selectedContact?.contact.name as string || "Contact"}
      >
        {selectedContact && (
          <ContactDetailView
            detail={selectedContact}
            onUpdateStage={updateStage}
            onUpdateLeadStatus={updateLeadStatus}
            onConvertLead={convertLead}
            converting={converting}
            emailConflict={emailConflict}
            alternativeEmail={alternativeEmail}
            setAlternativeEmail={setAlternativeEmail}
            conversionResult={conversionResult}
            onAddNote={addNote}
            onDeleteNote={deleteNote}
            noteContent={noteContent}
            setNoteContent={setNoteContent}
            noteType={noteType}
            setNoteType={setNoteType}
            noteFollowup={noteFollowup}
            setNoteFollowup={setNoteFollowup}
            noteSaving={noteSaving}
            newTag={newTag}
            setNewTag={setNewTag}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        )}
      </Modal>

      {detailLoading && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40">
          <div className="text-white/60 text-sm">Chargement...</div>
        </div>
      )}
    </div>
  );
}

/* ============ Contact Detail View ============ */

function ContactDetailView({
  detail,
  onUpdateStage,
  onUpdateLeadStatus,
  onConvertLead,
  converting,
  emailConflict,
  alternativeEmail,
  setAlternativeEmail,
  conversionResult,
  onAddNote,
  onDeleteNote,
  noteContent,
  setNoteContent,
  noteType,
  setNoteType,
  noteFollowup,
  setNoteFollowup,
  noteSaving,
  newTag,
  setNewTag,
  onAddTag,
  onRemoveTag,
}: {
  detail: ContactDetail;
  onUpdateStage: (stage: Stage) => void;
  onUpdateLeadStatus: (status: LeadStatus) => void;
  onConvertLead: (opts?: { overrideEmail?: string; promoteEcho?: boolean }) => void;
  converting: boolean;
  emailConflict: { existing_role?: string; can_promote?: boolean } | null;
  alternativeEmail: string;
  setAlternativeEmail: (v: string) => void;
  conversionResult: { email: string } | null;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
  noteContent: string;
  setNoteContent: (v: string) => void;
  noteType: string;
  setNoteType: (v: string) => void;
  noteFollowup: string;
  setNoteFollowup: (v: string) => void;
  noteSaving: boolean;
  newTag: string;
  setNewTag: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}) {
  const { contact, timeline } = detail;
  const isBrand = contact.type === "brand";
  const isLead = contact.type === "lead";
  const currentTags = (isBrand ? contact.crm_tags : contact.tags) || [];

  return (
    <div className="space-y-6">
      {/* Contact Info */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
          isBrand ? "bg-purple-400/20 text-purple-400" : "bg-primary/20 text-primary"
        }`}>
          {(contact.name as string || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold">{contact.name as string}</h3>
            {contactTypeBadge(contact.type)}
          </div>
          <div className="text-xs text-white/40 mt-1 space-y-0.5">
            {contact.phone ? <p>Tel: {String(contact.phone)}</p> : null}
            {contact.email ? <p>Email: {String(contact.email)}</p> : null}
            {contact.city ? <p>Ville: {String(contact.city)}</p> : null}
            <p>Créé {timeAgo(contact.created_at as string)}</p>
          </div>
        </div>
      </div>

      {/* Brand Stats */}
      {isBrand && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{formatFCFA((contact.balance as number) || 0)}</p>
            <p className="text-[10px] text-white/40">Solde</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{formatFCFA((contact.total_recharged as number) || 0)}</p>
            <p className="text-[10px] text-white/40">Rechargé</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{detail.campaigns?.length || 0}</p>
            <p className="text-[10px] text-white/40">Campagnes</p>
          </div>
        </div>
      )}

      {/* Lead Info */}
      {isLead && (() => {
        const c = contact as Record<string, unknown>;
        return (
          <div className="space-y-2">
            {c.business_name ? (
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Entreprise</span>
                <span className="font-medium">{String(c.business_name)}</span>
              </div>
            ) : null}
            {c.message ? (
              <div>
                <p className="text-xs text-white/40 mb-1">Message</p>
                <p className="text-sm bg-white/5 rounded-xl p-3">{String(c.message)}</p>
              </div>
            ) : null}
            {c.notes ? (
              <div>
                <p className="text-xs text-white/40 mb-1">Notes internes</p>
                <p className="text-sm bg-white/5 rounded-xl p-3">{String(c.notes)}</p>
              </div>
            ) : null}
          </div>
        );
      })()}

      {/* Lead Pipeline */}
      {isLead && (
        <div>
          <p className="text-xs font-semibold text-white/40 mb-2">Statut du lead</p>
          <div className="flex gap-2 flex-wrap">
            {LEAD_STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => onUpdateLeadStatus(s.key)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                  contact.stage === s.key
                    ? s.color + " ring-1 ring-white/20"
                    : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lead Conversion */}
      {isLead && contact.stage !== "converted" && !conversionResult && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-400 mb-2">Convertir en Batteur</p>
          <button
            onClick={() => onConvertLead()}
            disabled={converting}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition disabled:opacity-40"
          >
            {converting ? "Création..." : "Créer le compte Batteur"}
          </button>
        </div>
      )}

      {/* Conversion Result */}
      {conversionResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-400 font-semibold">Compte Batteur créé !</p>
          <p className="text-xs text-white/50 mt-1">Identifiants envoyés à {conversionResult.email}</p>
        </div>
      )}

      {/* Email Conflict */}
      {emailConflict && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-3">
          <p className="text-sm text-orange-400 font-semibold">
            Email déjà utilisé par un compte {emailConflict.existing_role === "echo" ? "Echo" : emailConflict.existing_role || ""}
          </p>

          {emailConflict.can_promote && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
              <p className="text-xs text-blue-300">Ce compte Echo peut être promu en Batteur.</p>
              <button
                onClick={() => onConvertLead({ promoteEcho: true })}
                disabled={converting}
                className="w-full px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition disabled:opacity-40"
              >
                {converting ? "Promotion..." : "Promouvoir Echo → Batteur"}
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-white/40 mb-2">Ou utiliser un email différent :</p>
            <input
              type="email"
              value={alternativeEmail}
              onChange={e => setAlternativeEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition"
            />
            <button
              onClick={() => {
                if (!alternativeEmail || !alternativeEmail.includes("@")) return;
                onConvertLead({ overrideEmail: alternativeEmail });
              }}
              disabled={converting || !alternativeEmail}
              className="mt-2 w-full px-4 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 transition disabled:opacity-40"
            >
              {converting ? "Création..." : "Créer avec cet email"}
            </button>
          </div>
        </div>
      )}

      {/* Pipeline Stage (brands only) */}
      {isBrand && (
        <div>
          <p className="text-xs font-semibold text-white/40 mb-2">Pipeline Stage</p>
          <div className="flex gap-2 flex-wrap">
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => onUpdateStage(s.key)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                  contact.crm_stage === s.key
                    ? s.color + " ring-1 ring-white/20"
                    : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-white/40 mb-2">Tags</p>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {(currentTags as string[]).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="text-white/30 hover:text-red-400 ml-0.5">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onAddTag()}
            placeholder="Ajouter un tag..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary transition"
          />
          <button onClick={onAddTag} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 transition">
            +
          </button>
        </div>
      </div>

      {/* Add Note */}
      <div className="bg-white/5 rounded-xl p-4">
        <p className="text-xs font-semibold text-white/40 mb-3">Ajouter une note</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {NOTE_TYPES.map(nt => (
            <button
              key={nt.key}
              onClick={() => setNoteType(nt.key)}
              className={`text-xs px-2.5 py-1 rounded-lg transition ${
                noteType === nt.key ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {nt.emoji} {nt.label}
            </button>
          ))}
        </div>
        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          placeholder="Écrire une note..."
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition resize-none mb-2"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/40">Suivi le:</label>
            <input
              type="date"
              value={noteFollowup}
              onChange={e => setNoteFollowup(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary transition"
            />
          </div>
          <div className="flex-1" />
          <button
            onClick={onAddNote}
            disabled={noteSaving || !noteContent.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-primary text-white disabled:opacity-40 transition hover:opacity-90"
          >
            {noteSaving ? "..." : "Ajouter"}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-white/40 mb-3">Historique</p>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {timeline.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-4">Aucun historique</p>
          ) : timeline.map((entry, i) => (
            <TimelineItem key={i} entry={entry} onDelete={entry.type === "note" ? () => onDeleteNote(entry.data.id as string) : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ Timeline Item ============ */

function TimelineItem({ entry, onDelete }: { entry: TimelineEntry; onDelete?: () => void }) {
  const { type, date, data } = entry;

  let icon = "📌";
  let label = "";
  let detail = "";
  let color = "border-white/10";

  switch (type) {
    case "created":
      icon = "🎉";
      label = "Contact créé";
      color = "border-teal-400/30";
      break;
    case "lead_created":
      icon = "📩";
      label = "Lead reçu";
      detail = (data.business_name as string) || "";
      color = "border-primary/30";
      break;
    case "campaign":
      icon = "🥁";
      label = `Campagne: ${data.title}`;
      detail = `Budget ${formatFCFA((data.budget as number) || 0)} — ${data.status}`;
      color = "border-purple-400/30";
      break;
    case "payment":
      icon = "💰";
      label = `Paiement ${formatFCFA((data.amount as number) || 0)}`;
      detail = `${data.status} — ${data.payment_method || ""}`;
      color = "border-teal-400/30";
      break;
    case "ticket":
      icon = "💬";
      label = `Ticket: ${data.subject}`;
      detail = `${data.status}`;
      color = "border-orange-400/30";
      break;
    case "note": {
      const nt = NOTE_TYPES.find(n => n.key === data.note_type);
      icon = nt?.emoji || "📝";
      label = `${nt?.label || "Note"} par ${data.author_name || "Admin"}`;
      detail = data.content as string;
      color = "border-blue-400/30";
      break;
    }
  }

  return (
    <div className={`border-l-2 ${color} pl-4 py-1 relative`}>
      <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-[#12121f] border-2 border-white/20 flex items-center justify-center text-[8px]">
        {icon}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          {detail && <p className="text-xs text-white/40 mt-0.5 break-words">{detail}</p>}
          {data.followup_date ? (
            <p className="text-[10px] text-orange-400 mt-0.5">
              Suivi: {new Date(String(data.followup_date)).toLocaleDateString("fr-FR")}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-white/30">{timeAgo(date)}</span>
          {onDelete && (
            <button onClick={onDelete} className="text-[10px] text-red-400/50 hover:text-red-400 transition">
              suppr.
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
