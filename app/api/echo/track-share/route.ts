import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { campaignId, shareMethod } = await request.json();
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId requis" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const validMethods = ["image_and_link", "fallback_download", "link_only"];
  const method = validMethods.includes(shareMethod) ? shareMethod : "link_only";

  // Get current share_count, then update
  const { data: link } = await supabase
    .from("tracked_links")
    .select("share_count")
    .eq("echo_id", session.user.id)
    .eq("campaign_id", campaignId)
    .single();

  await supabase
    .from("tracked_links")
    .update({
      last_share_method: method,
      share_count: (link?.share_count || 0) + 1,
    })
    .eq("echo_id", session.user.id)
    .eq("campaign_id", campaignId);

  return NextResponse.json({ success: true });
}
