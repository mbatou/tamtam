"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface AmbassadorStats {
  name: string;
  total_referrals: number;
  total_earned: number;
  total_paid: number;
  commission_rate: number;
}

interface Referral {
  signed_up_at: string;
  status: string;
  total_campaigns: number;
  total_commission_earned: number;
  brand_name: string;
}

export default function AmbassadorDashboard() {
  const params = useParams();
  const code = params.code as string;
  const [ambassador, setAmbassador] = useState<AmbassadorStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/ambassador/${code}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setAmbassador(data.ambassador);
        setReferrals(data.referrals || []);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [code]);

  function handleCopy() {
    navigator.clipboard.writeText(`https://www.tamma.me/signup/brand?ref=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ambassador) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🤝</div>
          <h1 className="text-xl font-bold mb-2">Ambassadeur non trouvé</h1>
          <p className="text-white/40 text-sm">Ce code de parrainage n&apos;existe pas ou a été désactivé.</p>
        </div>
      </div>
    );
  }

  const pending = (ambassador.total_earned || 0) - (ambassador.total_paid || 0);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <div className="max-w-2xl mx-auto p-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
            <span className="text-sm font-bold text-orange-400">Ambassadeur Tamtam</span>
          </div>
          <h1 className="text-3xl font-bold">Bonjour {ambassador.name}</h1>
          <p className="text-white/40 text-sm mt-2">Commission de {ambassador.commission_rate}% sur chaque campagne</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold">{ambassador.total_referrals}</p>
            <p className="text-xs text-white/40 mt-1">Marques référées</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{(ambassador.total_earned || 0).toLocaleString("fr-FR")}</p>
            <p className="text-xs text-white/40 mt-1">FCFA gagnés</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">{pending.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-white/40 mt-1">FCFA en attente</p>
          </div>
        </div>

        {/* Referral link */}
        <div className="glass-card p-5 mb-8">
          <p className="text-sm font-bold text-orange-400 mb-2">Votre lien de parrainage</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 font-mono text-sm text-accent truncate">
              tamma.me/signup/brand?ref={code}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-3 rounded-xl bg-orange-500/10 text-orange-400 font-bold text-sm hover:bg-orange-500/20 transition shrink-0"
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <p className="text-xs text-white/30 mt-2">
            Chaque marque qui s&apos;inscrit via ce lien reçoit 2 000 FCFA de bonus.
          </p>
        </div>

        {/* Referrals list */}
        <div className="glass-card p-5">
          <h3 className="font-bold mb-4">Vos marques</h3>
          {referrals.length > 0 ? (
            <div className="space-y-0">
              {referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.brand_name}</p>
                    <p className="text-xs text-white/30">
                      {new Date(r.signed_up_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{r.total_campaigns} campagne{r.total_campaigns !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-emerald-400">{(r.total_commission_earned || 0).toLocaleString("fr-FR")} FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 text-center py-6">
              Aucune marque référée pour le moment. Partagez votre lien !
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/20 mt-8">
          Propulsé par <span className="font-bold gradient-text">Tamtam</span>
        </p>
      </div>
    </div>
  );
}
