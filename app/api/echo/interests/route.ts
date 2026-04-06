import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logWalletTransaction } from "@/lib/wallet-transactions";

export const dynamic = "force-dynamic";

const REWARD_DEADLINE = new Date("2026-04-30T23:59:59Z");
const REWARD_AMOUNT = 100;

export async function GET() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const [categoriesRes, signalsRes, userInterestsRes, userSignalsRes, userRes] = await Promise.all([
    supabase.from("interest_categories").select("*").order("sort_order"),
    supabase.from("content_signals").select("*").order("sort_order"),
    supabase.from("echo_interests").select("interest_id").eq("echo_id", session.user.id),
    supabase.from("echo_content_signals").select("signal_id").eq("echo_id", session.user.id),
    supabase.from("users").select("interests_completed_at, is_founding_echo, interests_prompt_dismissed_at").eq("id", session.user.id).single(),
  ]);

  return NextResponse.json({
    categories: categoriesRes.data || [],
    signals: signalsRes.data || [],
    selectedInterests: (userInterestsRes.data || []).map((r: { interest_id: string }) => r.interest_id),
    selectedSignals: (userSignalsRes.data || []).map((r: { signal_id: string }) => r.signal_id),
    interestsCompletedAt: userRes.data?.interests_completed_at || null,
    isFoundingEcho: userRes.data?.is_founding_echo || false,
    interestsPromptDismissedAt: userRes.data?.interests_prompt_dismissed_at || null,
  });
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { interest_ids, signal_ids } = body as { interest_ids: string[]; signal_ids: string[] };

  // Validate
  if (!Array.isArray(interest_ids) || interest_ids.length < 1 || interest_ids.length > 5) {
    return NextResponse.json({ error: "Choisis entre 1 et 5 centres d'intérêt" }, { status: 400 });
  }
  if (!Array.isArray(signal_ids) || signal_ids.length < 1 || signal_ids.length > 3) {
    return NextResponse.json({ error: "Choisis entre 1 et 3 types de contenu" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const userId = session.user.id;

  try {
    // Check if this is the first completion
    const { data: user } = await supabase
      .from("users")
      .select("interests_completed_at, balance")
      .eq("id", userId)
      .single();

    const isFirstCompletion = !user?.interests_completed_at;

    // Delete existing selections and insert new ones
    await Promise.all([
      supabase.from("echo_interests").delete().eq("echo_id", userId),
      supabase.from("echo_content_signals").delete().eq("echo_id", userId),
    ]);

    await Promise.all([
      supabase.from("echo_interests").insert(
        interest_ids.map((id: string) => ({ echo_id: userId, interest_id: id }))
      ),
      supabase.from("echo_content_signals").insert(
        signal_ids.map((id: string) => ({ echo_id: userId, signal_id: id }))
      ),
    ]);

    let rewardCredited = false;
    let foundingBadge = false;

    if (isFirstCompletion) {
      const now = new Date();
      const withinDeadline = now <= REWARD_DEADLINE;

      const updates: Record<string, unknown> = {
        interests_completed_at: now.toISOString(),
      };

      if (withinDeadline) {
        updates.is_founding_echo = true;
        updates.balance = (user?.balance || 0) + REWARD_AMOUNT;
        rewardCredited = true;
        foundingBadge = true;
      }

      await supabase.from("users").update(updates).eq("id", userId);

      if (rewardCredited) {
        await logWalletTransaction({
          supabase,
          userId,
          amount: REWARD_AMOUNT,
          type: "interest_reward",
          description: "Récompense pour avoir complété ses centres d'intérêt — Écho Fondateur",
          sourceType: "interest_onboarding",
        });
      }
    }

    return NextResponse.json({
      success: true,
      reward_credited: rewardCredited,
      amount: rewardCredited ? REWARD_AMOUNT : 0,
      founding_badge: foundingBadge,
    });
  } catch (error) {
    console.error("Interest save error:", error);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }
}
