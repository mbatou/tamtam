"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";
import type { User, Payout } from "@/lib/types";

export default function EarningsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [userRes, payoutsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", session.user.id).single(),
      supabase.from("payouts").select("*").eq("echo_id", session.user.id).order("created_at", { ascending: false }),
    ]);

    if (userRes.data) setUser(userRes.data);
    if (payoutsRes.data) setPayouts(payoutsRes.data);
    setLoading(false);
  }

  async function requestPayout() {
    if (!user || user.balance < MIN_PAYOUT_AMOUNT) return;
    setRequesting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("payouts").insert({
      echo_id: session.user.id,
      amount: user.balance,
      provider: user.mobile_money_provider,
    });

    loadData();
    setRequesting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canWithdraw = (user?.balance || 0) >= MIN_PAYOUT_AMOUNT;
  const hasPendingPayout = payouts.some((p) => p.status === "pending");

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mes Gains</h1>

      {/* Balance card */}
      <div className="glass-card p-6 mb-6 bg-gradient-to-br from-accent/10 to-transparent">
        <p className="text-xs text-white/40 font-semibold mb-1">Solde disponible</p>
        <p className="text-4xl font-black mb-2">{formatFCFA(user?.balance || 0)}</p>
        <p className="text-xs text-white/30 mb-4">
          Total gagné: {formatFCFA(user?.total_earned || 0)}
        </p>

        {hasPendingPayout ? (
          <div className="p-3 rounded-xl bg-primary-light/10 border border-primary-light/20 text-sm text-primary-light">
            Un retrait est en cours de traitement...
          </div>
        ) : (
          <button
            onClick={requestPayout}
            disabled={!canWithdraw || requesting}
            className="btn-primary w-full text-center disabled:opacity-40"
          >
            {requesting
              ? "Envoi..."
              : `Retirer via ${user?.mobile_money_provider === "wave" ? "Wave" : "Orange Money"}`}
          </button>
        )}

        {!canWithdraw && !hasPendingPayout && (
          <p className="text-xs text-white/30 mt-3 text-center">
            Minimum de retrait: {formatFCFA(MIN_PAYOUT_AMOUNT)}
          </p>
        )}
      </div>

      {/* Payout history */}
      <h2 className="text-lg font-bold mb-4">Historique des retraits</h2>
      <div className="space-y-2">
        {payouts.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-white/30 text-sm">Aucun retrait effectué.</p>
          </div>
        ) : (
          payouts.map((payout) => (
            <div key={payout.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{formatFCFA(payout.amount)}</p>
                <p className="text-xs text-white/30">
                  via {payout.provider === "wave" ? "Wave" : "Orange Money"} · {timeAgo(payout.created_at)}
                </p>
              </div>
              <span className={`badge-${payout.status}`}>
                {payout.status === "pending"
                  ? "En attente"
                  : payout.status === "sent"
                  ? "Envoyé"
                  : "Échoué"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
