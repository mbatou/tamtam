import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import crypto from "crypto";

export async function POST(req: Request) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { confirmation } = await req.json();

  if (confirmation !== "SUPPRIMER") {
    return NextResponse.json({ error: "Tapez SUPPRIMER pour confirmer" }, { status: 400 });
  }

  const userId = session.user.id;
  const supabase = createServiceClient();

  // Get user data
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, phone, role, balance, city, company_name, deleted_at")
    .eq("id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  if (user.deleted_at) return NextResponse.json({ error: "Compte déjà supprimé" }, { status: 400 });

  // Check for positive wallet balance
  const balance = Number(user.balance) || 0;
  if (balance > 0) {
    return NextResponse.json({
      error: "balance_remaining",
      message: `Vous avez ${balance.toLocaleString("fr-FR")} FCFA dans votre portefeuille. Demandez un retrait avant de supprimer votre compte.`,
      balance,
    }, { status: 400 });
  }

  // Cancel active campaigns (brands only)
  if (user.role === "batteur" || user.role === "brand") {
    const { count: activeCampaigns } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("batteur_id", userId)
      .in("status", ["active", "pending"]);

    if (activeCampaigns && activeCampaigns > 0) {
      await supabase
        .from("campaigns")
        .update({ status: "cancelled", moderation_status: "rejected" })
        .eq("batteur_id", userId)
        .in("status", ["active", "pending"]);
    }
  }

  // Anonymize the user record
  const userEmail = user.email || session.user.email || "";
  const hashedEmail = crypto.createHash("sha256").update(userEmail).digest("hex").substring(0, 16);

  await supabase
    .from("users")
    .update({
      name: "Compte supprimé",
      email: `deleted_${hashedEmail}@deleted.tamma.me`,
      original_email: userEmail,
      phone: null,
      city: null,
      company_name: user.company_name ? "Entreprise supprimée" : null,
      balance: 0,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
      deletion_reason: "Suppression par l'utilisateur",
    })
    .eq("id", userId);

  // Remove from brand_team_members if applicable
  await supabase
    .from("brand_team_members")
    .update({ status: "removed", removed_at: new Date().toISOString() })
    .or(`member_user_id.eq.${userId},brand_owner_id.eq.${userId}`);

  // Delete from Supabase Auth
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (err) {
    console.error("Failed to delete auth user:", err);
  }

  // Log the deletion
  await logWalletTransaction({
    supabase,
    userId,
    amount: 0,
    type: "account_deletion",
    description: `Compte supprimé par l'utilisateur (${user.role})`,
    sourceType: "system",
  });

  return NextResponse.json({ success: true, message: "Compte supprimé avec succès" });
}
