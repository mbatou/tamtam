import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { trackConversion } from "@/lib/tracking/track-conversion";
import { SIGNUP_INTENT_COOKIE } from "@/lib/signup-intent";

function redirectAndClearIntent(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(SIGNUP_INTENT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const roleParam = searchParams.get("role") as "echo" | "batteur" | null;
  const next = searchParams.get("next");
  const tmRef = searchParams.get("tm_ref");

  const intentFromCookie = request.cookies.get(SIGNUP_INTENT_COOKIE)?.value as "brand" | "echo" | undefined;
  const role = roleParam || (intentFromCookie === "brand" ? "batteur" : intentFromCookie === "echo" ? "echo" : null);

  if (!code) {
    return redirectAndClearIntent(new URL("/login?error=auth_failed", request.url));
  }

  const supabase = createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectAndClearIntent(new URL("/login?error=auth_failed", request.url));
  }

  if (next) {
    return redirectAndClearIntent(new URL(next, request.url));
  }

  const userId = data.user.id;
  const service = createServiceClient();

  const { data: existingUser } = await service
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (existingUser) {
    if (existingUser.role === "superadmin") {
      return redirectAndClearIntent(new URL("/superadmin", request.url));
    }
    if (existingUser.role === "batteur" || existingUser.role === "admin") {
      return redirectAndClearIntent(new URL("/admin/dashboard", request.url));
    }
    return redirectAndClearIntent(new URL("/dashboard", request.url));
  }

  const assignedRole = role === "batteur" ? "batteur" : "echo";
  const userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Utilisateur";

  const baseCode = userName.split(" ")[0]?.toUpperCase() + "-TT";
  let referralCode = baseCode;
  const { data: existingCodes } = await service
    .from("users")
    .select("referral_code")
    .like("referral_code", `${userName.split(" ")[0]?.toUpperCase()}%-TT`);

  if (existingCodes && existingCodes.length > 0) {
    const taken = new Set(existingCodes.map((r) => r.referral_code));
    if (taken.has(baseCode)) {
      let counter = 2;
      while (taken.has(`${userName.split(" ")[0]?.toUpperCase()}${counter}-TT`)) {
        counter++;
      }
      referralCode = `${userName.split(" ")[0]?.toUpperCase()}${counter}-TT`;
    }
  }

  await service.from("users").insert({
    id: userId,
    role: assignedRole,
    name: userName,
    terms_accepted_at: new Date().toISOString(),
    referral_code: referralCode,
    ...(tmRef ? { signup_tm_ref: tmRef } : {}),
  });

  if (assignedRole === "echo") {
    trackConversion({
      event: "signup",
      tmRef: tmRef || null,
      externalId: `echo_signup_${userId}`,
      metadata: { name: userName },
    }).catch(() => {});
  }

  if (assignedRole === "batteur") {
    return redirectAndClearIntent(new URL("/admin/dashboard", request.url));
  }
  return redirectAndClearIntent(new URL("/dashboard", request.url));
}
