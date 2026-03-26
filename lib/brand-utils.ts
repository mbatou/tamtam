import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get the effective brand owner ID for the current user.
 * If the user IS the owner, returns their own ID.
 * If the user is a team member, returns their brand_owner_id.
 */
export async function getEffectiveBrandId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: user } = await supabase
    .from("users")
    .select("id, brand_owner_id")
    .eq("id", userId)
    .single();

  return user?.brand_owner_id || user?.id || userId;
}
