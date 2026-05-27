import { SupabaseClient } from "@supabase/supabase-js";

export async function getCampaignList(supabase: SupabaseClient) {
  return supabase
    .from("campaigns")
    .select(
      `id, title, status, budget, spent, cpc,
       created_at, starts_at, ends_at,
       moderation_status,
       brand:users!batteur_id (
         id, name, company_name, logo_url
       )`
    )
    .not("status", "in", "(deleted,cancelled)")
    .order("created_at", { ascending: false });
}

export async function getEchoList(supabase: SupabaseClient) {
  return supabase
    .from("users")
    .select(
      `id, name, email, phone, city, status,
       available_balance, pending_balance, total_earned,
       created_at`
    )
    .eq("role", "echo")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function getBrandList(supabase: SupabaseClient) {
  return supabase
    .from("users")
    .select(
      `id, name, company_name, email, phone, status,
       available_balance,
       created_at`
    )
    .in("role", ["batteur", "brand"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

export async function getFraudEchoAnalysis(
  supabase: SupabaseClient,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
) {
  return supabase
    .from("fraud_echo_analysis")
    .select("*")
    .order("total_clicks", { ascending: false })
    .range(offset, offset + limit - 1);
}

export async function getPendingPayouts(supabase: SupabaseClient) {
  return supabase
    .from("payouts")
    .select(
      `id, echo_id, amount, provider, status, created_at,
       users!echo_id (name, phone)`
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
}
