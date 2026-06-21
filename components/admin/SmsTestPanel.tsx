"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TEST_USER_ID = "846d55ca-1bb6-49fe-9462-cb3af1732bdd";
const TEST_PHONE = "+221766224151";

const TEMPLATES = [
  {
    label: "Nouvelle campagne",
    msg: "TAMTAM: Nouvelle campagne disponible a Dakar! Gagnez 50 FCFA par clic verifie. tamma.me STOP 36180",
  },
  {
    label: "Reengagement",
    msg: "TAMTAM: Des campagnes vous attendent! Gagnez 50 FCFA par clic sur Wave. tamma.me STOP 36180",
  },
  {
    label: "Paiement recu",
    msg: "TAMTAM: 3 750 FCFA envoyes sur votre Wave. Continuez a partager! tamma.me",
  },
  {
    label: "Fin de campagne",
    msg: "TAMTAM: Plus que 24h sur la campagne active! Partagez maintenant. tamma.me STOP 36180",
  },
];

interface SmsResult {
  success: boolean;
  ticket?: string;
  smsCount?: number;
  latencyMs?: number;
  error?: string;
  errorCode?: number;
  rawResponse?: string;
  logId?: string;
}

interface SmsLog {
  id: string;
  message: string;
  status: string;
  latency_ms: number | null;
  sent_at: string;
  error_message: string | null;
}

interface Balance {
  amount?: string | null;
  currency?: string | null;
  error?: string;
}

export default function SmsTestPanel() {
  const [message, setMessage] = useState(TEMPLATES[0].msg);
  const [sender, setSender] = useState("TamTam");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmsResult | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [logs, setLogs] = useState<SmsLog[]>([]);

  useEffect(() => {
    fetchBalance();
    fetchLogs();
  }, []);

  async function fetchBalance() {
    try {
      const res = await fetch("/api/sms/test", {
        credentials: "include",
      });
      const data = await res.json();
      setBalance(data);
    } catch {
      setBalance({ error: "Network error" });
    }
  }

  async function sendTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: TEST_PHONE,
          message,
          sender,
          notes,
          userId: TEST_USER_ID,
        }),
      });
      const data = await res.json();
      setResult(data);
      fetchLogs();
    } catch {
      setResult({ success: false, error: "Network error" });
    }
    setLoading(false);
  }

  async function fetchLogs() {
    const supabase = createClient();
    const { data } = await supabase
      .from("sms_test_logs")
      .select("id, message, status, latency_ms, sent_at, error_message")
      .order("sent_at", { ascending: false })
      .limit(10);
    setLogs((data as SmsLog[]) || []);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-white">SMS · Phase de test</h3>
            <span className="text-[10px] bg-[rgba(211,84,0,0.12)] text-[#F0997B] px-2 py-0.5 rounded-full font-medium">
              Georges uniquement
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-0.5">
            Test mTarget API &rarr; +221766224151 · Sender: TamTam
          </p>
        </div>
        <div className="bg-[#111128] border border-white/[0.07] rounded-[10px] px-3 py-2 text-right">
          <p className="text-[10px] text-white/30 uppercase tracking-wide">Credit mTarget</p>
          <p className="text-[14px] font-bold text-[#1D9E75]">
            {balance?.amount ?? "..."} {balance?.currency || ""}
          </p>
          {balance?.error && <p className="text-[10px] text-[#F09595]">{balance.error}</p>}
        </div>
      </div>

      {/* Target info */}
      <div className="bg-[rgba(29,158,117,0.06)] border border-[rgba(29,158,117,0.15)] rounded-[12px] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[rgba(29,158,117,0.15)] flex items-center justify-center text-[13px] font-bold text-[#5DCAA5]">
          G
        </div>
        <div>
          <p className="text-[13px] font-medium text-white">Georges DIEME</p>
          <p className="text-[11px] font-mono text-white/40">{TEST_PHONE}</p>
        </div>
        <span className="ml-auto text-[10px] text-[#5DCAA5] bg-[rgba(29,158,117,0.1)] px-2 py-0.5 rounded-full">
          Destinataire test
        </span>
      </div>

      {/* Message form */}
      <div className="bg-[#111128] border border-white/[0.07] rounded-[14px] p-4 flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/35">Message a tester</p>

        {/* Templates */}
        <div>
          <p className="text-[10px] text-white/25 mb-2">Templates :</p>
          <div className="flex flex-col gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => setMessage(t.msg)}
                className={cn(
                  "text-left text-[12px] px-3 py-2 rounded-[8px] border transition-all",
                  message === t.msg
                    ? "bg-[rgba(211,84,0,0.08)] border-[rgba(211,84,0,0.3)] text-[#F0997B]"
                    : "bg-white/[0.03] border-white/[0.07] text-white/50 hover:border-white/20"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-white/40">Message personnalise</label>
            <span className={cn(
              "text-[10px] font-mono",
              message.length > 160 ? "text-[#F09595]" :
              message.length > 140 ? "text-[#F0997B]" : "text-white/30"
            )}>
              {message.length}/160 chars
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-3 py-2.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-[rgba(211,84,0,0.4)] resize-none font-mono"
          />
          {message.length > 160 && (
            <p className="text-[11px] text-[#F09595] mt-1">Message trop long — 160 chars max pour SMS standard</p>
          )}
        </div>

        {/* Sender */}
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">
            Expediteur (max 11 chars · valide: TamTam)
          </label>
          <input
            type="text"
            value={sender}
            onChange={(e) => setSender(e.target.value.slice(0, 11))}
            maxLength={11}
            className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[rgba(211,84,0,0.4)] font-mono"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Notes (pour rapport mTarget)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Test template nouvelle campagne, operateur Free"
            className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-3 py-2.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-[rgba(211,84,0,0.4)]"
          />
        </div>

        {/* Send button */}
        <button
          onClick={sendTest}
          disabled={loading || !message || message.length > 160}
          className="w-full bg-[#D35400] text-white py-3 rounded-[10px] text-[13px] font-bold disabled:opacity-30 flex items-center justify-center gap-2 mt-1 hover:brightness-110 transition"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi en cours...</>
          ) : (
            <>Envoyer SMS de test &rarr; {TEST_PHONE}</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          "rounded-[12px] p-4 border",
          result.success
            ? "bg-[rgba(29,158,117,0.06)] border-[rgba(29,158,117,0.2)]"
            : "bg-[rgba(226,75,74,0.06)] border-[rgba(226,75,74,0.2)]"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold",
              result.success ? "bg-[#1D9E75]/20 text-[#5DCAA5]" : "bg-red-500/20 text-[#F09595]"
            )}>
              {result.success ? "✓" : "✗"}
            </div>
            <span className={cn(
              "text-[13px] font-bold",
              result.success ? "text-[#5DCAA5]" : "text-[#F09595]"
            )}>
              {result.success ? "SMS envoye — verifie ton telephone" : `Echec: ${result.error}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {result.ticket && (
              <div className="flex flex-col">
                <span className="text-white/30">Ticket mTarget</span>
                <span className="text-white/60 font-mono text-[10px]">{result.ticket}</span>
              </div>
            )}
            {result.latencyMs !== undefined && (
              <div className="flex flex-col">
                <span className="text-white/30">Latence API</span>
                <span className={cn(
                  "font-mono",
                  (result.latencyMs || 0) < 500 ? "text-[#5DCAA5]" :
                  (result.latencyMs || 0) < 1000 ? "text-[#F0997B]" : "text-[#F09595]"
                )}>
                  {result.latencyMs}ms
                </span>
              </div>
            )}
            {result.smsCount !== undefined && (
              <div className="flex flex-col">
                <span className="text-white/30">SMS segments</span>
                <span className="text-white/60">{result.smsCount}</span>
              </div>
            )}
            {result.errorCode !== undefined && (
              <div className="flex flex-col">
                <span className="text-white/30">Code erreur</span>
                <span className="text-[#F09595] font-mono">{result.errorCode}</span>
              </div>
            )}
          </div>

          {result.rawResponse && (
            <div className="mt-3">
              <p className="text-[10px] text-white/25 mb-1">Reponse brute mTarget:</p>
              <pre className="text-[10px] font-mono text-white/40 bg-white/[0.03] rounded-[6px] p-2 overflow-x-auto">
                {result.rawResponse}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Test history */}
      {logs.length > 0 && (
        <div className="bg-[#111128] border border-white/[0.07] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/35">
              Historique des tests ({logs.length})
            </p>
            <button onClick={fetchLogs} className="text-[10px] text-white/30 hover:text-white/60 transition">
              Actualiser
            </button>
          </div>
          <div className="flex flex-col gap-0">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  log.status === "sent" ? "bg-[#1D9E75]" : "bg-[#F09595]"
                )} />
                <span className="text-[11px] text-white/50 truncate flex-1">
                  {log.message.slice(0, 45)}...
                </span>
                {log.latency_ms && (
                  <span className="text-[10px] font-mono text-white/25 flex-shrink-0">{log.latency_ms}ms</span>
                )}
                <span className={cn(
                  "text-[10px] font-medium flex-shrink-0",
                  log.status === "sent" ? "text-[#5DCAA5]" : "text-[#F09595]"
                )}>
                  {log.status}
                </span>
                <span className="text-[10px] text-white/20 flex-shrink-0">
                  {new Date(log.sent_at).toLocaleTimeString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report checklist */}
      <div className="bg-[rgba(211,84,0,0.04)] border border-[rgba(211,84,0,0.12)] rounded-[12px] p-4">
        <p className="text-[11px] font-medium text-[#F0997B] mb-2">Ce qu&apos;on rapporte a mTarget apres les tests</p>
        <div className="flex flex-col gap-1 text-[11px] text-white/40">
          <span>&rarr; Route Senegal (+221) confirmee / non confirmee</span>
          <span>&rarr; Sender &quot;TamTam&quot; affiche correctement</span>
          <span>&rarr; Latence API moyenne</span>
          <span>&rarr; Code erreur si echec (-4 = pas de route +221)</span>
          <span>&rarr; Besoin: DLR webhook, tarif SMS Senegal, rechargement</span>
        </div>
      </div>
    </div>
  );
}
