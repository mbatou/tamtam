"use client";

import { useState } from "react";

export default function BulkEmailModal({ count, onSend, onClose }: { count: number; onSend: (subject: string, message: string) => Promise<void>; onClose: () => void }) {
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
