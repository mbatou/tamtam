import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthResponse } from "@/lib/api/auth";
import { validationError, apiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  token: z.string().regex(/^ExponentPushToken\[[A-Za-z0-9_-]+\]$/, "Invalid Expo push token"),
  platform: z.enum(["android", "ios"]).default("android"),
});

const removeSchema = z.object({
  token: z.string().min(10).max(200),
});

/** Register (or re-own) a native device push token for the current user. */
export async function POST(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { token, platform } = parsed.data;
  const { error } = await auth.supabase.from("push_tokens").upsert(
    {
      user_id: auth.authUser.id,
      token,
      platform,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    console.error("[push-token] upsert failed:", error.message);
    return apiError(500, "Erreur interne");
  }
  return NextResponse.json({ ok: true });
}

/** Unregister a device token (sign-out or toggle off). */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const { error } = await auth.supabase
    .from("push_tokens")
    .delete()
    .eq("token", parsed.data.token)
    .eq("user_id", auth.authUser.id);

  if (error) {
    console.error("[push-token] delete failed:", error.message);
    return apiError(500, "Erreur interne");
  }
  return NextResponse.json({ ok: true });
}
