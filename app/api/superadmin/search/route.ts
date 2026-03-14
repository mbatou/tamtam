import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || user.role !== "superadmin") return null;
  return { session, supabase };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [], campaigns: [], tickets: [], payouts: [] });
  }

  const supabase = auth.supabase;
  const pattern = `%${q}%`;

  // Search all users (echos, brands, admins) by name, phone, city, email, or ID
  const { data: users } = await supabase
    .from("users")
    .select("id, name, phone, city, role, status, balance, total_earned")
    .or(`name.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern},id.ilike.${pattern}`)
    .order("total_earned", { ascending: false })
    .limit(10);

  // Search all campaigns by title, ID, or destination URL
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, cpc, budget, spent, batteur_id")
    .or(`title.ilike.${pattern},id.ilike.${pattern},destination_url.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(8);

  // Search support tickets by subject, message, or ID
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, status, user_id, created_at")
    .or(`subject.ilike.${pattern},message.ilike.${pattern},id.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(5);

  // Search payouts by ID or status
  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, echo_id, amount, provider, status, created_at")
    .or(`id.ilike.${pattern},provider.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    users: users || [],
    campaigns: campaigns || [],
    tickets: tickets || [],
    payouts: payouts || [],
  });
}
