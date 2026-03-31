import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import crypto from "crypto";

export async function POST(req: Request) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify superadmin role
  const { data: adminCheck } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!adminCheck || adminCheck.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { userId, reason } = await req.json();

  if (!userId || !reason) {
    return NextResponse.json({ error: "userId et reason requis" }, { status: 400 });
  }

  // Get user data
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, phone, role, balance, city, company_name, deleted_at")
    .eq("id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  if (user.deleted_at) return NextResponse.json({ error: "Compte déjà supprimé" }, { status: 400 });

  // Cancel active campaigns if brand
  if (user.role === "batteur" || user.role === "brand") {
    await supabase
      .from("campaigns")
      .update({ status: "cancelled", moderation_status: "rejected" })
      .eq("batteur_id", userId)
      .in("status", ["active", "pending"]);
  }

  // Anonymize
  const userEmail = user.email || "";
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
      deleted_by: session.user.id,
      deletion_reason: reason,
    })
    .eq("id", userId);

  // Remove from teams
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

  // Log
  await logWalletTransaction({
    supabase,
    userId,
    amount: 0,
    type: "account_deletion",
    description: `Compte supprimé par admin: ${reason}`,
    sourceType: "system",
    createdBy: session.user.id,
  });

  // Log to admin activity
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: "user_delete_account",
      target_type: "user",
      target_id: userId,
      details: { reason, user_name: user.name, user_role: user.role },
    });
  } catch { /* admin_activity_log may not exist yet */ }

  return NextResponse.json({ success: true });
}
