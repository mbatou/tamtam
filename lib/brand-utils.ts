import { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand-types";
import { validateBrandAccess, getActiveBrandFromCookie } from "@/lib/brand-context";

/**
 * Get the effective brand owner ID for the current user.
 *
 * Priority:
 * 1. Cookie-stored active brand (user switched via dropdown)
 * 2. User's own brand (if role is batteur/brand)
 * 3. brand_owner_id on users table (legacy single-brand link)
 * 4. User's own ID as fallback
 */
export async function getEffectiveBrandId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const activeBrandCookie = getActiveBrandFromCookie();

  if (activeBrandCookie) {
    const hasAccess = await validateBrandAccess(
      supabase,
      userId,
      activeBrandCookie
    );
    if (hasAccess) return activeBrandCookie;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, brand_owner_id, last_used_brand_id")
    .eq("id", userId)
    .single();

  if (user?.last_used_brand_id) {
    const hasAccess = await validateBrandAccess(
      supabase,
      userId,
      user.last_used_brand_id
    );
    if (hasAccess) return user.last_used_brand_id;
  }

  return user?.brand_owner_id || user?.id || userId;
}

export { ACTIVE_BRAND_COOKIE };
