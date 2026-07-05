import { NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const { error } = await supabase
    .from("users")
    .update({ interests_prompt_dismissed_at: new Date().toISOString() })
    .eq("id", authUser.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
