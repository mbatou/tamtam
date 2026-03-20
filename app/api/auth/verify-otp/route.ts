import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, code } = body;

  if (!email || !code) {
    return NextResponse.json({ error: "Email et code requis." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  // Find valid code
  const { data: verificationCode } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("code", hashedCode)
    .eq("type", "brand_signup")
    .is("verified_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!verificationCode) {
    // Check if code exists but expired or already used
    const { data: anyCode } = await supabase
      .from("verification_codes")
      .select("attempts, expires_at")
      .eq("email", email.toLowerCase())
      .eq("type", "brand_signup")
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (anyCode) {
      // Increment attempts
      await supabase
        .from("verification_codes")
        .update({ attempts: (anyCode.attempts || 0) + 1 })
        .eq("email", email.toLowerCase())
        .eq("type", "brand_signup")
        .is("verified_at", null);
    }

    return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400 });
  }

  // Check max attempts
  if ((verificationCode.attempts || 0) >= 3) {
    return NextResponse.json({ error: "Trop de tentatives. Demandez un nouveau code." }, { status: 429 });
  }

  // Mark code as verified
  await supabase
    .from("verification_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", verificationCode.id);

  // Get signup data from metadata
  const metadata = verificationCode.metadata as {
    name: string;
    companyName: string;
    phone: string;
    password: string;
  };

  if (!metadata) {
    return NextResponse.json({ error: "Données d'inscription manquantes." }, { status: 400 });
  }

  // Create Supabase auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    password: metadata.password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Create users row with role 'batteur'
  const { error: profileError } = await supabase.from("users").insert({
    id: authUser.user.id,
    name: metadata.name,
    role: "batteur",
    phone: metadata.phone,
    company_name: metadata.companyName,
    balance: 0,
    total_earned: 0,
  });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    // Clean up auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: "Erreur lors de la création du profil." }, { status: 500 });
  }

  // --- Welcome bonus (LUP-68) ---
  let welcomeBonusApplied = false;
  try {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["welcome_bonus_amount", "welcome_bonus_end_date", "welcome_bonus_enabled"]);

    const bonusEnabled = settings?.find((s) => s.key === "welcome_bonus_enabled")?.value === "true";
    const bonusAmount = parseInt(settings?.find((s) => s.key === "welcome_bonus_amount")?.value || "0");
    const bonusEndDate = new Date(settings?.find((s) => s.key === "welcome_bonus_end_date")?.value || "2026-01-01");

    if (bonusEnabled && new Date() < bonusEndDate && bonusAmount > 0) {
      await supabase
        .from("users")
        .update({ balance: bonusAmount })
        .eq("id", authUser.user.id);

      try {
        await supabase.from("wallet_transactions").insert({
          user_id: authUser.user.id,
          amount: bonusAmount,
          type: "bonus",
          description: "Bonus de bienvenue — offre limitée",
          status: "completed",
        });
      } catch { /* wallet_transactions table may not exist yet */ }

      welcomeBonusApplied = true;
    }
  } catch {
    // Non-blocking: bonus failure should not prevent account creation
  }

  // --- Auto-convert matching lead (LUP-67) ---
  try {
    const { data: matchingLead } = await supabase
      .from("brand_leads")
      .select("id")
      .eq("email", email.toLowerCase())
      .neq("status", "converted")
      .limit(1)
      .single();

    if (matchingLead) {
      await supabase.from("brand_leads").update({
        status: "converted",
        converted_at: new Date().toISOString(),
        converted_user_id: authUser.user.id,
      }).eq("id", matchingLead.id);
    }
  } catch {
    // Non-blocking: lead conversion failure should not prevent account creation
  }

  return NextResponse.json({ success: true, userId: authUser.user.id, welcomeBonusApplied });
}
