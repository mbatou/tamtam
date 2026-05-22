"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  admin_reply: string | null;
  created_at: string;
}

const C = { background: "#111128", border: "0.5px solid rgba(255,255,255,0.06)" };
const INP: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" };

export default function AdminSupportPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const SUPPORT_SUBJECTS = [
    t("admin.support.paymentIssue"),
    t("admin.support.campaignIssue"),
    t("admin.support.withdrawIssue"),
    t("admin.support.blockedAccount"),
    t("admin.support.reportBug"),
    t("admin.support.pricingQuestion"),
    t("admin.support.featureRequest"),
    t("admin.support.other"),
  ];

  const FAQS = [
    { q: t("admin.support.faq1q"), a: t("admin.support.faq1a") },
    { q: t("admin.support.faq2q"), a: t("admin.support.faq2a") },
    { q: t("admin.support.faq3q"), a: t("admin.support.faq3a") },
    { q: t("admin.support.faq4q"), a: t("admin.support.faq4a") },
    { q: t("admin.support.faq5q"), a: t("admin.support.faq5a") },
    { q: t("admin.support.faq6q"), a: t("admin.support.faq6a") },
  ];

  useEffect(() => { loadTickets(); }, []);

  async function loadTickets() {
    const res = await fetch("/api/admin/support");
    if (res.ok) {
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("common.error")); }
      else {
        setForm({ subject: "", message: "" });
        setSuccess(true);
        setShowForm(false);
        setTimeout(() => setSuccess(false), 5000);
        loadTickets();
      }
    } catch { setError(t("common.networkRetry")); }
    setSubmitting(false);
  }

  const STATUS_CONFIG: Record<string, { dot: string; color: string; label: string }> = {
    open: { dot: "#EAB308", color: "#EAB308", label: t("common.open") },
    replied: { dot: "#1D9E75", color: "#1D9E75", label: t("common.replied") },
    closed: { dot: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.4)", label: t("common.closed") },
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
        <div className="mb-6">
          <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="space-y-3 max-w-2xl">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={C}>
              <div className="h-4 w-48 rounded mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-full rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">{t("admin.support.title")}</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] self-start"
          style={{ background: showForm ? "rgba(255,255,255,0.06)" : "#D35400", color: showForm ? "rgba(255,255,255,0.5)" : "white" }}
        >
          {showForm ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              {t("common.cancel")}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t("admin.support.newMessage")}
            </>
          )}
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold font-dm flex items-center justify-between" style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(29,158,117,0.15)", color: "#1D9E75" }}>
          <span>{t("admin.support.messageSent")}</span>
          <button onClick={() => setSuccess(false)} className="ml-4 hover:opacity-70 transition" style={{ color: "#1D9E75" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="max-w-2xl">
        {/* New ticket form */}
        {showForm && (
          <div className="rounded-2xl p-5 mb-6" style={C}>
            <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.support.sendMessage")}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.support.subject")}</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none appearance-none cursor-pointer"
                  style={INP}
                >
                  <option value="" disabled style={{ background: "#111128" }}>{t("admin.support.selectSubject")}</option>
                  {SUPPORT_SUBJECTS.map((s) => (
                    <option key={s} value={s} style={{ background: "#111128" }}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.support.message")}</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t("admin.support.messagePlaceholder")}
                  rows={5}
                  maxLength={2000}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white font-dm focus:outline-none resize-none"
                  style={INP}
                />
                <p className="text-[9px] font-dm mt-1 text-right" style={{ color: "rgba(255,255,255,0.2)" }}>{form.message.length}/2000</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2 rounded-lg text-[11px] font-dm" style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.15)", color: "#EF4444" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.subject || !form.message}
              className="mt-5 w-full py-3 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
              style={{ background: "#D35400" }}
            >
              {submitting ? t("common.sending") : t("common.send")}
            </button>
          </div>
        )}

        {/* Info cards: response time + WhatsApp */}
        {!showForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl p-5" style={C}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.support.responseTime")}</p>
                  <p className="text-sm font-bold font-syne text-white">{t("admin.support.responseTimeValue")}</p>
                </div>
              </div>
              <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.support.supportHours")}</p>
            </div>

            <a
              href="https://wa.me/221762799393?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20mon%20compte%20Tamtam"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl p-5 flex items-center gap-3 transition-all hover:scale-[1.01] group"
              style={C}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(29,158,117,0.1)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold font-syne text-white group-hover:text-[#1D9E75] transition">{t("admin.support.whatsappSupport")}</p>
                <p className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.support.whatsappSupportDesc")}</p>
              </div>
            </a>
          </div>
        )}

        {/* FAQ Section */}
        {!showForm && (
          <div className="rounded-2xl p-5 mb-6" style={C}>
            <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.support.faqTitle")}</p>
            <div className="space-y-1">
              {FAQS.map((faq, i) => (
                <div key={i}>
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center gap-2.5 py-3 text-left group"
                    style={{ borderBottom: i < FAQS.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span className="text-xs font-dm group-hover:text-white transition" style={{ color: "rgba(255,255,255,0.6)" }}>{faq.q}</span>
                  </button>
                  {expandedFaq === i && (
                    <p className="text-[11px] font-dm pl-[22px] pb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tickets list */}
        {tickets.length === 0 && !showForm ? (
          <div className="rounded-2xl py-14 text-center" style={C}>
            <div className="mx-auto mb-4">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-xs font-dm mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{t("admin.support.noMessages")}</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-dm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
              style={{ background: "#D35400" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              {t("admin.support.contactSupport")}
            </button>
          </div>
        ) : !showForm && (
          <div className="space-y-2">
            <p className="text-[10px] font-dm font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t("admin.support.yourMessage")}s</p>
            {tickets.map((ticket) => {
              const s = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              return (
                <div key={ticket.id} className="rounded-2xl overflow-hidden" style={C}>
                  <button
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                    className="w-full px-5 py-4 text-left flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-dm font-semibold px-2 py-0.5 rounded-full" style={{ background: `${s.dot}15`, color: s.color }}>
                          <span className="w-1 h-1 rounded-full" style={{ background: s.dot }} />
                          {s.label}
                        </span>
                        <span className="text-[10px] font-dm" style={{ color: "rgba(255,255,255,0.25)" }}>{timeAgo(ticket.created_at)}</span>
                      </div>
                      <h3 className="text-sm font-semibold font-dm text-white truncate">{ticket.subject}</h3>
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 mt-1 transition-transform ${expandedTicket === ticket.id ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {expandedTicket === ticket.id && (
                    <div className="px-5 pb-5 pt-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.04)" }}>
                      <div className="mb-4">
                        <p className="text-[9px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.support.yourMessage")}</p>
                        <p className="text-xs font-dm whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>{ticket.message}</p>
                      </div>
                      {ticket.admin_reply && (
                        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(211,84,0,0.05)", border: "0.5px solid rgba(211,84,0,0.1)" }}>
                          <p className="text-[9px] font-dm font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#D35400" }}>{t("admin.support.supportReply")}</p>
                          <p className="text-xs font-dm whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>{ticket.admin_reply}</p>
                        </div>
                      )}
                      {ticket.status === "open" && !ticket.admin_reply && (
                        <p className="text-[10px] font-dm italic" style={{ color: "rgba(255,255,255,0.25)" }}>{t("admin.support.waitingReply")}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
