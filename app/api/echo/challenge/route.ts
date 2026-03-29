import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Find active challenge
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*, challenge_rewards(*)")
    .eq("status", "active")
    .lte("start_date", now)
    .gte("end_date", now)
    .single();

  if (!challenge) return NextResponse.json({ challenge: null });

  // Get echo's participation
  const { data: participation } = await supabase
    .from("challenge_participants")
    .select("*")
    .eq("challenge_id", challenge.id)
    .eq("echo_id", session.user.id)
    .single();

  // Count total eggs remaining
  const totalRemaining = (challenge.challenge_rewards || []).reduce(
    (sum: number, r: { remaining_quantity: number }) => sum + r.remaining_quantity, 0
  );

  // Recent egg cracks (live feed)
  const { data: recentCracks } = await supabase
    .from("challenge_egg_cracks")
    .select("*, users!challenge_egg_cracks_echo_id_fkey(name)")
    .eq("challenge_id", challenge.id)
    .order("cracked_at", { ascending: false })
    .limit(10);

  // Get echo's name for share card
  const { data: echoUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({
    challenge,
    participation: participation || { valid_clicks: 0, eggs_earned: 0, total_won: 0 },
    eggsRemaining: totalRemaining,
    recentCracks: recentCracks || [],
    clicksNeeded: challenge.clicks_per_reward,
    echoName: echoUser?.name || "Echo",
  });
}
