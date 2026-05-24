"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import AdminStatCard from "@/components/superadmin/AdminStatCard";
import AdminBadge from "@/components/superadmin/AdminBadge";
import AdminDrawer from "@/components/superadmin/AdminDrawer";
import Pagination, { paginate } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { MessageSquare, Clock, CheckCircle2, Inbox, AlertCircle, Send, RotateCcw, X } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  users: { name: string; role: string; phone: string | null } | null;
}

interface Stats {
  total: number;
  open: number;
  replied: number;
  closed: number;
}

type FilterTab = "all" | "open" | "replied" | "closed";

const STATUS_MAP: Record<string, { badge: "pending" | "active" | "finished"; label: string }> = {
  open: { badge: "pending", label: "Ouvert" },
  replied: { badge: "active", label: "Répondu" },
  closed: { badge: "finished", label: "Fermé" },
};

const ROLE_LABELS: Record<string, string> = {
  batteur: "Batteur",
  echo: "Écho",
  admin: "Admin",
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "open", label: "Ouverts" },
  { key: "replied", label: "Répondus" },
  { key: "closed", label: "Fermés" },
  { key: "all", label: "Tous" },
];

export default function SuperadminSupportPageWrapper() {
  return <Suspense><SuperadminSupportPageContent /></Suspense>;
}

function SuperadminSupportPageContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, replied: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("open");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const { showToast, ToastComponent } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const openTicketById = useCallback((ticketList: Ticket[], id: string) => {
    const match = ticketList.find((tk) => tk.id === id);
    if (match) {
      setSelectedTicket(match);
      setReply(match.admin_reply || "");
      setFilter("all");
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/superadmin/support");
      const data = await res.json();
      setTickets(data.tickets || []);
      setStats(data.stats || { total: 0, open: 0, replied: 0, closed: 0 });
      if (highlightId) openTicketById(data.tickets || [], highlightId);
    } catch {
      showToast("Erreur réseau", "error");
    }
    setLoading(false);
  }

  async function handleAction(ticketId: string, action: "reply" | "close" | "reopen", replyText?: string) {
    setSending(true);
    try {
      const res = await fetch("/api/superadmin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId, action, reply: replyText }),
      });
      if (res.ok) {
        const messages: Record<string, string> = {
          reply: "Réponse envoyée",
          close: "Ticket fermé",
          reopen: "Ticket réouvert",
        };
        showToast(messages[action], "success");
        setSelectedTicket(null);
        setReply("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setSending(false);
  }

  function getSLAStatus(ticket: Ticket): { label: string; color: string } {
    if (ticket.status === "closed") return { label: "Résolu", color: "text-white/30" };
    const created = new Date(ticket.created_at).getTime();
    const now = Date.now();
    const hoursElapsed = (now - created) / (1000 * 60 * 60);
    if (hoursElapsed > 24) return { label: `${Math.floor(hoursElapsed)}h — SLA dépassé`, color: "text-red-400" };
    if (hoursElapsed > 12) return { label: `${Math.floor(hoursElapsed)}h — Urgent`, color: "text-yellow-400" };
    return { label: `${Math.floor(hoursElapsed)}h`, color: "text-white/40" };
  }

  const filteredTickets = filter === "all" ? tickets : tickets.filter((tk) => tk.status === filter);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-syne font-bold mb-6">Support</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="Total tickets" value={stats.total.toString()} icon={<MessageSquare size={18} />} accent="white" />
        <AdminStatCard label="Ouverts" value={stats.open.toString()} icon={<AlertCircle size={18} />} accent="red" />
        <AdminStatCard label="Répondus" value={stats.replied.toString()} icon={<CheckCircle2 size={18} />} accent="teal" />
        <AdminStatCard label="Fermés" value={stats.closed.toString()} icon={<Clock size={18} />} accent="orange" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const countMap: Record<string, number> = { open: stats.open, replied: stats.replied, closed: stats.closed, all: stats.total };
          const count = countMap[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-dm font-medium transition whitespace-nowrap flex items-center gap-2 ${
                filter === tab.key
                  ? "bg-[#D35400] text-white"
                  : "bg-[#111128] border border-white/[0.07] text-white/40 hover:bg-[#141420]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  filter === tab.key ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tickets list */}
      {filteredTickets.length === 0 ? (
        <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-12 text-center">
          <Inbox size={32} className="mx-auto mb-3 text-white/20" />
          <h3 className="text-lg font-syne font-bold mb-1">
            {filter !== "all" ? `Aucun ticket ${STATUS_MAP[filter]?.label.toLowerCase() || ""}` : "Aucun ticket"}
          </h3>
          <p className="text-sm font-dm text-white/40">
            {filter === "open" ? "Tous les tickets ont été traités" : "Aucun ticket dans cette catégorie"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginate(filteredTickets, page, PAGE_SIZE).map((ticket) => {
            const sla = getSLAStatus(ticket);
            return (
              <div
                key={ticket.id}
                onClick={() => { setSelectedTicket(ticket); setReply(ticket.admin_reply || ""); }}
                className="bg-[#111128] border border-white/[0.07] rounded-xl p-4 flex items-start justify-between gap-4 hover:bg-[#141420] transition cursor-pointer"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#D35400]/20 flex items-center justify-center text-sm font-syne font-bold text-[#D35400] shrink-0">
                    {ticket.users?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-syne font-bold text-sm truncate">{ticket.subject}</span>
                      <AdminBadge status={STATUS_MAP[ticket.status]?.badge || "pending"} label={STATUS_MAP[ticket.status]?.label || ticket.status} />
                    </div>
                    <p className="text-xs font-dm text-white/40 truncate">{ticket.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-dm text-white/30">{ticket.users?.name || "—"}</span>
                      <span className="text-xs text-white/15">·</span>
                      <span className="text-xs font-dm text-white/30">{ROLE_LABELS[ticket.users?.role || ""] || ticket.users?.role}</span>
                      <span className="text-xs text-white/15">·</span>
                      <span className="text-xs font-dm text-white/30">{timeAgo(ticket.created_at)}</span>
                      <span className="text-xs text-white/15">·</span>
                      <span className={`text-xs font-dm font-medium ${sla.color}`}>{sla.label}</span>
                    </div>
                  </div>
                </div>
                {ticket.status === "open" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0 mt-2 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredTickets.length > 0 && (
        <Pagination currentPage={page} totalItems={filteredTickets.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}

      {/* Ticket Detail Drawer */}
      <AdminDrawer
        open={!!selectedTicket}
        onClose={() => { setSelectedTicket(null); setReply(""); }}
        title="Détail du ticket"
        subtitle={selectedTicket?.subject}
        width="480px"
      >
        {selectedTicket && (
          <div className="space-y-5">
            {/* Sender info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D35400]/20 flex items-center justify-center text-lg font-syne font-bold text-[#D35400]">
                {selectedTicket.users?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="font-syne font-bold">{selectedTicket.users?.name || "—"}</h3>
                <div className="flex items-center gap-2 text-xs font-dm text-white/40">
                  <span>{ROLE_LABELS[selectedTicket.users?.role || ""] || selectedTicket.users?.role}</span>
                  {selectedTicket.users?.phone && (
                    <>
                      <span>·</span>
                      <span>{selectedTicket.users.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Subject & SLA */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-syne font-bold text-sm">{selectedTicket.subject}</h4>
                <AdminBadge status={STATUS_MAP[selectedTicket.status]?.badge || "pending"} label={STATUS_MAP[selectedTicket.status]?.label || selectedTicket.status} />
              </div>
              <div className="flex items-center gap-3 text-xs font-dm text-white/30">
                <span>
                  {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className={`font-medium ${getSLAStatus(selectedTicket).color}`}>
                  {getSLAStatus(selectedTicket).label}
                </span>
              </div>
            </div>

            {/* User message */}
            <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-4">
              <p className="text-xs font-dm text-white/40 font-semibold mb-1">Message</p>
              <p className="text-sm font-dm text-white/80 whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            {/* Existing reply */}
            {selectedTicket.admin_reply && selectedTicket.status !== "open" && (
              <div className="p-4 rounded-xl bg-[#1D9E75]/5 border border-[#1D9E75]/15">
                <p className="text-xs font-dm text-[#1D9E75] font-semibold mb-1">Réponse admin</p>
                <p className="text-sm font-dm text-white/70 whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                {selectedTicket.replied_at && (
                  <p className="text-xs font-dm text-white/20 mt-2">{timeAgo(selectedTicket.replied_at)}</p>
                )}
              </div>
            )}

            {/* Reply form */}
            {selectedTicket.status !== "closed" && (
              <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Écrire une réponse..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-dm focus:outline-none focus:border-[#D35400]/50 transition resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(selectedTicket.id, "reply", reply)}
                    disabled={sending || !reply.trim()}
                    className="flex-1 py-3 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/30 text-[#1D9E75] font-dm font-bold text-sm hover:bg-[#1D9E75]/20 transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    {sending ? "Envoi..." : selectedTicket.admin_reply ? "Mettre à jour" : "Répondre"}
                  </button>
                  <button
                    onClick={() => handleAction(selectedTicket.id, "close")}
                    disabled={sending}
                    className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/50 font-dm font-bold text-sm hover:bg-white/10 transition disabled:opacity-40 flex items-center gap-2"
                  >
                    <X size={14} />
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* Reopen for closed tickets */}
            {selectedTicket.status === "closed" && (
              <div className="pt-2 border-t border-white/[0.05]">
                <button
                  onClick={() => handleAction(selectedTicket.id, "reopen")}
                  disabled={sending}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 font-dm font-bold text-sm hover:bg-white/10 transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  Réouvrir le ticket
                </button>
              </div>
            )}
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
