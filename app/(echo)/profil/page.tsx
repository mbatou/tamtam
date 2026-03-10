"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single();
    if (data) setUser(data);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon Profil</h1>

      <div className="glass-card p-6 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-black mb-4">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-sm text-white/40">{user?.phone}</p>
        {user?.city && <p className="text-sm text-white/30">{user.city}</p>}
      </div>

      <div className="glass-card p-6 mb-6 space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Moyen de paiement</span>
          <span className="text-sm font-semibold">
            {user?.mobile_money_provider === "wave" ? "Wave" : "Orange Money"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Rôle</span>
          <span className="text-sm font-semibold capitalize">{user?.role}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-white/40">Membre depuis</span>
          <span className="text-sm font-semibold">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-btn border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition"
      >
        Se déconnecter
      </button>
    </div>
  );
}
