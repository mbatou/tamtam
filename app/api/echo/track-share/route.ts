import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  const { campaignId, shareMethod } = await request.json();
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId requis" }, { status: 400 });
  }

  const validMethods = ["image_and_link", "fallback_download", "link_only"];
  const method = validMethods.includes(shareMethod) ? shareMethod : "link_only";

  // Get current share_count, then update
  const { data: link } = await supabase
    .from("tracked_links")
    .select("share_count")
    .eq("echo_id", authUser.id)
    .eq("campaign_id", campaignId)
    .single();

  await supabase
    .from("tracked_links")
    .update({
      last_share_method: method,
      share_count: (link?.share_count || 0) + 1,
    })
    .eq("echo_id", authUser.id)
    .eq("campaign_id", campaignId);

  return NextResponse.json({ success: true });
}
