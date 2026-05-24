"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Settings, DollarSign, Shield, Megaphone, Users, Activity } from "lucide-react";

interface SettingsData {
  platform_fee_percent: string;
  min_payout_fcfa: string;
  referral_program_enabled: string;
  max_clicks_per_link_per_hour: string;
  ip_cooldown_hours: string;
  auto_reject_bots: string;
  auto_flag_high_volume: string;
  require_campaign_approval: string;
}

interface Admin {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  created_at: string;
}

interface LogEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
  users: { name: string } | null;
}

const defaultSettings: SettingsData = {
  platform_fee_percent: "25",
  min_payout_fcfa: "1000",
  referral_program_enabled: "true",
  max_clicks_per_link_per_hour: "50",
  ip_cooldown_hours: "24",
  auto_reject_bots: "true",
  auto_flag_high_volume: "true",
  require_campaign_approval: "true",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/superadmin/settings");
      const data = await res.json();
      const s = { ...defaultSettings };
      (data.settings || []).forEach((row: { key: string; value: string }) => {
        if (row.key in s) {
          (s as Record<string, string>)[row.key] = row.value;
        }
      });
      setSettings(s);
      setAdmins(data.admins || []);
      setLogs(data.recentLogs || []);
    } catch {
      showToast("Erreur de chargement", "error");
    }
    setLoading(false);
  }

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        showToast("Paramètre sauvegardé", "success");
      } else {
        showToast("Erreur de sauvegarde", "error");
      }
    } catch {
      showToast("Erreur réseau", "error");
    }
    setSaving(false);
  }

  function updateSetting(key: keyof SettingsData, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    saveSetting(key, value);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded-xl bg-white/5 animate-pulse" />
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {ToastComponent}

      <h1 className="text-2xl font-syne font-bold mb-6 flex items-center gap-3">
        <Settings size={24} className="text-[#D35400]" />
        Paramètres
      </h1>

      {/* Financial */}
      <section className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-syne font-bold mb-4 flex items-center gap-2">
          <DollarSign size={18} className="text-[#D35400]" />
          Financier
        </h2>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-dm font-medium text-white/60">Commission plateforme</label>
              <span className="text-sm font-syne font-bold text-[#D35400]">{settings.platform_fee_percent}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={settings.platform_fee_percent}
              onChange={(e) => updateSetting("platform_fee_percent", e.target.value)}
              className="w-full accent-[#D35400]"
            />
            <div className="flex justify-between text-xs font-dm text-white/30 mt-1">
              <span>5%</span>
              <span>50%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-dm font-medium text-white/60">Retrait minimum</label>
              <span className="text-sm font-syne font-bold text-[#D35400]">{settings.min_payout_fcfa} FCFA</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={settings.min_payout_fcfa}
              onChange={(e) => updateSetting("min_payout_fcfa", e.target.value)}
              className="w-full accent-[#D35400]"
            />
            <div className="flex justify-between text-xs font-dm text-white/30 mt-1">
              <span>100 FCFA</span>
              <span>5 000 FCFA</span>
            </div>
          </div>
          <ToggleSetting
            label="Programme de parrainage"
            description="Activer les bonus de parrainage pour les utilisateurs"
            value={settings.referral_program_enabled === "true"}
            onChange={(v) => updateSetting("referral_program_enabled", v ? "true" : "false")}
          />
        </div>
      </section>

      {/* Anti-fraud */}
      <section className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-syne font-bold mb-4 flex items-center gap-2">
          <Shield size={18} className="text-[#1D9E75]" />
          Anti-fraude
        </h2>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-dm font-medium text-white/60">Clics max par lien / heure</label>
              <span className="text-sm font-syne font-bold text-[#D35400]">{settings.max_clicks_per_link_per_hour}</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={settings.max_clicks_per_link_per_hour}
              onChange={(e) => updateSetting("max_clicks_per_link_per_hour", e.target.value)}
              className="w-full accent-[#D35400]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-dm font-medium text-white/60">Cooldown IP</label>
              <span className="text-sm font-syne font-bold text-[#D35400]">{settings.ip_cooldown_hours}h</span>
            </div>
            <input
              type="range"
              min="1"
              max="72"
              value={settings.ip_cooldown_hours}
              onChange={(e) => updateSetting("ip_cooldown_hours", e.target.value)}
              className="w-full accent-[#D35400]"
            />
          </div>

          <ToggleSetting
            label="Rejeter les bots automatiquement"
            description="Bloquer les clics avec user-agent de bot connu"
            value={settings.auto_reject_bots === "true"}
            onChange={(v) => updateSetting("auto_reject_bots", v ? "true" : "false")}
          />
          <ToggleSetting
            label="Alerter sur volume élevé"
            description="Signaler les IPs avec un nombre anormalement élevé de clics"
            value={settings.auto_flag_high_volume === "true"}
            onChange={(v) => updateSetting("auto_flag_high_volume", v ? "true" : "false")}
          />
        </div>
      </section>

      {/* Campaign settings */}
      <section className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-syne font-bold mb-4 flex items-center gap-2">
          <Megaphone size={18} className="text-[#D35400]" />
          Campagnes
        </h2>
        <ToggleSetting
          label="Approbation requise"
          description="Les campagnes nécessitent une validation admin avant diffusion"
          value={settings.require_campaign_approval === "true"}
          onChange={(v) => updateSetting("require_campaign_approval", v ? "true" : "false")}
        />
      </section>

      {/* Admins */}
      <section className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-syne font-bold mb-4 flex items-center gap-2">
          <Users size={18} className="text-[#D35400]" />
          Administrateurs ({admins.length})
        </h2>
        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D35400]/20 flex items-center justify-center text-xs font-syne font-bold text-[#D35400]">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-dm font-semibold">{admin.name}</div>
                  <div className="text-xs font-dm text-white/30">{admin.phone || ""}</div>
                </div>
              </div>
              <span className={`text-xs font-dm font-bold px-2 py-1 rounded-full ${
                admin.role === "superadmin" ? "bg-red-500/10 text-red-400" : "bg-purple-500/10 text-purple-400"
              }`}>
                {admin.role}
              </span>
            </div>
          ))}
          {admins.length === 0 && <p className="text-xs font-dm text-white/30">Aucun administrateur</p>}
        </div>
      </section>

      {/* Activity Log */}
      <section className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-syne font-bold mb-4 flex items-center gap-2">
          <Activity size={18} className="text-[#1D9E75]" />
          Actions récentes
        </h2>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
              <div>
                <div className="text-sm font-dm font-semibold">{log.users?.name || "—"}</div>
                <div className="text-xs font-dm text-white/30">
                  {log.action} · {log.target_type}: {log.target_id?.substring(0, 8)}...
                </div>
              </div>
              <span className="text-xs font-dm text-white/30">{timeAgo(log.created_at)}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-xs font-dm text-white/30">Aucune activité récente</p>}
        </div>
      </section>

      {saving && (
        <p className="text-xs font-dm text-white/30 text-center">Sauvegarde en cours...</p>
      )}
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-t border-white/[0.05]">
      <div>
        <span className="text-sm font-dm font-medium block">{label}</span>
        <span className="text-xs font-dm text-white/30">{description}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all ${value ? "bg-[#1D9E75]" : "bg-white/10"}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
          value ? "translate-x-6" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}
