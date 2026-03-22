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
  const p = `%${q}%`;

  // Search users by text columns only (not UUID id)
  const { data: users } = await supabase
    .from("users")
    .select("id, name, phone, city, role, status, balance, total_earned, company_name")
    .or(`name.ilike."${p}",phone.ilike."${p}",city.ilike."${p}"`)
    .order("total_earned", { ascending: false })
    .limit(10);

  // Search campaigns by text columns only
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, cpc, budget, spent, batteur_id")
    .or(`title.ilike."${p}",destination_url.ilike."${p}"`)
    .order("created_at", { ascending: false })
    .limit(8);

  // Search support tickets by text columns only
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, status, user_id, created_at")
    .or(`subject.ilike."${p}",message.ilike."${p}"`)
    .order("created_at", { ascending: false })
    .limit(5);

  // For payouts: find by matching user name first, then fetch their payouts
  const matchedUserIds = (users || []).map((u) => u.id);
  let payouts: { id: string; echo_id: string; amount: number; provider: string; status: string; created_at: string; echo_name?: string }[] = [];

  if (matchedUserIds.length > 0) {
    const { data: payoutData } = await supabase
      .from("payouts")
      .select("id, echo_id, amount, provider, status, created_at")
      .in("echo_id", matchedUserIds)
      .order("created_at", { ascending: false })
      .limit(8);

    // Attach echo name to each payout
    const nameMap = new Map((users || []).map((u) => [u.id, u.name]));
    payouts = (payoutData || []).map((p) => ({
      ...p,
      echo_name: nameMap.get(p.echo_id) || undefined,
    }));
  }

  // Also search payouts by provider name directly
  const { data: providerPayouts } = await supabase
    .from("payouts")
    .select("id, echo_id, amount, provider, status, created_at")
    .ilike("provider", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  // Merge provider payouts (avoid duplicates)
  if (providerPayouts?.length) {
    const existingIds = new Set(payouts.map((p) => p.id));
    for (const pp of providerPayouts) {
      if (!existingIds.has(pp.id)) {
        payouts.push(pp);
      }
    }
  }

  return NextResponse.json({
    users: users || [],
    campaigns: campaigns || [],
    tickets: tickets || [],
    payouts,
  });
}
