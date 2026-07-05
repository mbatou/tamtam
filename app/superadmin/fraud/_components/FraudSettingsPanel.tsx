"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

export default function FraudSettingsPanel({ onSave, saving }: { onSave: (s: Record<string, string>) => void; saving: boolean }) {
  const [cooldownHours, setCooldownHours] = useState("24");
  const [linkHourlyLimit, setLinkHourlyLimit] = useState("30");
  const [ipDailyLimit, setIpDailyLimit] = useState("8");
  const [speedSeconds, setSpeedSeconds] = useState("3");
  const [autoBlockDatacenter, setAutoBlockDatacenter] = useState(true);
  const [carrierProtection, setCarrierProtection] = useState(true);

  return (
    <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6 max-w-xl space-y-6">
      <h2 className="text-lg font-syne font-bold flex items-center gap-2">
        <Zap size={18} className="text-[#D35400]" />
        Paramètres anti-fraude
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Cooldown IP par lien (heures)</label>
          <input
            type="number"
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
          <p className="text-xs font-dm text-white/30 mt-1">Même IP + même lien = 1 clic valide par période</p>
        </div>

        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Limite de clics par lien / heure</label>
          <input
            type="number"
            value={linkHourlyLimit}
            onChange={(e) => setLinkHourlyLimit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
        </div>

        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Limite clics valides par IP / jour</label>
          <input
            type="number"
            value={ipDailyLimit}
            onChange={(e) => setIpDailyLimit(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
          <p className="text-xs font-dm text-white/30 mt-1">Maximum de clics valides par IP par jour (tous liens confondus)</p>
        </div>

        <div>
          <label className="text-xs font-dm text-white/50 block mb-1">Intervalle minimum entre clics (secondes)</label>
          <input
            type="number"
            value={speedSeconds}
            onChange={(e) => setSpeedSeconds(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-dm focus:outline-none focus:border-[#1D9E75]/50 transition"
          />
          <p className="text-xs font-dm text-white/30 mt-1">Clics plus rapides = bot automatisé</p>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-white/[0.05]">
          <div>
            <span className="text-sm font-dm">Blocage auto des IPs datacenter</span>
            <p className="text-xs font-dm text-white/30">Bloquer automatiquement les IPs identifiées comme datacenter</p>
          </div>
          <button
            onClick={() => setAutoBlockDatacenter(!autoBlockDatacenter)}
            className={`w-12 h-6 rounded-full transition-colors ${autoBlockDatacenter ? "bg-[#1D9E75]" : "bg-white/10"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoBlockDatacenter ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-white/[0.05]">
          <div>
            <span className="text-sm font-dm">Protection IPs opérateur</span>
            <p className="text-xs font-dm text-white/30">Empêcher le blocage des IPs CGNAT des opérateurs sénégalais (recommandé)</p>
          </div>
          <button
            onClick={() => setCarrierProtection(!carrierProtection)}
            className={`w-12 h-6 rounded-full transition-colors ${carrierProtection ? "bg-[#1D9E75]" : "bg-white/10"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${carrierProtection ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <button
        onClick={() => onSave({
          fraud_ip_cooldown_hours: cooldownHours,
          fraud_link_hourly_limit: linkHourlyLimit,
          fraud_ip_daily_valid_limit: ipDailyLimit,
          fraud_speed_check_seconds: speedSeconds,
          fraud_auto_block_datacenter: String(autoBlockDatacenter),
          fraud_carrier_ip_protection: String(carrierProtection),
        })}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-[#1D9E75]/20 border border-[#1D9E75]/30 text-[#1D9E75] text-sm font-dm font-bold hover:bg-[#1D9E75]/30 transition disabled:opacity-40"
      >
        {saving ? "Sauvegarde..." : "Enregistrer les paramètres"}
      </button>
    </div>
  );
}
