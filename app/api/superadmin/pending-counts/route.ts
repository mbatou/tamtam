import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const supabase = createServiceClient();

  const [
    { count: pendingLeads },
    { count: pendingPayouts },
    { count: pendingCampaigns },
  ] = await Promise.all([
    supabase.from("brand_leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("moderation_status", "pending"),
  ]);

  // Calculate fraud rate
  let highFraud = false;
  try {
    const { count: totalClicks } = await supabase.from("clicks").select("*", { count: "exact", head: true });
    const { count: fraudClicks } = await supabase.from("clicks").select("*", { count: "exact", head: true }).eq("is_valid", false);
    if ((totalClicks || 0) > 0) {
      highFraud = ((fraudClicks || 0) / (totalClicks || 1) * 100) > 15;
    }
  } catch {}

  return NextResponse.json({
    pendingLeads: pendingLeads || 0,
    pendingPayouts: pendingPayouts || 0,
    pendingCampaigns: pendingCampaigns || 0,
    highFraud,
  });
}
