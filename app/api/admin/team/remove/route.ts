import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { memberId } = await request.json();
  if (!memberId) {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Only owner can remove
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, brand_owner_id")
    .eq("id", session.user.id)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (currentUser.brand_owner_id) {
    return NextResponse.json(
      { error: "Seul le propriétaire peut retirer des membres" },
      { status: 403 }
    );
  }

  // Get the member before updating
  const { data: member } = await supabase
    .from("brand_team_members")
    .select("member_user_id")
    .eq("id", memberId)
    .eq("brand_owner_id", currentUser.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
  }

  // Mark as removed
  await supabase
    .from("brand_team_members")
    .update({ status: "removed", removed_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("brand_owner_id", currentUser.id);

  // Unlink the user from the brand
  if (member.member_user_id) {
    await supabase
      .from("users")
      .update({ brand_owner_id: null })
      .eq("id", member.member_user_id);
  }

  return NextResponse.json({ success: true });
}
