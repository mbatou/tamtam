import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeCity } from "@/lib/cities";
import { trackConversion } from "@/lib/tracking/track-conversion";

const REFERRAL_BONUS_FCFA = 150;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { allowed } = rateLimit(`register:${ip}`, 5, 3600000); // 5 per hour per IP
  if (!allowed) {
    return NextResponse.json({ error: "Trop de tentatives. Réessaie plus tard." }, { status: 429 });
  }

  // Verify the authenticated user matches the userId being registered
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, name, phone, mobile_money_provider, referral_code, tm_ref } = body;
  const city = normalizeCity(body.city);

  if (userId !== session.user.id) {
    return NextResponse.json({ error: "Non autorisé — userId ne correspond pas" }, { status: 403 });
  }

  if (!userId || !name || !mobile_money_provider) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Generate a unique referral code for this new user
  const baseCode = name.split(" ")[0]?.toUpperCase() + "-TT";
  let newUserReferralCode = baseCode;

  // Check for uniqueness, append number if needed
  const { data: existingCodes } = await supabase
    .from("users")
    .select("referral_code")
    .like("referral_code", `${name.split(" ")[0]?.toUpperCase()}%-TT`);

  if (existingCodes && existingCodes.length > 0) {
    const taken = new Set(existingCodes.map((r) => r.referral_code));
    if (taken.has(baseCode)) {
      let counter = 2;
      while (taken.has(`${name.split(" ")[0]?.toUpperCase()}${counter}-TT`)) {
        counter++;
      }
      newUserReferralCode = `${name.split(" ")[0]?.toUpperCase()}${counter}-TT`;
    }
  }

  // Check if referral program is enabled
  const { data: referralSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "referral_program_enabled")
    .single();
  const referralEnabled = referralSetting?.value !== "false";

  // Look up referrer if referral_code provided and program is enabled
  let referrerId: string | null = null;
  if (referral_code && referralEnabled) {
    const { data: referrer } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", referral_code.toUpperCase())
      .single();

    if (referrer) {
      referrerId = referrer.id;
      // Don't let someone refer themselves
      if (referrerId === userId) {
        referrerId = null;
      }
    }
  }

  // Check if user already exists with a different role (e.g., batteur who got welcome bonus)
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, role, balance")
    .eq("id", userId)
    .single();

  if (existingUser && existingUser.role && existingUser.role !== "echo") {
    return NextResponse.json(
      { error: "Ce compte existe déjà avec le rôle " + existingUser.role + ". Veuillez vous connecter." },
      { status: 409 }
    );
  }

  // Create the user profile (insert only, no upsert to prevent role overwrite)
  const { error } = existingUser
    ? await supabase.from("users").update({
        name,
        phone: phone || null,
        city: city || null,
        mobile_money_provider,
        terms_accepted_at: new Date().toISOString(),
        referral_code: newUserReferralCode,
        ...(referrerId ? { referred_by: referrerId } : {}),
        ...(tm_ref ? { signup_tm_ref: tm_ref } : {}),
      }).eq("id", userId)
    : await supabase.from("users").insert({
        id: userId,
        role: "echo",
        name,
        phone: phone || null,
        city: city || null,
        mobile_money_provider,
        terms_accepted_at: new Date().toISOString(),
        referral_code: newUserReferralCode,
        ...(referrerId ? { referred_by: referrerId } : {}),
        ...(tm_ref ? { signup_tm_ref: tm_ref } : {}),
      });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire signup conversion via the PUBLIC Pixel API (non-blocking)
  trackConversion({
    event: "signup",
    tmRef: tm_ref || null,
    externalId: `echo_signup_${userId}`,
    metadata: {
      name,
      city: city || null,
    },
  }).catch(() => {});

  // If referred by someone, increment their referral_count and credit bonus
  if (referrerId) {
    // Increment referral_count
    await supabase.rpc("increment_referral_count", { p_user_id: referrerId });

    // Credit referral bonus to referrer
    await supabase.rpc("increment_echo_balance", {
      p_echo_id: referrerId,
      p_amount: REFERRAL_BONUS_FCFA,
    });

    await logWalletTransaction({
      supabase,
      userId: referrerId,
      amount: REFERRAL_BONUS_FCFA,
      type: "referral_bonus",
      description: `Parrainage de ${name} — code ${referral_code}`,
      sourceId: userId,
      sourceType: "referral",
    });

    // Check milestones for referrer (referral milestones)
    try {
      const { checkMilestones } = await import("@/lib/gamification");
      await checkMilestones(referrerId);
    } catch {
      // Non-critical, continue
    }
  }

  return NextResponse.json({ success: true });
}
