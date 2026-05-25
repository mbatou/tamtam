import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveBrandId } from "@/lib/brand-utils";

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
  const ownerId = await getEffectiveBrandId(supabase, session.user.id);

  const isOwner = ownerId === session.user.id;

  const { data: members } = await supabase
    .from("brand_team_members")
    .select("*")
    .eq("brand_owner_id", ownerId)
    .neq("status", "removed")
    .is("removed_at", null)
    .order("invited_at", { ascending: true });

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
    isOwner,
    ownerId,
    members: memberDetails,
  });
}
