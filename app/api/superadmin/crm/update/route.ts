import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = auth.supabase;
  const { userId, updates } = await request.json();

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Whitelist of editable fields
  const allowed = ["name", "email", "phone", "city", "company_name", "balance"];
  const safeUpdates: Record<string, unknown> = {};
  for (const key of Object.keys(updates || {})) {
    if (allowed.includes(key)) {
      safeUpdates[key] = updates[key];
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // If balance is being adjusted, log the transaction
  if (safeUpdates.balance !== undefined) {
    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();

    const oldBalance = Number(user?.balance) || 0;
    const newBalance = Number(safeUpdates.balance);
    const diff = newBalance - oldBalance;

    if (diff !== 0) {
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount: diff,
        type: "admin_adjustment",
        description: `Ajustement admin: ${diff > 0 ? "+" : ""}${diff} FCFA`,
        source_type: "system",
      });
    }
  }

  const { error } = await supabase
    .from("users")
    .update(safeUpdates)
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: auth.session.user.id,
      action: "crm_update_user",
      target_type: "user",
      target_id: userId,
      details: { fields: Object.keys(safeUpdates) },
    });
  } catch {}

  return NextResponse.json({ success: true });
}
