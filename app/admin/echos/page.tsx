"use client";

import { useEffect, useState } from "react";
import { formatFCFA } from "@/lib/utils";

interface EchoWithStats {
  id: string;
  name: string;
  phone: string;
  city: string;
  mobile_money_provider: string;
  balance: number;
  total_earned: number;
  status: string;
  created_at: string;
  brand_clicks: number;
  brand_earned: number;
  campaign_count: number;
  campaign_names: string[];
}

export default function AdminEchosPage() {
  const [echos, setEchos] = useState<EchoWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEchos(); }, []);

  async function loadEchos() {
    const res = await fetch("/api/admin/echos");
    if (res.ok) {
      const data = await res.json();
      setEchos(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Échos</h1>
        <span className="text-sm text-white/40">{echos.length} écho{echos.length !== 1 ? "s" : ""} engagé{echos.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">#</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Nom</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Téléphone</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Ville</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Campagnes</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Clics</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Gagné (vous)</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {echos.map((echo, i) => (
                <tr key={echo.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? "bg-gradient-primary text-white" : "bg-white/5 text-white/40"}`}>{i + 1}</span>
                  </td>
                  <td className="px-5 py-4 font-semibold">{echo.name}</td>
                  <td className="px-5 py-4 text-white/60">{echo.phone}</td>
                  <td className="px-5 py-4 text-white/60">{echo.city || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold">{echo.campaign_count}</span>
                      <span className="text-[10px] text-white/30 line-clamp-1">{echo.campaign_names.join(", ")}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold">{echo.brand_clicks}</td>
                  <td className="px-5 py-4 text-accent font-bold">{formatFCFA(echo.brand_earned)}</td>
                  <td className="px-5 py-4 text-xs font-semibold">{echo.mobile_money_provider === "wave" ? "Wave" : echo.mobile_money_provider === "orange_money" ? "Orange Money" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {echos.length === 0 && <div className="p-8 text-center"><p className="text-white/30 text-sm">Aucun écho engagé dans vos campagnes pour le moment.</p></div>}
      </div>
    </div>
  );
}
