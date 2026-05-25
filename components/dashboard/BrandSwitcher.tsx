"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Check, LayoutGrid } from "lucide-react";
import RoleBadge from "@/components/dashboard/RoleBadge";
import { useBrandContext } from "@/lib/brand-context-client";

export default function BrandSwitcher() {
  const { currentBrand, allBrands, switchBrand } = useBrandContext();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (allBrands.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 bg-[#111128] border border-white/[0.08] rounded-[10px] px-3 py-2 hover:border-[rgba(211,84,0,0.3)] transition-all"
      >
        <div className="w-6 h-6 rounded-[5px] bg-[rgba(211,84,0,0.12)] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {currentBrand.logo_url ? (
            <Image
              src={currentBrand.logo_url}
              width={24}
              height={24}
              className="rounded-[5px] object-cover"
              alt={currentBrand.name}
            />
          ) : (
            <span className="text-[10px] font-black text-[#F0997B]">
              {currentBrand.name?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <span className="text-[13px] font-medium text-white max-w-[120px] truncate">
          {currentBrand.name}
        </span>

        <RoleBadge role={currentBrand.role} />

        <ChevronDown
          className={`w-3.5 h-3.5 text-white/30 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[260px] bg-[#0D0D1F] border border-white/[0.08] rounded-[12px] shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <p className="text-[10px] text-white/25 uppercase tracking-wide">
              Espace actuel
            </p>
          </div>

          {allBrands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => {
                switchBrand(brand.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-white/[0.04] transition-colors ${
                brand.id === currentBrand.id ? "bg-[rgba(211,84,0,0.06)]" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-[7px] bg-[rgba(211,84,0,0.1)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {brand.logo_url ? (
                  <Image
                    src={brand.logo_url}
                    width={32}
                    height={32}
                    className="rounded-[7px] object-cover"
                    alt={brand.name}
                  />
                ) : (
                  <span className="text-[12px] font-black text-[#F0997B]">
                    {brand.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[12px] font-medium text-white truncate">
                  {brand.name}
                </p>
                <RoleBadge role={brand.role} />
              </div>
              {brand.id === currentBrand.id && (
                <Check className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0" />
              )}
            </button>
          ))}

          <div className="border-t border-white/[0.06] p-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/brand-picker");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-white/[0.04] text-[11px] text-white/35 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Gérer mes espaces
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
