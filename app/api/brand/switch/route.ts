import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateBrandAccess } from "@/lib/brand-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { brandId } = await request.json();
  if (!brandId) {
    return NextResponse.json({ error: "brandId requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const hasAccess = await validateBrandAccess(
    supabase,
    session.user.id,
    brandId
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await supabase
    .from("users")
    .update({ last_used_brand_id: brandId })
    .eq("id", session.user.id);

  return NextResponse.json({ success: true });
}
