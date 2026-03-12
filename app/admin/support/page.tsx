"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: "open" | "replied" | "closed";
  admin_reply: string | null;
  created_at: string;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });

  const SUPPORT_SUBJECTS = [
    "Problème de paiement",
    "Problème avec ma campagne",
    "Problème de retrait",
    "Mon compte est bloqué",
    "Signaler un bug",
    "Question sur les tarifs",
    "Demande de fonctionnalité",
    "Autre",
  ];
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

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
      if (!res.ok) {
        setError(data.error || "Erreur");
      } else {
        setForm({ subject: "", message: "" });
        setSuccess(true);
        setShowForm(false);
        setTimeout(() => setSuccess(false), 5000);
        loadTickets();
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    }
    setSubmitting(false);
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = { open: "Ouvert", replied: "Répondu", closed: "Fermé" };
    return map[status] || status;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Support</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="btn-primary text-sm"
        >
          {showForm ? "Annuler" : "Nouveau message"}
        </button>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold flex items-center justify-between">
          <span>Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.</span>
          <button onClick={() => setSuccess(false)} className="text-emerald-400/60 hover:text-emerald-400 ml-4">x</button>
        </div>
      )}

      {/* New ticket form */}
      {showForm && (
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Envoyer un message au support</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Sujet *</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-[#1a1a2e]">Sélectionnez un sujet</option>
                {SUPPORT_SUBJECTS.map((s) => (
                  <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-2">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Décrivez votre problème ou votre question..."
                rows={5}
                maxLength={2000}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition resize-none"
              />
              <p className="text-xs text-white/20 mt-1 text-right">{form.message.length}/2000</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !form.subject || !form.message}
            className="btn-primary mt-4 disabled:opacity-40"
          >
            {submitting ? "Envoi en cours..." : "Envoyer"}
          </button>
        </div>
      )}

      {/* Tickets list */}
      {tickets.length === 0 && !showForm ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm mb-4">Aucun message envoyé pour le moment.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Contacter le support</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                className="w-full p-5 text-left flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge-${ticket.status === "open" ? "pending" : ticket.status === "replied" ? "active" : "completed"}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className="text-xs text-white/30">{timeAgo(ticket.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{ticket.subject}</h3>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-white/30 shrink-0 transition-transform ${expandedTicket === ticket.id ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {expandedTicket === ticket.id && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4">
                  <div className="mb-4">
                    <p className="text-xs text-white/40 font-semibold mb-1">Votre message</p>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{ticket.message}</p>
                  </div>
                  {ticket.admin_reply && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary font-semibold mb-1">Réponse du support</p>
                      <p className="text-sm text-white/70 whitespace-pre-wrap">{ticket.admin_reply}</p>
                    </div>
                  )}
                  {ticket.status === "open" && !ticket.admin_reply && (
                    <p className="text-xs text-white/30 italic">En attente de réponse...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
