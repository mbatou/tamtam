import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmailSafe } from "@/lib/email";
import { reminderTemplate } from "@/lib/email-templates/interests-campaign";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DELAY_MS = 2000;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: currentUser } = await supabase
    .from("users").select("role").eq("id", session.user.id).single();
  if (!currentUser || currentUser.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Find sends that were sent/delivered/opened but NOT clicked, 3+ days ago
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const { data: eligibleSends } = await supabase
    .from("email_sends")
    .select("id, user_id, email")
    .eq("campaign_id", campaignId)
    .in("status", ["sent", "delivered", "opened"])
    .lt("sent_at", threeDaysAgo);

  if (!eligibleSends || eligibleSends.length === 0) {
    return NextResponse.json({ error: "No eligible recipients for reminder" }, { status: 400 });
  }

  // Exclude users who already completed interests
  const userIds = eligibleSends.map((s) => s.user_id);
  const { data: completedUsers } = await supabase
    .from("users")
    .select("id")
    .in("id", userIds)
    .not("interests_completed_at", "is", null);

  const completedIds = new Set((completedUsers || []).map((u: { id: string }) => u.id));
  const toSend = eligibleSends.filter((s) => !completedIds.has(s.user_id));

  if (toSend.length === 0) {
    return NextResponse.json({ message: "All eligible recipients already completed interests" });
  }

  // Get names for personalization
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .in("id", toSend.map((s) => s.user_id));

  const nameMap = new Map((usersData || []).map((u: { id: string; name: string }) => [u.id, u.name]));

  let sentCount = 0;
  let failedCount = 0;

  for (const send of toSend) {
    const firstName = nameMap.get(send.user_id)?.split(" ")[0] || "Écho";

    const template = reminderTemplate({
      firstName,
      ctaUrl: `https://tamma.me/dashboard?interests_prompt=true&utm_source=email&utm_campaign=interests_reminder`,
      deadlineText: "le 30 avril",
    });

    const result = await sendEmailSafe({
      to: send.email,
      subject: template.subject,
      html: template.html,
      tags: [
        { name: "campaign", value: "interests_reminder" },
        { name: "type", value: "reminder" },
      ],
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  return NextResponse.json({
    eligible: toSend.length,
    sent: sentCount,
    failed: failedCount,
  });
}
