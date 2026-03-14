import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ echos: [], campaigns: [], tickets: [] });
  }

  const supabase = createServiceClient();
  const batteurId = session.user.id;
  const pattern = `%${q}%`;

  // Search echos that have worked with this brand
  const { data: brandCampaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("batteur_id", batteurId);

  const campaignIds = (brandCampaigns || []).map((c) => c.id);

  let echos: { id: string; name: string; phone: string; city: string; status: string }[] = [];
  if (campaignIds.length > 0) {
    const { data: links } = await supabase
      .from("tracked_links")
      .select("echo_id")
      .in("campaign_id", campaignIds);

    const echoIds = Array.from(new Set((links || []).map((l) => l.echo_id)));

    if (echoIds.length > 0) {
      const { data } = await supabase
        .from("users")
        .select("id, name, phone, city, status")
        .in("id", echoIds)
        .or(`name.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern},id.ilike.${pattern}`)
        .limit(8);

      echos = data || [];
    }
  }

  // Search campaigns belonging to this brand
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, cpc, budget, spent")
    .eq("batteur_id", batteurId)
    .or(`title.ilike.${pattern},id.ilike.${pattern},destination_url.ilike.${pattern}`)
    .limit(8);

  // Search support tickets
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, status, created_at")
    .eq("user_id", batteurId)
    .or(`subject.ilike.${pattern},message.ilike.${pattern},id.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    echos: echos || [],
    campaigns: campaigns || [],
    tickets: tickets || [],
  });
}
