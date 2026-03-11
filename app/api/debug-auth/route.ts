import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const supabaseAdmin = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({
      authenticated: false,
      error: authError?.message || "No user found",
    });
  }

  // Use service role to bypass RLS and avoid recursion
  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from("users")
    .select("id, role, name")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    authenticated: true,
    authUser: { id: user.id, email: user.email },
    dbUser: dbUser || null,
    dbError: dbError?.message || null,
  });
}
