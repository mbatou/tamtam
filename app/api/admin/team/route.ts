import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  // Determine the brand owner ID
  const { data: currentUser } = await supabase
    .from("users")
    .select("id, brand_owner_id")
    .eq("id", session.user.id)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const ownerId = currentUser.brand_owner_id || currentUser.id;

  const { data: members } = await supabase
    .from("brand_team_members")
    .select("*")
    .eq("brand_owner_id", ownerId)
    .neq("status", "removed")
    .order("invited_at", { ascending: true });

  // Get member user details for accepted members
  const memberDetails = [];
  for (const member of members || []) {
    if (member.member_user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("id", member.member_user_id)
        .single();
      memberDetails.push({ ...member, user });
    } else {
      memberDetails.push({ ...member, user: null });
    }
  }

  return NextResponse.json({
    isOwner: !currentUser.brand_owner_id,
    ownerId,
    members: memberDetails,
  });
}
