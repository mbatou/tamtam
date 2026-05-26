import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand-types";
import type { BrandAccess } from "@/lib/brand-types";

export { ACTIVE_BRAND_COOKIE };
export type { BrandAccess };

export async function getAccessibleBrands(
  supabase: SupabaseClient,
  userId: string
): Promise<BrandAccess[]> {
  const { data: profile } = await supabase
    .from("users")
    .select("id, role, name, company_name, logo_url")
    .eq("id", userId)
    .single();

  const brands: BrandAccess[] = [];

  if (profile?.role === "batteur" || profile?.role === "admin") {
    brands.push({
      id: profile.id,
      name: profile.company_name || profile.name || "",
      logo_url: profile.logo_url,
      role: "owner",
      permissions: null,
      isOwn: true,
    });
  }

  const { data: memberships } = await supabase
    .from("brand_team_members")
    .select(
      "id, brand_owner_id, role, permissions, accepted_at"
    )
    .eq("member_user_id", userId)
    .in("status", ["active", "accepted"])
    .is("removed_at", null);

  if (memberships) {
    const ownerIds = memberships.map((m) => m.brand_owner_id);
    const { data: owners } = await supabase
      .from("users")
      .select("id, name, company_name, logo_url")
      .in("id", ownerIds);

    const ownerMap = new Map(owners?.map((o) => [o.id, o]) || []);

    for (const m of memberships) {
      if (brands.some((b) => b.id === m.brand_owner_id)) continue;
      const owner = ownerMap.get(m.brand_owner_id);
      brands.push({
        id: m.brand_owner_id,
        name: owner?.company_name || owner?.name || "",
        logo_url: owner?.logo_url,
        role: (m.role as BrandAccess["role"]) || "member",
        permissions: m.permissions as Record<string, boolean> | null,
        isOwn: false,
        membershipId: m.id,
      });
    }
  }

  return brands;
}

export async function getPendingInvitations(
  supabase: SupabaseClient,
  userEmail: string
) {
  const { data } = await supabase
    .from("brand_team_members")
    .select(
      "id, brand_owner_id, role, invited_at"
    )
    .eq("email", userEmail.toLowerCase().trim())
    .in("status", ["invited", "pending"])
    .is("removed_at", null);

  if (!data || data.length === 0) return [];

  const ownerIds = data.map((d) => d.brand_owner_id);
  const { data: owners } = await supabase
    .from("users")
    .select("id, name, company_name, logo_url")
    .in("id", ownerIds);

  const ownerMap = new Map(owners?.map((o) => [o.id, o]) || []);

  return data.map((inv) => {
    const owner = ownerMap.get(inv.brand_owner_id);
    return {
      ...inv,
      brand: {
        id: inv.brand_owner_id,
        name: owner?.name || "",
        company_name: owner?.company_name || "",
        logo_url: owner?.logo_url,
      },
    };
  });
}

export async function validateBrandAccess(
  supabase: SupabaseClient,
  userId: string,
  brandId: string
): Promise<boolean> {
  if (userId === brandId) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .in("role", ["batteur", "admin"])
      .single();
    return !!data;
  }

  const { data: membership } = await supabase
    .from("brand_team_members")
    .select("id")
    .eq("member_user_id", userId)
    .eq("brand_owner_id", brandId)
    .in("status", ["active", "accepted"])
    .is("removed_at", null)
    .limit(1)
    .single();

  return !!membership;
}

export function getActiveBrandFromCookie(): string | null {
  try {
    const cookieStore = cookies();
    return cookieStore.get(ACTIVE_BRAND_COOKIE)?.value || null;
  } catch {
    return null;
  }
}
