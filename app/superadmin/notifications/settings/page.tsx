"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  type: string;
  push_title: string | null;
  push_body: string | null;
  push_url: string | null;
  email_subject: string | null;
  email_body: string | null;
  lang: string;
  created_at: string;
}

interface Settings {
  quietStart: number;
  quietEnd: number;
  dailyCap: number;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ quietStart: 23, quietEnd: 6, dailyCap: 2 });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", type: "custom", push_title: "", push_body: "", push_url: "/rythmes", email_subject: "", email_body: "", lang: "fr" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, templatesRes] = await Promise.all([
        fetch("/api/superadmin/notifications/settings"),
        fetch("/api/superadmin/notifications/templates"),
      ]);
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/superadmin/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSuccess("Paramètres enregistrés");
      setTimeout(() => setSuccess(""), 3000);
    } catch {}
    setSaving(false);
  };

  const createTemplate = async () => {
    if (!newTemplate.name) return;
    try {
      const res = await fetch("/api/superadmin/notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });
      if (res.ok) {
        const t = await res.json();
        setTemplates((prev) => [t, ...prev]);
        setShowNewTemplate(false);
        setNewTemplate({ name: "", type: "custom", push_title: "", push_body: "", push_url: "/rythmes", email_subject: "", email_body: "", lang: "fr" });
      }
    } catch {}
  };

  const deleteTemplate = async (id: string) => {
    try {
      await fetch("/api/superadmin/notifications/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  if (loading) {
    return <div className="p-6 text-white/40 text-sm">Chargement...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/superadmin/notifications")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition">
          <ArrowLeft size={16} className="text-white/40" />
        </button>
        <div>
          <h1 className="text-lg font-syne font-bold text-white">Paramètres</h1>
          <p className="text-[11px] text-white/30">Heures silencieuses, caps et templates</p>
        </div>
      </div>

      {success && (
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {success}
        </div>
      )}

      {/* Quiet hours */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <p className="text-sm font-medium text-white mb-3">Heures silencieuses</p>
        <p className="text-[10px] text-white/30 mb-3">Aucune notification ne sera envoyée pendant ces heures</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">De</span>
          <select
            value={settings.quietStart}
            onChange={(e) => setSettings({ ...settings, quietStart: parseInt(e.target.value) })}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i}:00</option>
            ))}
          </select>
          <span className="text-xs text-white/50">à</span>
          <select
            value={settings.quietEnd}
            onChange={(e) => setSettings({ ...settings, quietEnd: parseInt(e.target.value) })}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i}:00</option>
            ))}
          </select>
        </div>
      </div>

      {/* Daily cap */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <p className="text-sm font-medium text-white mb-3">Maximum par Écho par jour</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={5}
            value={settings.dailyCap}
            onChange={(e) => setSettings({ ...settings, dailyCap: parseInt(e.target.value) || 2 })}
            className="w-16 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none text-center"
          />
          <span className="text-[11px] text-white/40">notifications/jour</span>
        </div>
      </div>

      {/* Save settings */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D35400] text-white text-xs font-bold hover:bg-[#D35400]/90 transition disabled:opacity-50"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Enregistrer les paramètres
      </button>

      {/* Templates */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-white">Templates de messages</p>
            <p className="text-[10px] text-white/30 mt-0.5">Messages pré-enregistrés réutilisables</p>
          </div>
          <button
            onClick={() => setShowNewTemplate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition text-xs text-white/50"
          >
            <Plus size={12} /> Nouveau
          </button>
        </div>

        {/* New template form */}
        {showNewTemplate && (
          <div className="mb-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Nom</label>
                <input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
                  placeholder="Mon template"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Type</label>
                <select
                  value={newTemplate.type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
                >
                  <option value="custom">Personnalisé</option>
                  <option value="new_campaign">Nouvelle campagne</option>
                  <option value="share_reminder">Rappel partage</option>
                  <option value="reengagement">Réengagement</option>
                  <option value="streak_danger">Streak danger</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Titre push</label>
              <input
                value={newTemplate.push_title}
                onChange={(e) => setNewTemplate({ ...newTemplate, push_title: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
                placeholder="Titre de la notification push"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 block mb-1">Corps push</label>
              <textarea
                value={newTemplate.push_body}
                onChange={(e) => setNewTemplate({ ...newTemplate, push_body: e.target.value })}
                rows={2}
                className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none resize-none"
                placeholder="Corps du message push"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Objet email</label>
                <input
                  value={newTemplate.email_subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, email_subject: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
                  placeholder="Sujet email"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 block mb-1">Langue</label>
                <select
                  value={newTemplate.lang}
                  onChange={(e) => setNewTemplate({ ...newTemplate, lang: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createTemplate} className="px-4 py-1.5 rounded-lg bg-[#D35400] text-white text-xs font-bold hover:bg-[#D35400]/90 transition">
                Créer
              </button>
              <button onClick={() => setShowNewTemplate(false)} className="px-4 py-1.5 rounded-lg bg-white/[0.06] text-white/40 text-xs hover:bg-white/[0.1] transition">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Existing templates */}
        <div className="space-y-2">
          {templates.length === 0 && !showNewTemplate && (
            <p className="text-xs text-white/20 py-4 text-center">Aucun template</p>
          )}
          {templates.map((t) => (
            <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-white">{t.name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">{t.type}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30">{t.lang.toUpperCase()}</span>
                </div>
                {t.push_title && <p className="text-[11px] text-white/40 truncate">{t.push_title}</p>}
                {t.push_body && <p className="text-[10px] text-white/25 truncate">{t.push_body}</p>}
              </div>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 transition flex-shrink-0"
              >
                <Trash2 size={12} className="text-red-400/50 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
