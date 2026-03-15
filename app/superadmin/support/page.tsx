"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import StatCard from "@/components/StatCard";
import Modal from "@/components/ui/Modal";
import Pagination, { paginate } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";

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

export default function SuperadminSupportPageWrapper() {
  return <Suspense><SuperadminSupportPageContent /></Suspense>;
}

function SuperadminSupportPageContent() {
  const { t } = useTranslation();
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
    const match = ticketList.find((t) => t.id === id);
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
      showToast(t("common.networkError"), "error");
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
          reply: t("superadmin.support.repliedTab"),
          close: t("superadmin.support.closedTab"),
          reopen: t("superadmin.support.openTab"),
        };
        showToast(messages[action], "success");
        setSelectedTicket(null);
        setReply("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || t("common.error"), "error");
      }
    } catch {
      showToast(t("common.networkError"), "error");
    }
    setSending(false);
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = { open: t("superadmin.support.openTab"), replied: t("superadmin.support.repliedTab"), closed: t("superadmin.support.closedTab") };
    return map[status] || status;
  }

  function getStatusBadge(status: string) {
    const map: Record<string, string> = { open: "pending", replied: "active", closed: "completed" };
    return map[status] || status;
  }

  function getRoleLabel(role: string) {
    const map: Record<string, string> = { batteur: "Batteur", echo: "Echo", admin: "Admin" };
    return map[role] || role;
  }

  const filteredTickets = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">{t("superadmin.support.title")}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("superadmin.support.title")} value={stats.total.toString()} accent="purple" />
        <StatCard label={t("superadmin.support.openTab")} value={stats.open.toString()} accent="red" />
        <StatCard label={t("superadmin.support.repliedTab")} value={stats.replied.toString()} accent="teal" />
        <StatCard label={t("superadmin.support.closedTab")} value={stats.closed.toString()} accent="orange" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {([
          { key: "open", label: t("superadmin.support.openTab"), count: stats.open },
          { key: "replied", label: t("superadmin.support.repliedTab"), count: stats.replied },
          { key: "closed", label: t("superadmin.support.closedTab"), count: stats.closed },
          { key: "all", label: t("superadmin.support.allTab"), count: stats.total },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${
              filter === tab.key ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                filter === tab.key ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets list */}
      {filteredTickets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h3 className="text-lg font-bold mb-1">{t("superadmin.support.noTicket", { status: filter !== "all" ? getStatusLabel(filter).toLowerCase() : "" })}</h3>
          <p className="text-sm text-white/40">
            {filter === "open" ? t("superadmin.support.allTicketsProcessed") : t("superadmin.support.noTicketInCategory")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginate(filteredTickets, page, PAGE_SIZE).map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => { setSelectedTicket(ticket); setReply(ticket.admin_reply || ""); }}
              className="glass-card p-4 flex items-start justify-between gap-4 hover:bg-white/5 transition cursor-pointer"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {ticket.users?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm truncate">{ticket.subject}</span>
                    <span className={`badge-${getStatusBadge(ticket.status)} shrink-0`}>{getStatusLabel(ticket.status)}</span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{ticket.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-white/30">{ticket.users?.name || "—"}</span>
                    <span className="text-xs text-white/15">·</span>
                    <span className="text-xs text-white/30">{getRoleLabel(ticket.users?.role || "")}</span>
                    <span className="text-xs text-white/15">·</span>
                    <span className="text-xs text-white/30">{timeAgo(ticket.created_at)}</span>
                  </div>
                </div>
              </div>
              {ticket.status === "open" && (
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0 mt-2 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}

      {filteredTickets.length > 0 && (
        <Pagination currentPage={page} totalItems={filteredTickets.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}

      {/* Ticket Detail Modal */}
      <Modal
        open={!!selectedTicket}
        onClose={() => { setSelectedTicket(null); setReply(""); }}
        title={t("superadmin.support.title")}
      >
        {selectedTicket && (
          <div className="space-y-4">
            {/* Sender info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-lg font-bold text-white">
                {selectedTicket.users?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <h3 className="font-bold">{selectedTicket.users?.name || "—"}</h3>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span>{getRoleLabel(selectedTicket.users?.role || "")}</span>
                  {selectedTicket.users?.phone && (
                    <>
                      <span>·</span>
                      <span>{selectedTicket.users.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Subject & date */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-sm">{selectedTicket.subject}</h4>
                <span className={`badge-${getStatusBadge(selectedTicket.status)}`}>{getStatusLabel(selectedTicket.status)}</span>
              </div>
              <p className="text-xs text-white/30">
                {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>

            {/* User message */}
            <div className="glass-card p-4">
              <p className="text-xs text-white/40 font-semibold mb-1">{t("superadmin.support.message")}</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            {/* Existing reply */}
            {selectedTicket.admin_reply && selectedTicket.status !== "open" && (
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                <p className="text-xs text-accent font-semibold mb-1">{t("superadmin.support.repliedTab")}</p>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                {selectedTicket.replied_at && (
                  <p className="text-xs text-white/20 mt-2">{timeAgo(selectedTicket.replied_at)}</p>
                )}
              </div>
            )}

            {/* Reply form (for open or replied tickets) */}
            {selectedTicket.status !== "closed" && (
              <div className="space-y-3 pt-2 border-t border-white/5">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t("superadmin.support.writeReply")}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(selectedTicket.id, "reply", reply)}
                    disabled={sending || !reply.trim()}
                    className="flex-1 py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent font-bold text-sm hover:bg-accent/20 transition disabled:opacity-40"
                  >
                    {sending ? t("common.sending") : selectedTicket.admin_reply ? t("common.update") : t("superadmin.support.repliedTab")}
                  </button>
                  <button
                    onClick={() => handleAction(selectedTicket.id, "close")}
                    disabled={sending}
                    className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:bg-white/10 transition disabled:opacity-40"
                  >
                    {t("common.close")}
                  </button>
                </div>
              </div>
            )}

            {/* Reopen for closed tickets */}
            {selectedTicket.status === "closed" && (
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => handleAction(selectedTicket.id, "reopen")}
                  disabled={sending}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:bg-white/10 transition disabled:opacity-40"
                >
                  {t("superadmin.support.openTab")}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
