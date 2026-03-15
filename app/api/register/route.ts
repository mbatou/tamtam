import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const REFERRAL_BONUS_FCFA = 500;

export async function POST(req: NextRequest) {
  const { userId, name, phone, city, mobile_money_provider, referral_code } = await req.json();

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

  // Look up referrer if referral_code provided
  let referrerId: string | null = null;
  if (referral_code) {
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

  // Create the user profile
  const { error } = await supabase.from("users").upsert(
    {
      id: userId,
      role: "echo",
      name,
      phone: phone || null,
      city: city || null,
      mobile_money_provider,
      terms_accepted_at: new Date().toISOString(),
      referral_code: newUserReferralCode,
      ...(referrerId ? { referred_by: referrerId } : {}),
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If referred by someone, increment their referral_count and credit bonus
  if (referrerId) {
    // Increment referral_count
    await supabase.rpc("increment_referral_count", { p_user_id: referrerId });

    // Credit referral bonus to referrer
    await supabase.rpc("increment_echo_balance", {
      p_echo_id: referrerId,
      p_amount: REFERRAL_BONUS_FCFA,
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
