import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAccessibleBrands, getPendingInvitations } from "@/lib/brand-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [brands, pending] = await Promise.all([
    getAccessibleBrands(supabase, session.user.id),
    getPendingInvitations(supabase, session.user.email || ""),
  ]);

  return NextResponse.json({ brands, pending });
}
