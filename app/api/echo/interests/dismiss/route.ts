import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("users")
    .update({ interests_prompt_dismissed_at: new Date().toISOString() })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
