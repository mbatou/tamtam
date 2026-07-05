import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validationError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

const invitationActionSchema = z.object({
  invitationId: z.string().uuid("Invitation invalide"),
  action: z.enum(["accept", "decline"]),
});

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const {
    data: { user: authUser },
  } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = invitationActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const { invitationId, action } = parsed.data;

  const supabase = createServiceClient();

  const { data: invitation } = await supabase
    .from("brand_team_members")
    .select("id, email, brand_owner_id")
    .eq("id", invitationId)
    .eq("email", authUser.email?.toLowerCase().trim())
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
        member_user_id: authUser.id,
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
