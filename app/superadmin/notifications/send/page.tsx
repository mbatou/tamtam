"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Mail, Loader2, ArrowLeft } from "lucide-react";
import { SENEGAL_CITIES } from "@/lib/cities";

export default function SendPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-white/40 text-sm">Chargement...</div>}>
      <SendPage />
    </Suspense>
  );
}

const NOTIFICATION_TYPES = [
  { id: "new_campaign", label: "Nouvelle campagne", icon: "🥁", desc: "Alerter les Échos qu'une nouvelle campagne est disponible", channels: ["push", "email"] },
  { id: "share_reminder", label: "Rappel de partage", icon: "📲", desc: "Rappeler aux Échos de partager les campagnes actives", channels: ["push"] },
  { id: "reengagement", label: "Réengagement", icon: "🔄", desc: "Relancer les Échos inactifs", channels: ["push", "email"] },
  { id: "streak_danger", label: "Streak en danger", icon: "🔥", desc: "Avertir les Échos dont le streak est en danger", channels: ["push"] },
  { id: "custom", label: "Message personnalisé", icon: "✏️", desc: "Écrire votre propre message", channels: ["push", "email"] },
];

const SEGMENTS = [
  { id: "all_active", label: "Tous les Échos actifs" },
  { id: "has_joined", label: "Ont rejoint ≥1 campagne" },
  { id: "no_clicks", label: "Joiné mais 0 clics" },
  { id: "dormant", label: "Dormants (>30j sans clics)" },
  { id: "ghosts", label: "Jamais engagés (>14j)" },
  { id: "streak_active", label: "Streak actif" },
  { id: "city", label: "Par ville" },
];

const DEFAULT_MESSAGES: Record<string, { title: string; body: string; url: string }> = {
  new_campaign: { title: "Nouvelle campagne disponible !", body: "Une campagne est disponible. Ouvre l'app pour participer.", url: "/rythmes" },
  share_reminder: { title: "Partagez et gagnez", body: "Ton lien attend d'être partagé — FCFA par clic vérifié", url: "/rythmes" },
  reengagement: { title: "Tu nous manques", body: "Des Échos à Dakar gagnent 15 000 FCFA/mois. Rejoins une campagne.", url: "/rythmes" },
  streak_danger: { title: "Ton streak est en danger", body: "Partage aujourd'hui pour ne pas perdre ta série !", url: "/dashboard" },
  custom: { title: "", body: "", url: "/rythmes" },
};

function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "";

  const [notifType, setNotifType] = useState(initialType);
  const [channels, setChannels] = useState<string[]>(["push"]);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/rythmes");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [segment, setSegment] = useState("all_active");
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<"now" | "smart" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [lang, setLang] = useState<"fr" | "en" | "both">("fr");

  const [audienceData, setAudienceData] = useState<{
    total: number; pushEligible: number; emailEligible: number; cappedCount: number; echoIds: string[];
  } | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ pushSent?: number; pushFailed?: number; pushSuppressed?: number; pushQueued?: number; emailSent: number; emailFailed: number } | null>(null);

  // Pre-fill defaults when type changes
  useEffect(() => {
    if (notifType && DEFAULT_MESSAGES[notifType]) {
      const d = DEFAULT_MESSAGES[notifType];
      setPushTitle(d.title);
      setPushBody(d.body);
      setPushUrl(d.url);
      if (notifType === "reengagement") {
        setEmailSubject("Des Échos gagnent 15 000 FCFA/mois");
        setSegment("ghosts");
      }
      const typeConfig = NOTIFICATION_TYPES.find((t) => t.id === notifType);
      if (typeConfig) {
        setChannels(typeConfig.channels.includes("push") ? ["push"] : typeConfig.channels);
      }
    }
  }, [notifType]);

  // Fetch audience whenever segment or city changes
  const fetchAudience = useCallback(async () => {
    setLoadingAudience(true);
    try {
      const res = await fetch("/api/superadmin/notifications/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, cityFilter: segment === "city" ? cityFilter : undefined }),
      });
      const data = await res.json();
      setAudienceData(data);
    } catch {
      setAudienceData(null);
    } finally {
      setLoadingAudience(false);
    }
  }, [segment, cityFilter]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  const handleSend = async () => {
    if (!audienceData || audienceData.echoIds.length === 0) return;
    setSending(true);

    try {
      const res = await fetch("/api/superadmin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          echoIds: audienceData.echoIds,
          channels,
          pushTitle,
          pushBody,
          pushUrl,
          emailSubject,
          emailBody,
          scheduledAt: schedule === "scheduled" ? scheduledAt : schedule,
          notificationType: notifType || "custom",
          lang,
        }),
      });
      const data = await res.json();
      setResult(data);
      setShowConfirm(false);
    } catch {
      setResult({ pushSent: 0, emailSent: 0, emailFailed: 0 });
    } finally {
      setSending(false);
    }
  };

  const isValid = notifType && (channels.includes("push") ? pushTitle : true) && (channels.includes("email") ? emailSubject : true) && audienceData && audienceData.echoIds.length > 0;

  if (result) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-20 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-bold text-white mb-2">Envoi terminé</h2>
        <div className="space-y-1 text-sm text-white/50 mb-6">
          {(result.pushSent || 0) > 0 && <p className="text-emerald-400">{result.pushSent} notifications push envoyées</p>}
          {(result.pushQueued || 0) > 0 && <p>{result.pushQueued} notifications push programmées</p>}
          {(result.pushSuppressed || 0) > 0 && <p className="text-white/30">{result.pushSuppressed} push supprimées (caps/pas d&apos;abonnement)</p>}
          {(result.pushFailed || 0) > 0 && <p className="text-red-400">{result.pushFailed} push échouées</p>}
          {result.emailSent > 0 && <p className="text-emerald-400">{result.emailSent} emails envoyés</p>}
          {result.emailFailed > 0 && <p className="text-red-400">{result.emailFailed} emails échoués</p>}
        </div>
        <button onClick={() => router.push("/superadmin/notifications")} className="px-6 py-2 rounded-xl bg-white/[0.06] text-white/70 text-sm hover:bg-white/[0.1] transition">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/superadmin/notifications")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
          <ArrowLeft size={16} className="text-white/40" />
        </button>
        <div>
          <h1 className="text-lg font-syne font-bold text-white">Composer une notification</h1>
          <p className="text-[11px] text-white/30">Envoyer une notification push ou email aux Échos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Compose */}
        <div className="lg:col-span-3 space-y-5">
          {/* Step 1: Type */}
          <Section title="1. Type de notification">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NOTIFICATION_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setNotifType(t.id)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition text-left ${
                    notifType === t.id
                      ? "border-[#D35400]/40 bg-[#D35400]/8"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-lg mt-0.5">{t.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{t.label}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Step 2: Channels */}
          {notifType && (
            <Section title="2. Canaux">
              <div className="flex gap-2">
                <ChannelToggle
                  active={channels.includes("push")}
                  onClick={() => setChannels((c) => c.includes("push") ? c.filter((x) => x !== "push") : [...c, "push"])}
                  icon={<Bell size={14} />}
                  label="Push PWA"
                />
                <ChannelToggle
                  active={channels.includes("email")}
                  onClick={() => setChannels((c) => c.includes("email") ? c.filter((x) => x !== "email") : [...c, "email"])}
                  icon={<Mail size={14} />}
                  label="Email"
                />
              </div>
            </Section>
          )}

          {/* Step 3: Message */}
          {notifType && channels.length > 0 && (
            <Section title="3. Message">
              {channels.includes("push") && (
                <div className="space-y-3 mb-4">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Push</p>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-white/50">Titre</label>
                      <span className={`text-[10px] ${pushTitle.length > 50 ? "text-red-400" : "text-white/20"}`}>{pushTitle.length}/50</span>
                    </div>
                    <input
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value.slice(0, 50))}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-[#D35400]/40 focus:outline-none"
                      placeholder="Titre de la notification"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[11px] text-white/50">Message</label>
                      <span className={`text-[10px] ${pushBody.length > 120 ? "text-red-400" : "text-white/20"}`}>{pushBody.length}/120</span>
                    </div>
                    <textarea
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value.slice(0, 120))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-[#D35400]/40 focus:outline-none resize-none"
                      placeholder="Corps du message"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">URL de destination</label>
                    <input
                      value={pushUrl}
                      onChange={(e) => setPushUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-[#D35400]/40 focus:outline-none"
                      placeholder="/rythmes"
                    />
                  </div>
                </div>
              )}
              {channels.includes("email") && (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Email</p>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Objet</label>
                    <input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-[#D35400]/40 focus:outline-none"
                      placeholder="Objet de l'email"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Corps (HTML ou texte)</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-[#D35400]/40 focus:outline-none resize-none font-mono"
                      placeholder="Contenu de l'email... Utilisez {{name}} pour le nom de l'Écho"
                    />
                  </div>
                </div>
              )}
              {/* Language */}
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Langue</p>
                <div className="flex gap-2">
                  {(["fr", "en", "both"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        lang === l ? "bg-[#D35400]/15 text-[#D35400] border border-[#D35400]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06]"
                      }`}
                    >
                      {l === "fr" ? "Français" : l === "en" ? "English" : "Les deux"}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Step 4: Audience */}
          {notifType && (
            <Section title="4. Audience">
              <div className="space-y-2">
                {SEGMENTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSegment(s.id); if (s.id !== "city") setCityFilter([]); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition text-left ${
                      segment === s.id ? "border-[#D35400]/40 bg-[#D35400]/8" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-xs text-white/70">{s.label}</span>
                  </button>
                ))}
              </div>
              {segment === "city" && (
                <div className="mt-3">
                  <p className="text-[11px] text-white/40 mb-2">Sélectionner les villes</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                    {SENEGAL_CITIES.map((city) => (
                      <button
                        key={city}
                        onClick={() => setCityFilter((prev) => prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city])}
                        className={`px-2 py-1.5 rounded-lg text-[11px] transition ${
                          cityFilter.includes(city) ? "bg-[#D35400]/15 text-[#D35400] border border-[#D35400]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06]"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Step 5: Scheduling */}
          {notifType && (
            <Section title="5. Programmation">
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: "now" as const, label: "Envoyer maintenant" },
                  { id: "smart" as const, label: "Timing intelligent" },
                  { id: "scheduled" as const, label: "Programmer" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSchedule(opt.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                      schedule === opt.id ? "bg-[#D35400]/15 text-[#D35400] border border-[#D35400]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {schedule === "smart" && (
                <p className="text-[10px] text-white/25 mt-2">Chaque Écho recevra la notification à son heure optimale, basée sur son historique d&apos;activité.</p>
              )}
              {schedule === "scheduled" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-[#D35400]/40 focus:outline-none"
                />
              )}
            </Section>
          )}

          {/* Send button */}
          {notifType && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isValid || sending}
              className="w-full bg-[#D35400] text-white py-4 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D35400]/90 transition"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Envoi en cours...
                </span>
              ) : (
                `Envoyer à ${audienceData?.total || 0} Écho${(audienceData?.total || 0) > 1 ? "s" : ""} →`
              )}
            </button>
          )}
        </div>

        {/* Right: Preview + Audience */}
        <div className="lg:col-span-2 space-y-4">
          {/* Push preview */}
          {channels.includes("push") && (
            <div className="rounded-2xl bg-[#1C1C1E] p-4 max-w-[320px]">
              <div className="flex justify-between text-[10px] text-white/40 mb-3">
                <span>9:41</span>
                <span>●●●</span>
              </div>
              <div className="bg-[#2C2C2E] rounded-xl p-3 flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D35400] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🥁</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{pushTitle || "Titre"}</p>
                  <p className="text-[11px] text-white/60 mt-0.5 line-clamp-2">{pushBody || "Message..."}</p>
                  <p className="text-[10px] text-white/30 mt-1">Tamtam · maintenant</p>
                </div>
              </div>
            </div>
          )}

          {/* Audience breakdown */}
          <div className="rounded-xl bg-[#111128] border border-white/[0.07] p-4">
            <p className="text-xs font-bold text-white mb-3">Audience sélectionnée</p>
            {loadingAudience ? (
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <Loader2 size={12} className="animate-spin" /> Calcul...
              </div>
            ) : audienceData ? (
              <>
                <p className="text-3xl font-black text-[#D35400]">{audienceData.total.toLocaleString("fr-FR")}</p>
                <p className="text-[11px] text-white/40">Échos éligibles</p>
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                  <StatRow label="Abonnés push" value={audienceData.pushEligible} />
                  <StatRow label="Email disponible" value={audienceData.emailEligible} />
                  <StatRow label="Cap journalier atteint" value={audienceData.cappedCount} color="text-[#F09595]" />
                </div>
              </>
            ) : (
              <p className="text-xs text-white/20">Sélectionnez un segment</p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-[#111128] border border-white/[0.1] rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-2">Confirmer l&apos;envoi</h3>
            <p className="text-xs text-white/50 mb-4">
              Vous êtes sur le point d&apos;envoyer une notification à <strong className="text-white">{audienceData?.total || 0}</strong> Échos.
              {channels.includes("push") && " Push activé."}
              {channels.includes("email") && " Email activé."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/50 text-xs hover:bg-white/[0.1] transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#D35400] text-white text-xs font-bold hover:bg-[#D35400]/90 transition disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Confirmer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <p className="text-xs font-bold text-white mb-3">{title}</p>
      {children}
    </div>
  );
}

function ChannelToggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${
        active ? "bg-[#D35400]/15 text-[#D35400] border border-[#D35400]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-white/40">{label}</span>
      <span className={color || "text-white/70"}>{value.toLocaleString("fr-FR")}</span>
    </div>
  );
}
