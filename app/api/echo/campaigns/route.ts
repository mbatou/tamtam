import { NextResponse } from "next/server";
import { requireAuthResponse } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuthResponse(undefined, request);
  if (auth instanceof NextResponse) return auth;
  const { authUser, supabase } = auth;

  // Get the echo's city for targeting filter
  const { data: user } = await supabase
    .from("users")
    .select("city")
    .eq("id", authUser.id)
    .single();

  const echoCity = user?.city || null;

  // Get active, approved campaigns for echos to discover
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by city targeting: show campaigns with no targeting (all Senegal)
  // or campaigns that target the echo's city
  const filtered = data?.filter((campaign) => {
    if (!campaign.target_cities || campaign.target_cities.length === 0) return true;
    if (!echoCity) return true; // If echo has no city set, show all campaigns
    return campaign.target_cities.includes(echoCity);
  }) || [];

  return NextResponse.json(filtered);
}
