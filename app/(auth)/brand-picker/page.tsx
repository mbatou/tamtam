"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import RoleBadge from "@/components/dashboard/RoleBadge";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand-types";
import { useTranslation } from "@/lib/i18n";
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

export default function BrandPickerPage() {
  const router = useRouter();
  const { t } = useTranslation();
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

  const roleKeys: Record<string, string> = {
    admin: "workspace.roleAdmin",
    member: "workspace.roleMember",
    viewer: "workspace.roleViewer",
    owner: "workspace.roleOwner",
  };

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
        className="mb-10 h-7 w-auto"
        priority
      />

      <h1 className="text-[22px] font-black text-white text-center mb-1.5 font-syne">
        {t("workspace.pickerTitle")}
      </h1>
      <p className="text-[13px] text-white/35 text-center mb-10">
        {t("workspace.pickerSubtitle")}
      </p>

      <div className="w-full max-w-[400px] flex flex-col gap-2">
        {pending.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F0997B] mb-3 px-1">
              {t("workspace.pendingInvitations")}
            </p>
            {pending.map((inv) => (
              <div
                key={inv.id}
                className="w-full p-4 bg-[rgba(211,84,0,0.04)] border border-[rgba(211,84,0,0.2)] rounded-2xl mb-2"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(211,84,0,0.08)] flex items-center justify-center text-[14px] font-black text-[#F0997B] flex-shrink-0">
                    {inv.brand.company_name?.charAt(0) ||
                      inv.brand.name?.charAt(0) ||
                      "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-white truncate">
                      {inv.brand.company_name || inv.brand.name}
                    </p>
                    <p className="text-[11px] text-white/35">
                      {t("workspace.invitationRole", { role: t(roleKeys[inv.role] || "workspace.roleMember") })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(inv.id)}
                    disabled={processingInvite === inv.id}
                    className="flex-1 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white text-[12px] font-bold py-2.5 rounded-xl disabled:opacity-50 transition"
                  >
                    {processingInvite === inv.id ? "..." : t("workspace.accept")}
                  </button>
                  <button
                    onClick={() => handleDecline(inv.id)}
                    disabled={processingInvite === inv.id}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.15] text-[12px] font-medium py-2.5 rounded-xl disabled:opacity-50 transition"
                  >
                    {t("workspace.decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {brands.length > 0 && (
          <div>
            {pending.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 mb-3 px-1">
                {t("workspace.myWorkspaces")}
              </p>
            )}
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleSelect(brand.id)}
                className="w-full flex items-center gap-3.5 p-4 bg-[#111128] border border-white/[0.06] rounded-2xl hover:border-[rgba(211,84,0,0.25)] hover:bg-[#13132a] transition-all group mb-2"
              >
                <div className="w-11 h-11 rounded-xl bg-[rgba(211,84,0,0.08)] border border-[rgba(211,84,0,0.15)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {brand.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      width={44}
                      height={44}
                      className="rounded-xl object-cover"
                      alt={brand.name}
                    />
                  ) : (
                    <span className="text-[15px] font-black text-[#F0997B]">
                      {brand.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[14px] font-bold text-white truncate">
                    {brand.name}
                  </p>
                  <div className="mt-1">
                    <RoleBadge role={brand.role} />
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/15 group-hover:text-[#D35400] group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}

        {brands.length === 0 && pending.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">
              {t("workspace.noWorkspaces")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
