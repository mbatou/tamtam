"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const SMS_TYPES = [
  { key: "new_campaign", label: "Nouvelle campagne", desc: "Notifie les echos d'une nouvelle campagne" },
  { key: "share_reminder", label: "Rappel de partage", desc: "Echos qui ont rejoint sans partager" },
  { key: "reengagement", label: "Reengagement", desc: "Echos dormants qui ont deja genere des clics" },
  { key: "streak_danger", label: "Streak en danger", desc: "Echos qui vont perdre leur serie" },
  { key: "campaign_ending", label: "Campagne bientot finie", desc: "Plus que 24h sur la campagne" },
  { key: "welcome", label: "Bienvenue", desc: "Nouveaux echos inscrits" },
] as const;

interface SmsLog {
  id: string;
  echo_id: string;
  phone: string;
  message: string;
  type: string;
  status: string;
  latency_ms: number | null;
  sent_at: string;
  error_message: string | null;
  mtarget_ticket: string | null;
}

interface Balance {
  amount?: string | null;
  currency?: string | null;
  error?: string;
}

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

export default function SmsDashboard() {
  const [selectedType, setSelectedType] = useState<string>("new_campaign");
  const [customMessage, setCustomMessage] = useState("");
  const [segment, setSegment] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [cpc, setCpc] = useState(50);
  const [hoursLeft, setHoursLeft] = useState(24);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [stats, setStats] = useState({ sentToday: 0, optouts: 0 });

  useEffect(() => {
    fetchBalance();
    fetchLogs();
    fetchStats();
  }, []);

  async function fetchBalance() {
    try {
      const res = await fetch("/api/sms/test", { credentials: "include" });
      const data = await res.json();
      setBalance(data);
    } catch {
      setBalance({ error: "Network error" });
    }
  }

  async function fetchLogs() {
    const supabase = createClient();
    const { data } = await supabase
      .from("sms_logs")
      .select("id, echo_id, phone, message, type, status, latency_ms, sent_at, error_message, mtarget_ticket")
      .order("sent_at", { ascending: false })
      .limit(20);
    setLogs((data as SmsLog[]) || []);
  }

  async function fetchStats() {
    const supabase = createClient();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await supabase
      .from("sms_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", today.toISOString());
    const { count: optouts } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("sms_optout", true);
    setStats({ sentToday: sentToday || 0, optouts: optouts || 0 });
  }

  function getPreviewMessage(): string {
    if (selectedType === "custom") {
      return (customMessage || "Votre message ici...")
        .replace("{{firstName}}", "Prenom")
        .replace("{{city}}", "Dakar");
    }
    const previews: Record<string, string> = {
      new_campaign: `TamTam: Salut Prenom! Nouvelle campagne disponible a Dakar. ${cpc} FCFA par clic verifie sur Wave. Rejoins -> tamma.me/echo/rythmes STOP 36180`,
      share_reminder: `TamTam: Prenom, t'as rejoint une campagne mais pas encore partage. Chaque clic = ${cpc} FCFA sur Wave. Lance-toi -> tamma.me/echo STOP 36180`,
      reengagement: "TamTam: Salut Prenom! Tu avais bien commence sur Tamtam. Une campagne t'attend a Dakar. Reprends -> tamma.me/echo/rythmes STOP 36180",
      streak_danger: "TamTam: Salut Prenom! Ta serie est en danger. Partage aujourd'hui pour garder ton streak et tes bonus -> tamma.me/echo STOP 36180",
      campaign_ending: `TamTam: Prenom, plus que ${hoursLeft}h sur ta campagne! Partage un max avant la fin. Chaque clic compte -> tamma.me/echo STOP 36180`,
      welcome: "TamTam: Bienvenue Prenom! Gagne de l'argent en partageant des liens sur ton Status. Premiere campagne -> tamma.me/echo/rythmes STOP 36180",
    };
    return previews[selectedType] || "";
  }

  async function handleSend() {
    setShowConfirm(false);
    setSending(true);
    setSendResult(null);
    try {
      const vars: Record<string, unknown> = { cpc };
      if (selectedType === "campaign_ending") vars.hoursLeft = hoursLeft;
      if (selectedType === "custom") vars.customMessage = customMessage;

      const cities = cityFilter.split(",").map((c) => c.trim()).filter(Boolean);

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: selectedType,
          segment,
          cityFilter: cities.length ? cities : undefined,
          vars,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      fetchLogs();
      fetchStats();
      fetchBalance();
    } catch {
      setSendResult({ sent: 0, failed: 0, skipped: 0, total: 0 });
    }
    setSending(false);
  }

  const preview = getPreviewMessage();

  return (
    <div className="flex flex-col gap-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#111128] border border-white/[0.07] rounded-[12px] p-3 text-center">
          <p className="text-[18px] font-bold text-[#5DCAA5]">{stats.sentToday}</p>
          <p className="text-[10px] text-white/30">SMS aujourd&apos;hui</p>
        </div>
        <div className="bg-[#111128] border border-white/[0.07] rounded-[12px] p-3 text-center">
          <p className="text-[18px] font-bold text-white/60">
            {logs.length > 0 ? `${Math.round((logs.filter((l) => l.status === "delivered" || l.status === "sent").length / logs.length) * 100)}%` : "-"}
          </p>
          <p className="text-[10px] text-white/30">Taux livraison</p>
        </div>
        <div className="bg-[#111128] border border-white/[0.07] rounded-[12px] p-3 text-center">
          <p className="text-[18px] font-bold text-[#F09595]">{stats.optouts}</p>
          <p className="text-[10px] text-white/30">Opt-outs</p>
        </div>
        <div className="bg-[#111128] border border-white/[0.07] rounded-[12px] p-3 text-center">
          <p className="text-[18px] font-bold text-[#1D9E75]">
            {balance?.amount ?? "..."} {balance?.currency || ""}
          </p>
          <p className="text-[10px] text-white/30">Credit mTarget</p>
          {balance?.error && <p className="text-[9px] text-[#F09595]">{balance.error}</p>}
        </div>
      </div>

      {/* Send panel */}
      <div className="bg-[#111128] border border-white/[0.07] rounded-[14px] p-4 flex flex-col gap-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/35">Envoyer des SMS</p>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2">
          {SMS_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              className={cn(
                "text-left px-3 py-2.5 rounded-[10px] border transition-all",
                selectedType === t.key
                  ? "bg-[rgba(211,84,0,0.08)] border-[rgba(211,84,0,0.3)]"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
              )}
            >
              <p className={cn("text-[12px] font-medium", selectedType === t.key ? "text-[#F0997B]" : "text-white/60")}>
                {t.label}
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">{t.desc}</p>
            </button>
          ))}
          <button
            onClick={() => setSelectedType("custom")}
            className={cn(
              "text-left px-3 py-2.5 rounded-[10px] border transition-all col-span-2",
              selectedType === "custom"
                ? "bg-[rgba(211,84,0,0.08)] border-[rgba(211,84,0,0.3)]"
                : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
            )}
          >
            <p className={cn("text-[12px] font-medium", selectedType === "custom" ? "text-[#F0997B]" : "text-white/60")}>
              Message personnalise
            </p>
            <p className="text-[10px] text-white/25 mt-0.5">{'Utilisez {{firstName}} et {{city}} comme variables'}</p>
          </button>
        </div>

        {/* Custom message textarea */}
        {selectedType === "custom" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-white/40">Message</label>
              <span className={cn("text-[10px] font-mono", customMessage.length > 160 ? "text-[#F09595]" : "text-white/30")}>
                {customMessage.length}/160
              </span>
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              placeholder="TamTam: {{firstName}}, votre message ici... STOP 36180"
              className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-3 py-2.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-[rgba(211,84,0,0.4)] resize-none font-mono"
            />
          </div>
        )}

        {/* Options row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">Segment</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-2 py-2 text-[12px] text-white outline-none"
            >
              <option value="all">Tous les echos</option>
              <option value="active">Actifs (clics &gt; 0)</option>
              <option value="dormant">Dormants (clics &gt; 10)</option>
              <option value="joined_no_clicks">Rejoint sans clics</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/30 mb-1 block">CPC (FCFA)</label>
            <input
              type="number"
              value={cpc}
              onChange={(e) => setCpc(parseInt(e.target.value) || 50)}
              className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-2 py-2 text-[12px] text-white outline-none font-mono"
            />
          </div>
          {selectedType === "campaign_ending" && (
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Heures restantes</label>
              <input
                type="number"
                value={hoursLeft}
                onChange={(e) => setHoursLeft(parseInt(e.target.value) || 24)}
                className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-2 py-2 text-[12px] text-white outline-none font-mono"
              />
            </div>
          )}
          <div className={selectedType === "campaign_ending" ? "" : ""}>
            <label className="text-[10px] text-white/30 mb-1 block">Villes (optionnel)</label>
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Dakar, Thies"
              className="w-full bg-[#141420] border border-white/[0.08] rounded-[8px] px-2 py-2 text-[12px] text-white placeholder-white/20 outline-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-[10px] text-white/25 mb-1.5">Apercu du message :</p>
          <div className="bg-[#141420] rounded-[10px] p-3 font-mono text-[11px] text-white/50 border border-white/[0.05]">
            {preview}
          </div>
          <p className={cn("text-[10px] font-mono mt-1", preview.length > 160 ? "text-[#F09595]" : "text-white/20")}>
            {preview.length}/160 chars
          </p>
        </div>

        {/* Send button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={sending || (selectedType === "custom" && (!customMessage || customMessage.length > 160))}
          className="w-full bg-[#D35400] text-white py-3 rounded-[10px] text-[13px] font-bold disabled:opacity-30 flex items-center justify-center gap-2 hover:brightness-110 transition"
        >
          {sending ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi en cours...</>
          ) : (
            <>Envoyer les SMS</>
          )}
        </button>

        {/* Confirm modal */}
        {showConfirm && (
          <div className="bg-[rgba(211,84,0,0.08)] border border-[rgba(211,84,0,0.2)] rounded-[10px] p-3">
            <p className="text-[12px] text-white/70 mb-2">
              Vous etes sur le point d&apos;envoyer des SMS de type &quot;{selectedType}&quot; au segment &quot;{segment}&quot;.
              Cette action ne peut pas etre annulee.
            </p>
            <div className="flex gap-2">
              <button onClick={handleSend} className="flex-1 bg-[#D35400] text-white text-[12px] font-bold py-2 rounded-[8px] hover:brightness-110 transition">
                Confirmer l&apos;envoi
              </button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-white/[0.05] text-white/50 text-[12px] py-2 rounded-[8px] hover:bg-white/[0.08] transition">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {sendResult && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[rgba(29,158,117,0.08)] rounded-[8px] p-2">
              <p className="text-[16px] font-bold text-[#5DCAA5]">{sendResult.sent}</p>
              <p className="text-[10px] text-white/30">Envoyes</p>
            </div>
            <div className="bg-[rgba(226,75,74,0.06)] rounded-[8px] p-2">
              <p className="text-[16px] font-bold text-[#F09595]">{sendResult.failed}</p>
              <p className="text-[10px] text-white/30">Echoues</p>
            </div>
            <div className="bg-white/[0.03] rounded-[8px] p-2">
              <p className="text-[16px] font-bold text-white/50">{sendResult.skipped}</p>
              <p className="text-[10px] text-white/30">Ignores</p>
            </div>
          </div>
        )}
      </div>

      {/* SMS logs */}
      {logs.length > 0 && (
        <div className="bg-[#111128] border border-white/[0.07] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/35">
              Logs SMS ({logs.length})
            </p>
            <button onClick={fetchLogs} className="text-[10px] text-white/30 hover:text-white/60 transition">
              Actualiser
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-white/25 text-left">
                  <th className="pb-2 pr-3 font-medium">Heure</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Phone</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Latence</th>
                  <th className="pb-2 font-medium">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-white/[0.04]">
                    <td className="py-2 pr-3 text-white/30">
                      {new Date(log.sent_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 pr-3 text-white/50">{log.type}</td>
                    <td className="py-2 pr-3 text-white/40 font-mono text-[10px]">{log.phone}</td>
                    <td className="py-2 pr-3">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        log.status === "sent" || log.status === "delivered" ? "text-[#5DCAA5] bg-[rgba(29,158,117,0.1)]" : "text-[#F09595] bg-[rgba(226,75,74,0.1)]"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-white/25 font-mono">{log.latency_ms ? `${log.latency_ms}ms` : "-"}</td>
                    <td className="py-2 text-white/20 font-mono text-[9px] truncate max-w-[100px]">{log.mtarget_ticket || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
