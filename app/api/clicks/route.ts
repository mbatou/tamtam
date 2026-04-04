import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  // Auth check
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Verify admin or superadmin role
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || !["batteur", "admin", "superadmin"].includes(user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Superadmin/admin can see all clicks; batteur only sees clicks for their campaigns
  if (user.role === "batteur") {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("batteur_id", session.user.id);
    const campaignIds = (campaigns || []).map((c) => c.id);
    if (campaignIds.length === 0) {
      return NextResponse.json([]);
    }
    const { data: linkIds } = await supabase
      .from("tracked_links")
      .select("id")
      .in("campaign_id", campaignIds);
    const ids = (linkIds || []).map((l) => l.id);
    if (ids.length === 0) {
      return NextResponse.json([]);
    }
    const { data, error } = await supabase
      .from("clicks")
      .select("*, tracked_links(short_code, campaigns(title), users(name))")
      .in("link_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("clicks")
    .select("*, tracked_links(short_code, campaigns(title), users(name))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
