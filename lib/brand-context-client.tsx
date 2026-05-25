"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand-types";
import type { BrandAccess } from "@/lib/brand-types";
import type { BrandRole } from "@/lib/permissions";
import { can, PERMISSIONS } from "@/lib/permissions";

interface BrandContextValue {
  currentBrand: BrandAccess;
  currentRole: BrandRole;
  allBrands: BrandAccess[];
  switchBrand: (brandId: string) => void;
  can: (permission: keyof typeof PERMISSIONS) => boolean;
}

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({
  children,
  initialBrand,
  initialBrands,
}: {
  children: React.ReactNode;
  initialBrand: BrandAccess;
  initialBrands: BrandAccess[];
}) {
  const [currentBrand, setCurrentBrand] = useState(initialBrand);
  const router = useRouter();

  const switchBrand = useCallback(
    (brandId: string) => {
      document.cookie = `${ACTIVE_BRAND_COOKIE}=${brandId}; max-age=${7 * 24 * 60 * 60}; path=/`;

      const brand = initialBrands.find((b) => b.id === brandId);
      if (brand) setCurrentBrand(brand);

      fetch("/api/brand/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      }).catch(() => {});

      router.refresh();
    },
    [initialBrands, router]
  );

  const currentRole = currentBrand.role as BrandRole;

  return (
    <BrandContext.Provider
      value={{
        currentBrand,
        currentRole,
        allBrands: initialBrands,
        switchBrand,
        can: (permission) => can(currentRole, permission),
      }}
    >
      <div key={currentBrand.id}>{children}</div>
    </BrandContext.Provider>
  );
}

export function useBrandContext() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrandContext must be used inside BrandProvider");
  return ctx;
}
