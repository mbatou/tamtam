"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

interface Settings {
  platform_fee_percent: string;
  min_payout_fcfa: string;
  max_clicks_per_link_per_hour: string;
  ip_cooldown_hours: string;
  auto_reject_bots: string;
  auto_flag_high_volume: string;
  require_campaign_approval: string;
}

const defaultSettings: Settings = {
  platform_fee_percent: "25",
  min_payout_fcfa: "500",
  max_clicks_per_link_per_hour: "50",
  ip_cooldown_hours: "24",
  auto_reject_bots: "true",
  auto_flag_high_volume: "true",
  require_campaign_approval: "true",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from("platform_settings").select("*");
    if (data) {
      const s = { ...defaultSettings };
      data.forEach((row: { key: string; value: string }) => {
        if (row.key in s) {
          (s as Record<string, string>)[row.key] = row.value;
        }
      });
      setSettings(s);
    }
    setLoading(false);
  }

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("platform_settings").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: session?.user.id,
    });
    setSaving(false);
    showToast("Paramètre sauvegardé", "success");
  }

  function updateSetting(key: keyof Settings, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    saveSetting(key, value);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {ToastComponent}

      <h1 className="text-2xl font-bold mb-6">⚙️ Paramètres</h1>

      {/* Financial */}
      <section className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Paramètres financiers</h2>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/60">Commission plateforme</label>
              <span className="text-sm font-bold text-primary">{settings.platform_fee_percent}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={settings.platform_fee_percent}
              onChange={(e) => updateSetting("platform_fee_percent", e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>5%</span>
              <span>50%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/60">Paiement minimum</label>
              <span className="text-sm font-bold text-primary">{settings.min_payout_fcfa} FCFA</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={settings.min_payout_fcfa}
              onChange={(e) => updateSetting("min_payout_fcfa", e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>100 FCFA</span>
              <span>5 000 FCFA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Anti-fraud */}
      <section className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Anti-fraude</h2>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/60">Max clics / lien / heure</label>
              <span className="text-sm font-bold text-primary">{settings.max_clicks_per_link_per_hour}</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={settings.max_clicks_per_link_per_hour}
              onChange={(e) => updateSetting("max_clicks_per_link_per_hour", e.target.value)}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/60">Cooldown IP (heures)</label>
              <span className="text-sm font-bold text-primary">{settings.ip_cooldown_hours}h</span>
            </div>
            <input
              type="range"
              min="1"
              max="72"
              value={settings.ip_cooldown_hours}
              onChange={(e) => updateSetting("ip_cooldown_hours", e.target.value)}
              className="w-full accent-primary"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-white/5">
            <div>
              <span className="text-sm font-medium block">Rejeter bots automatiquement</span>
              <span className="text-xs text-white/30">Bloque les user-agents de type bot/curl/python</span>
            </div>
            <button
              onClick={() => updateSetting("auto_reject_bots", settings.auto_reject_bots === "true" ? "false" : "true")}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.auto_reject_bots === "true" ? "bg-accent" : "bg-white/10"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.auto_reject_bots === "true" ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-white/5">
            <div>
              <span className="text-sm font-medium block">Signaler haut volume</span>
              <span className="text-xs text-white/30">Flag automatiquement les IPs suspectes</span>
            </div>
            <button
              onClick={() => updateSetting("auto_flag_high_volume", settings.auto_flag_high_volume === "true" ? "false" : "true")}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.auto_flag_high_volume === "true" ? "bg-accent" : "bg-white/10"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.auto_flag_high_volume === "true" ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>
      </section>

      {/* Campaign settings */}
      <section className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Campagnes</h2>
        <div className="flex items-center justify-between py-3">
          <div>
            <span className="text-sm font-medium block">Approbation requise</span>
            <span className="text-xs text-white/30">Les campagnes doivent être approuvées avant activation</span>
          </div>
          <button
            onClick={() => updateSetting("require_campaign_approval", settings.require_campaign_approval === "true" ? "false" : "true")}
            className={`w-12 h-6 rounded-full transition-all ${
              settings.require_campaign_approval === "true" ? "bg-accent" : "bg-white/10"
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              settings.require_campaign_approval === "true" ? "translate-x-6" : "translate-x-0.5"
            }`} />
          </button>
        </div>
      </section>

      {saving && (
        <p className="text-xs text-white/30 text-center">Sauvegarde en cours...</p>
      )}
    </div>
  );
}
