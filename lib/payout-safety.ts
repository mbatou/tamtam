import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface PayoutValidation {
  valid: boolean;
  error?: string;
}

export async function validatePayout(payoutId: string): Promise<PayoutValidation> {
  const { data: payout, error } = await supabaseAdmin
    .from("payouts")
    .select("*, users!echo_id(id, status, balance, role, total_earned, created_at)")
    .eq("id", payoutId)
    .single();

  if (error || !payout) return { valid: false, error: "Paiement introuvable" };
  if (payout.status !== "pending") return { valid: false, error: "Déjà traité" };

  const echo = payout.users;
  if (!echo) return { valid: false, error: "Écho introuvable" };
  if (echo.role !== "echo") return { valid: false, error: "L'utilisateur n'est pas un Écho" };
  if (echo.status === "flagged") return { valid: false, error: "Écho signalé — vérification requise" };
  if (echo.status === "suspended") return { valid: false, error: "Écho suspendu" };
  if (payout.amount > echo.balance) return { valid: false, error: "Solde insuffisant" };
  if (payout.amount > 500000) return { valid: false, error: "Montant dépasse la limite de sécurité (500,000 FCFA)" };

  // Account age check (48h minimum)
  const accountAge = Date.now() - new Date(echo.created_at).getTime();
  if (accountAge < 48 * 60 * 60 * 1000) {
    return { valid: false, error: "Compte trop récent (minimum 48h)" };
  }

  // Max 3 sent payouts in 24h
  const { count } = await supabaseAdmin
    .from("payouts")
    .select("*", { count: "exact", head: true })
    .eq("echo_id", echo.id)
    .in("status", ["sent", "processing"])
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());

  if (count && count >= 3) {
    return { valid: false, error: "Trop de paiements en 24h (max 3)" };
  }

  return { valid: true };
}
