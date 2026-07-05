import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { apiError, validationError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

// The CRM edit drawer sends every whitelisted field, including empty strings
// and nulls for untouched values — keep accepting those. Unknown keys are
// stripped by the whitelist below, so the schema stays non-strict.
const updateUserBodySchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide"),
  updates: z.object({
    name: z.string().max(200).optional().nullable(),
    email: z.string().max(200).optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    company_name: z.string().max(200).optional().nullable(),
    balance: z.union([
      z.number(),
      z.string().regex(/^-?\d+(\.\d+)?$/, "Solde invalide"),
    ]).optional().nullable(),
  }).optional().nullable(),
});

async function requireSuperadmin() {
  try {
    return await requireAuth(["superadmin"]);
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = auth.supabase;
  const body = await request.json();
  const parsed = updateUserBodySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const { userId, updates } = body;

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

  if (error) {
    console.error("[superadmin/crm/update] user update failed:", error);
    return apiError(500, "Erreur interne");
  }

  // Log activity
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: auth.authUser.id,
      action: "crm_update_user",
      target_type: "user",
      target_id: userId,
      details: { fields: Object.keys(safeUpdates) },
    });
  } catch {}

  return NextResponse.json({ success: true });
}
