"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function AdminEchosPage() {
  const [echos, setEchos] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadEchos(); }, []);

  async function loadEchos() {
    const { data } = await supabase.from("users").select("*").eq("role", "echo").order("total_earned", { ascending: false });
    setEchos(data || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-8">Échos</h1>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">#</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Nom</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Téléphone</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Ville</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Paiement</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Solde</th>
                <th className="text-left px-5 py-4 font-semibold text-white/40 text-xs uppercase">Total gagné</th>
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
                  <td className="px-5 py-4 text-xs font-semibold">{echo.mobile_money_provider === "wave" ? "Wave" : echo.mobile_money_provider === "orange_money" ? "Orange Money" : "—"}</td>
                  <td className="px-5 py-4">{formatFCFA(echo.balance)}</td>
                  <td className="px-5 py-4 text-accent font-bold">{formatFCFA(echo.total_earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {echos.length === 0 && <div className="p-8 text-center"><p className="text-white/30 text-sm">Aucun écho enregistré.</p></div>}
      </div>
    </div>
  );
}
