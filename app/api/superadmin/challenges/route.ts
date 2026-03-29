import { NextResponse } from "next/server";
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

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { supabase } = auth;

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, challenge_rewards(*)")
    .order("created_at", { ascending: false });

  if (!challenges) return NextResponse.json([]);

  // Enrich with participant counts and egg stats
  const enriched = await Promise.all(
    challenges.map(async (c) => {
      const { count } = await supabase
        .from("challenge_participants")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", c.id);

      const totalEggs = (c.challenge_rewards || []).reduce(
        (s: number, r: { total_quantity: number }) => s + r.total_quantity, 0
      );
      const eggsRemaining = (c.challenge_rewards || []).reduce(
        (s: number, r: { remaining_quantity: number }) => s + r.remaining_quantity, 0
      );

      return {
        ...c,
        participantCount: count || 0,
        totalEggs,
        eggsRemaining,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { supabase, session } = auth;
  const body = await req.json();

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      name: body.name,
      description: body.description,
      theme: body.theme || "easter_egg",
      campaign_id: body.campaign_id || null,
      start_date: body.start_date,
      end_date: body.end_date,
      total_budget: body.total_budget,
      clicks_per_reward: body.clicks_per_reward || 10,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error || !challenge) {
    return NextResponse.json({ error: error?.message || "Creation failed" }, { status: 500 });
  }

  // Insert reward tiers
  if (body.rewards && Array.isArray(body.rewards)) {
    const rewardRows = body.rewards.map((r: {
      tier: string;
      amount: number;
      total_quantity: number;
      remaining_quantity: number;
      emoji: string;
      color: string;
    }) => ({
      challenge_id: challenge.id,
      tier: r.tier,
      amount: r.amount,
      total_quantity: r.total_quantity,
      remaining_quantity: r.remaining_quantity,
      emoji: r.emoji || "🥚",
      color: r.color || null,
    }));

    await supabase.from("challenge_rewards").insert(rewardRows);
  }

  return NextResponse.json(challenge);
}
