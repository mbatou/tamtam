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

  const { invitationId, action } = await request.json();
  if (!invitationId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: invitation } = await supabase
    .from("brand_team_members")
    .select("id, email, brand_owner_id")
    .eq("id", invitationId)
    .eq("email", session.user.email?.toLowerCase().trim())
    .in("status", ["invited", "pending"])
    .is("removed_at", null)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation non trouvée" }, { status: 404 });
  }

  if (action === "accept") {
    await supabase
      .from("brand_team_members")
      .update({
        status: "active",
        accepted_at: new Date().toISOString(),
        member_user_id: session.user.id,
      })
      .eq("id", invitationId);

    return NextResponse.json({ success: true, action: "accepted" });
  }

  await supabase
    .from("brand_team_members")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  return NextResponse.json({ success: true, action: "declined" });
}
