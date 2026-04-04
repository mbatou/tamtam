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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase } = auth;
  const { id } = params;

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*, challenge_rewards(*)")
    .eq("id", id)
    .single();

  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get participants with user names
  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("*, users!challenge_participants_echo_id_fkey(name)")
    .eq("challenge_id", id)
    .order("total_won", { ascending: false });

  // Get activity feed
  const { data: activityFeed } = await supabase
    .from("challenge_egg_cracks")
    .select("*, users!challenge_egg_cracks_echo_id_fkey(name)")
    .eq("challenge_id", id)
    .order("cracked_at", { ascending: false })
    .limit(50);

  // Enrich with stats
  const totalEggs = (challenge.challenge_rewards || []).reduce(
    (s: number, r: { total_quantity: number }) => s + r.total_quantity, 0
  );
  const eggsRemaining = (challenge.challenge_rewards || []).reduce(
    (s: number, r: { remaining_quantity: number }) => s + r.remaining_quantity, 0
  );

  return NextResponse.json({
    ...challenge,
    participants: participants || [],
    activityFeed: (activityFeed || []).map((e) => ({
      ...e,
      emoji: challenge.challenge_rewards?.find((r: { id: string; emoji: string }) => r.id === e.reward_id)?.emoji || "🥚",
    })),
    participantCount: (participants || []).length,
    totalEggs,
    eggsRemaining,
  });
}
