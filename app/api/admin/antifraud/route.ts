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

  const { data: currentUser } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || !["batteur", "admin", "superadmin"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const brandId = await getEffectiveBrandId(supabase, session.user.id);

  // Get brand's campaign IDs
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("batteur_id", brandId);

  const campaignIds = (campaigns || []).map((c) => c.id);

  if (campaignIds.length === 0) {
    return NextResponse.json({
      totalClicks: 0,
      validClicks: 0,
      invalidClicks: 0,
      fraudRate: 0,
      recentClicks: [],
    });
  }

  // Get tracked link IDs for brand's campaigns
  const { data: links } = await supabase
    .from("tracked_links")
    .select("id")
    .in("campaign_id", campaignIds);

  const linkIds = (links || []).map((l) => l.id);

  if (linkIds.length === 0) {
    return NextResponse.json({
      totalClicks: 0,
      validClicks: 0,
      invalidClicks: 0,
      fraudRate: 0,
      recentClicks: [],
    });
  }

  // Run counts and recent clicks in parallel
  const [totalRes, validRes, invalidRes, recentRes] = await Promise.all([
    supabase.from("clicks").select("*", { count: "exact", head: true }).in("link_id", linkIds),
    supabase.from("clicks").select("*", { count: "exact", head: true }).in("link_id", linkIds).eq("is_valid", true),
    supabase.from("clicks").select("*", { count: "exact", head: true }).in("link_id", linkIds).eq("is_valid", false),
    supabase
      .from("clicks")
      .select("id, ip_address, is_valid, created_at, tracked_links(short_code, users(name), campaigns(title))")
      .in("link_id", linkIds)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const total = totalRes.count || 0;
  const valid = validRes.count || 0;
  const invalid = invalidRes.count || 0;

  return NextResponse.json({
    totalClicks: total,
    validClicks: valid,
    invalidClicks: invalid,
    fraudRate: total > 0 ? Math.round((invalid / total) * 100) : 0,
    recentClicks: recentRes.data || [],
  });
}
