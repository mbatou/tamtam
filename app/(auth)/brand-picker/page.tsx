"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import RoleBadge from "@/components/dashboard/RoleBadge";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand-types";
import type { BrandAccess } from "@/lib/brand-types";

interface PendingInvitation {
  id: string;
  brand_owner_id: string;
  role: string;
  invited_at: string;
  brand: {
    id: string;
    name: string;
    company_name: string;
    logo_url?: string | null;
  };
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Membre",
  viewer: "Lecteur",
};

export default function BrandPickerPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandAccess[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function fetchWorkspaces() {
    const res = await fetch("/api/brand/workspaces");
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setBrands(data.brands || []);
    setPending(data.pending || []);
    setLoading(false);

    if (data.brands.length === 1 && (!data.pending || data.pending.length === 0)) {
      handleSelect(data.brands[0].id);
    }
  }

  async function handleSelect(brandId: string) {
    document.cookie = `${ACTIVE_BRAND_COOKIE}=${brandId}; max-age=${7 * 24 * 60 * 60}; path=/`;

    fetch("/api/brand/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId }),
    }).catch(() => {});

    router.push("/admin/dashboard");
  }

  async function handleAccept(invitationId: string) {
    setProcessingInvite(invitationId);
    const res = await fetch("/api/brand/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action: "accept" }),
    });
    if (res.ok) {
      await fetchWorkspaces();
    }
    setProcessingInvite(null);
  }

  async function handleDecline(invitationId: string) {
    setProcessingInvite(invitationId);
    await fetch("/api/brand/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action: "decline" }),
    });
    setPending((prev) => prev.filter((p) => p.id !== invitationId));
    setProcessingInvite(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-[#D35400] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center px-5 py-10">
      <Image
        src="/brand/tamtam-horizontal-orange.png"
        height={28}
        width={110}
        alt="Tamtam"
        className="mb-8 h-7 w-auto"
        priority
      />

      <h1 className="text-[22px] font-black text-white text-center mb-1 font-syne">
        Sur quel compte travailler ?
      </h1>
      <p className="text-[13px] text-white/40 text-center mb-8">
        Sélectionnez un espace de travail pour continuer.
      </p>

      <div className="w-full max-w-[420px] flex flex-col gap-3">
        {pending.length > 0 && (
          <div className="mb-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#F0997B] mb-2">
              Invitations en attente
            </p>
            {pending.map((inv) => (
              <div
                key={inv.id}
                className="w-full p-4 bg-[rgba(211,84,0,0.06)] border border-[rgba(211,84,0,0.25)] rounded-[14px] mb-2"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[rgba(211,84,0,0.1)] flex items-center justify-center text-[14px] font-black text-[#F0997B] flex-shrink-0">
                    {inv.brand.company_name?.charAt(0) ||
                      inv.brand.name?.charAt(0) ||
                      "?"}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white">
                      {inv.brand.company_name || inv.brand.name}
                    </p>
                    <p className="text-[11px] text-white/40">
                      Invitation · Rôle : {roleLabels[inv.role] || inv.role}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(inv.id)}
                    disabled={processingInvite === inv.id}
                    className="flex-1 bg-[#1D9E75] text-white text-[12px] font-bold py-2.5 rounded-[10px] disabled:opacity-50 transition"
                  >
                    {processingInvite === inv.id ? "..." : "Accepter"}
                  </button>
                  <button
                    onClick={() => handleDecline(inv.id)}
                    disabled={processingInvite === inv.id}
                    className="flex-1 bg-white/[0.05] border border-white/[0.1] text-white/50 text-[12px] font-medium py-2.5 rounded-[10px] disabled:opacity-50 transition"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {brands.length > 0 && (
          <div>
            {pending.length > 0 && (
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/30 mb-2">
                Mes espaces
              </p>
            )}
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleSelect(brand.id)}
                className="w-full flex items-center gap-4 p-4 bg-[#111128] border border-white/[0.07] rounded-[14px] hover:border-[rgba(211,84,0,0.3)] hover:bg-[#141420] transition-all group mb-2"
              >
                <div className="w-12 h-12 rounded-[10px] bg-[rgba(211,84,0,0.1)] border border-[rgba(211,84,0,0.2)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {brand.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      width={48}
                      height={48}
                      className="rounded-[10px] object-cover"
                      alt={brand.name}
                    />
                  ) : (
                    <span className="text-[16px] font-black text-[#F0997B]">
                      {brand.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-bold text-white">
                    {brand.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleBadge role={brand.role} />
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#D35400] transition-colors" />
              </button>
            ))}
          </div>
        )}

        {brands.length === 0 && pending.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/40 text-sm">
              Aucun espace de travail disponible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
