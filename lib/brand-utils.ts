import { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_BRAND_COOKIE } from "@/lib/brand-types";
import { validateBrandAccess, getActiveBrandFromCookie } from "@/lib/brand-context";

/**
 * Get the effective brand owner ID for the current user.
 *
 * Priority:
 * 1. Cookie-stored active brand (user switched via dropdown)
 * 2. Last used brand (stored on users table)
 * 3. User's own brand (if role is batteur/admin)
 * 4. brand_owner_id on users table (legacy single-brand link)
 * 5. First accepted team membership
 * 6. User's own ID as fallback
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
    .select("id, role, brand_owner_id, last_used_brand_id")
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

  if (user?.role === "batteur" || user?.role === "admin") {
    return user.brand_owner_id || user.id;
  }

  if (user?.brand_owner_id) {
    return user.brand_owner_id;
  }

  // Team-only user: find first accepted membership
  const { data: membership } = await supabase
    .from("brand_team_members")
    .select("brand_owner_id")
    .eq("member_user_id", userId)
    .in("status", ["active", "accepted"])
    .is("removed_at", null)
    .limit(1)
    .single();

  if (membership) {
    return membership.brand_owner_id;
  }

  return user?.id || userId;
}

export { ACTIVE_BRAND_COOKIE };
