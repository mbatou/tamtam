import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const supabase = createServiceClient();
  const { challengeId } = await req.json();

  // Get participant
  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("echo_id", session.user.id)
    .single();

  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 400 });

  // Get challenge
  const { data: challenge } = await supabase
    .from("challenges")
    .select("clicks_per_reward, name")
    .eq("id", challengeId)
    .single();

  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });

  // Check if echo has enough clicks for another egg
  const clicksForNextEgg = (participant.eggs_earned + 1) * challenge.clicks_per_reward;
  if (participant.valid_clicks < clicksForNextEgg) {
    return NextResponse.json({ error: "Not enough clicks" }, { status: 400 });
  }

  // Pick a random reward from remaining
  const { data: availableRewards } = await supabase
    .from("challenge_rewards")
    .select("*")
    .eq("challenge_id", challengeId)
    .gt("remaining_quantity", 0);

  if (!availableRewards || availableRewards.length === 0) {
    return NextResponse.json({ error: "No eggs remaining" }, { status: 400 });
  }

  // Weighted random: more bronze eggs = higher chance of getting bronze
  const totalRemaining = availableRewards.reduce((s, r) => s + r.remaining_quantity, 0);
  let random = Math.random() * totalRemaining;
  let selectedReward = availableRewards[0];
  for (const reward of availableRewards) {
    random -= reward.remaining_quantity;
    if (random <= 0) {
      selectedReward = reward;
      break;
    }
  }

  // Decrement reward quantity
  await supabase
    .from("challenge_rewards")
    .update({ remaining_quantity: selectedReward.remaining_quantity - 1 })
    .eq("id", selectedReward.id);

  // Log the crack
  await supabase
    .from("challenge_egg_cracks")
    .insert({
      challenge_id: challengeId,
      echo_id: session.user.id,
      reward_id: selectedReward.id,
      amount: selectedReward.amount,
      tier: selectedReward.tier,
    });

  // Update participant
  await supabase
    .from("challenge_participants")
    .update({
      eggs_earned: participant.eggs_earned + 1,
      total_won: participant.total_won + selectedReward.amount,
    })
    .eq("id", participant.id);

  // Credit to echo wallet
  const { data: echoUser } = await supabase
    .from("users")
    .select("balance")
    .eq("id", session.user.id)
    .single();

  if (echoUser) {
    await supabase
      .from("users")
      .update({ balance: echoUser.balance + selectedReward.amount })
      .eq("id", session.user.id);
  }

  // Log wallet transaction
  await logWalletTransaction({
    supabase,
    userId: session.user.id,
    amount: selectedReward.amount,
    type: "badge_reward",
    description: `🥚 Oeuf ${selectedReward.tier} — ${challenge.name || "Challenge"}`,
    sourceId: challengeId,
    sourceType: "challenge",
  });

  // Update challenge budget spent
  const { data: currentChallenge } = await supabase
    .from("challenges")
    .select("budget_spent")
    .eq("id", challengeId)
    .single();

  if (currentChallenge) {
    await supabase
      .from("challenges")
      .update({ budget_spent: currentChallenge.budget_spent + selectedReward.amount })
      .eq("id", challengeId);
  }

  return NextResponse.json({
    success: true,
    reward: {
      tier: selectedReward.tier,
      amount: selectedReward.amount,
      emoji: selectedReward.emoji,
      color: selectedReward.color,
    },
  });
}
