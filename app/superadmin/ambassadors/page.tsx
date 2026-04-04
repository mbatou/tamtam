"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils";
import { getBrandDisplayName } from "@/lib/display-utils";

interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate: number;
  status: string;
  total_referrals: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
}

interface Referral {
  id: string;
  brand_user_id: string;
  referral_code: string;
  signed_up_at: string;
  first_campaign_at: string | null;
  status: string;
  total_campaigns: number;
  total_commission_earned: number;
  users: { name: string; company_name: string } | null;
}

interface Commission {
  id: string;
  campaign_id: string;
  campaign_budget: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  campaigns: { title: string } | null;
}

interface Stats {
  totalAmbassadors: number;
  totalReferrals: number;
  totalEarned: number;
  totalPending: number;
}

export default function AmbassadorsPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [stats, setStats] = useState<Stats>({ totalAmbassadors: 0, totalReferrals: 0, totalEarned: 0, totalPending: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Ambassador | null>(null);
  const [detailData, setDetailData] = useState<{ referrals: Referral[]; commissions: Commission[]; activeReferrals: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", code: "", rate: "5" });

  async function loadData() {
    const res = await fetch("/api/superadmin/ambassadors");
    if (res.ok) {
      const data = await res.json();
      setAmbassadors(data.ambassadors);
      setStats(data.stats);
    }
    setLoading(false);
  }

  async function loadDetail(amb: Ambassador) {
    setSelected(amb);
    setDetailData(null);
    const res = await fetch(`/api/superadmin/ambassadors?id=${amb.id}`);
    if (res.ok) {
      const data = await res.json();
      setDetailData({ referrals: data.referrals, commissions: data.commissions, activeReferrals: data.activeReferrals });
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate() {
    setSaving(true);
    const code = createForm.code || `AMB-${createForm.name.split(" ")[0].toUpperCase()}`;
    const res = await fetch("/api/superadmin/ambassadors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone || null,
        referral_code: code,
        commission_rate: parseFloat(createForm.rate) || 5,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Ambassador created!", "success");
      setShowCreate(false);
      setCreateForm({ name: "", email: "", phone: "", code: "", rate: "5" });
      loadData();
    } else {
      showToast(data.error || "Error", "error");
    }
    setSaving(false);
  }

  async function handlePay(ambassadorId: string) {
    if (!confirm("Confirm payment of all pending commissions?")) return;
    const res = await fetch("/api/superadmin/ambassadors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", ambassador_id: ambassadorId }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`${data.paidAmount?.toLocaleString("fr-FR")} FCFA marked as paid`, "success");
      loadData();
      if (selected) loadDetail(selected);
    } else {
      showToast(data.error || "Error", "error");
    }
  }

  async function handleToggleStatus(ambassadorId: string) {
    const res = await fetch("/api/superadmin/ambassadors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_status", ambassador_id: ambassadorId }),
    });
    if (res.ok) {
      showToast("Status updated", "success");
      loadData();
      if (selected) {
        const updated = { ...selected, status: selected.status === "active" ? "inactive" : "active" };
        setSelected(updated);
      }
    }
  }

  function copyUrl(code: string) {
    navigator.clipboard.writeText(`https://www.tamma.me/signup/brand?ref=${code}`);
    showToast("Link copied!", "success");
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Detail view
  if (selected) {
    const pending = (selected.total_earned || 0) - (selected.total_paid || 0);
    return (
      <div className="p-6 max-w-5xl">
        {ToastComponent}
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{selected.name}</h1>
            <p className="text-sm text-white/40">{selected.email} {selected.phone && `· ${selected.phone}`}</p>
            <p className="text-xs text-white/20 mt-1">Created {timeAgo(selected.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${selected.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {selected.status === "active" ? "Active" : "Inactive"}
            </span>
            <button onClick={() => handleToggleStatus(selected.id)} className="text-xs px-3 py-1 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition">
              {selected.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        {/* Referral URL */}
        <div className="glass-card p-4 mb-6 flex items-center gap-3">
          <input readOnly value={`tamma.me/signup/brand?ref=${selected.referral_code}`} className="flex-1 bg-transparent text-accent text-sm font-mono" />
          <button onClick={() => copyUrl(selected.referral_code)} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 transition">
            Copy
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Referred Brands</p>
            <p className="text-xl font-bold">{selected.total_referrals}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Active Brands</p>
            <p className="text-xl font-bold text-accent">{detailData?.activeReferrals ?? "..."}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Total Earned</p>
            <p className="text-xl font-bold text-emerald-400">{(selected.total_earned || 0).toLocaleString("fr-FR")} F</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 mb-1">Pending</p>
            <p className="text-xl font-bold text-orange-400">{pending.toLocaleString("fr-FR")} F</p>
          </div>
        </div>

        {/* Pay button */}
        {pending > 0 && (
          <button onClick={() => handlePay(selected.id)} className="mb-6 px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition">
            Mark as paid ({pending.toLocaleString("fr-FR")} FCFA)
          </button>
        )}

        {/* Referred brands */}
        <div className="glass-card p-5 mb-4">
          <h3 className="font-bold mb-4">Referred Brands</h3>
          {detailData?.referrals && detailData.referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs border-b border-white/5">
                    <th className="text-left pb-2 font-semibold">Brand</th>
                    <th className="text-left pb-2 font-semibold">Sign-up</th>
                    <th className="text-left pb-2 font-semibold">Campaigns</th>
                    <th className="text-right pb-2 font-semibold">Commission</th>
                    <th className="text-right pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.referrals.map(ref => (
                    <tr key={ref.id} className="border-b border-white/5">
                      <td className="py-3">
                        <button
                          onClick={() => router.push(`/superadmin/users?id=${ref.brand_user_id}`)}
                          className="text-left hover:text-accent transition-colors font-medium hover:underline"
                        >
                          {ref.users ? getBrandDisplayName({ ...ref.users, role: "batteur" }) : "—"}
                        </button>
                      </td>
                      <td className="py-3 text-white/40">{new Date(ref.signed_up_at).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">{ref.total_campaigns}</td>
                      <td className="py-3 text-right text-emerald-400">{(ref.total_commission_earned || 0).toLocaleString("fr-FR")} F</td>
                      <td className="py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ref.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"}`}>
                          {ref.status === "active" ? "Active" : "Signed up"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-white/30">No referred brands</p>
          )}
        </div>

        {/* Commissions */}
        <div className="glass-card p-5">
          <h3 className="font-bold mb-4">Commissions</h3>
          {detailData?.commissions && detailData.commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs border-b border-white/5">
                    <th className="text-left pb-2 font-semibold">Campaign</th>
                    <th className="text-left pb-2 font-semibold">Budget</th>
                    <th className="text-left pb-2 font-semibold">Rate</th>
                    <th className="text-right pb-2 font-semibold">Commission</th>
                    <th className="text-right pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.commissions.map(c => (
                    <tr key={c.id} className="border-b border-white/5">
                      <td className="py-3">{c.campaigns?.title || "—"}</td>
                      <td className="py-3 text-white/40">{(c.campaign_budget || 0).toLocaleString("fr-FR")} F</td>
                      <td className="py-3">{c.commission_rate}%</td>
                      <td className="py-3 text-right text-emerald-400">{(c.commission_amount || 0).toLocaleString("fr-FR")} F</td>
                      <td className="py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>
                          {c.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-white/30">No commissions</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 max-w-6xl">
      {ToastComponent}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ambassadors</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition">
          + Create an ambassador
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Ambassadors</p>
          <p className="text-xl font-bold">{stats.totalAmbassadors}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Referred Brands</p>
          <p className="text-xl font-bold">{stats.totalReferrals}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Commissions Earned</p>
          <p className="text-xl font-bold text-emerald-400">{stats.totalEarned.toLocaleString("fr-FR")} F</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Pending Payment</p>
          <p className="text-xl font-bold text-orange-400">{stats.totalPending.toLocaleString("fr-FR")} F</p>
        </div>
      </div>

      {/* Ambassador table */}
      {ambassadors.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-xs border-b border-white/5">
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Code</th>
                  <th className="text-left p-4 font-semibold">Brands</th>
                  <th className="text-left p-4 font-semibold">Commission</th>
                  <th className="text-right p-4 font-semibold">Earned</th>
                  <th className="text-right p-4 font-semibold">Paid</th>
                  <th className="text-right p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {ambassadors.map(amb => (
                  <tr key={amb.id} onClick={() => loadDetail(amb)} className="border-b border-white/5 cursor-pointer hover:bg-white/[0.02] transition">
                    <td className="p-4">
                      <div className="font-medium">{amb.name}</div>
                      <div className="text-xs text-white/30">{amb.email}</div>
                    </td>
                    <td className="p-4 font-mono text-orange-400 text-xs">{amb.referral_code}</td>
                    <td className="p-4">{amb.total_referrals}</td>
                    <td className="p-4">{amb.commission_rate}%</td>
                    <td className="p-4 text-right text-emerald-400">{(amb.total_earned || 0).toLocaleString("fr-FR")} F</td>
                    <td className="p-4 text-right text-white/40">{(amb.total_paid || 0).toLocaleString("fr-FR")} F</td>
                    <td className="p-4 text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${amb.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {amb.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤝</span>
          </div>
          <p className="text-white/40 text-sm mb-2">No ambassadors</p>
          <p className="text-xs text-white/30">Create your first ambassador to start the referral program.</p>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create an Ambassador</h2>
            <div className="space-y-3">
              <input
                placeholder="Full name"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition"
              />
              <input
                placeholder="Email"
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition"
              />
              <input
                placeholder="Phone / WhatsApp (optional)"
                value={createForm.phone}
                onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition"
              />
              <div>
                <input
                  placeholder={`Referral code (e.g.: AMB-${createForm.name.split(" ")[0]?.toUpperCase() || "NAME"})`}
                  value={createForm.code}
                  onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-orange-500 transition"
                />
                <p className="text-xs text-white/20 mt-1">Leave empty to auto-generate</p>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Commission (%)</label>
                <input
                  type="number"
                  value={createForm.rate}
                  onChange={e => setCreateForm({ ...createForm, rate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.name || !createForm.email}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition disabled:opacity-40"
              >
                {saving ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-3 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
