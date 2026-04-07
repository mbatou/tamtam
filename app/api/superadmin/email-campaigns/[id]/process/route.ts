import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailSafe } from "@/lib/email";
import { getTemplateForSegment } from "@/lib/email-templates/interests-campaign";
import type { EchoSegment } from "@/lib/email-segments";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout

const BATCH_SIZE = 50;
const DELAY_MS = 2000; // 2 seconds between sends

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // Verify internal secret
  const secret = request.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Fetch pending sends
  const { data: pending, error } = await supabase
    .from("email_sends")
    .select("id, user_id, email")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(BATCH_SIZE);

  if (error || !pending || pending.length === 0) {
    await supabase
      .from("email_campaigns")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
    return NextResponse.json({ done: true });
  }

  // Fetch auth data for users in this batch to determine segments
  const userIds = pending.map((s) => s.user_id);
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .in("id", userIds);

  const userMap = new Map((usersData || []).map((u: { id: string; name: string }) => [u.id, u]));

  // Get auth data for last_sign_in_at
  const authDataMap = new Map<string, { lastSignIn: number }>();
  for (const send of pending) {
    try {
      const { data } = await supabase.auth.admin.getUserById(send.user_id);
      if (data?.user) {
        const lastSignIn = data.user.last_sign_in_at
          ? new Date(data.user.last_sign_in_at).getTime()
          : new Date(data.user.created_at).getTime();
        authDataMap.set(send.user_id, { lastSignIn });
      }
    } catch {
      // skip
    }
  }

  let sentCount = 0;
  let failedCount = 0;
  const deadlineText = "jusqu'au 30 avril";
  const now = Date.now();

  for (const send of pending) {
    const user = userMap.get(send.user_id);
    const authData = authDataMap.get(send.user_id);

    if (!authData) {
      failedCount++;
      await supabase.from("email_sends").update({
        status: "failed",
        error_message: "Could not fetch auth data",
      }).eq("id", send.id);
      continue;
    }

    const daysAgo = Math.floor((now - authData.lastSignIn) / 86400000);
    const segment: EchoSegment = daysAgo <= 7 ? "active" : daysAgo <= 30 ? "semi_active" : "dormant";
    const firstName = user?.name?.split(" ")[0] || "Écho";

    const ctaUrl = `https://tamma.me/dashboard?interests_prompt=true&utm_source=email&utm_campaign=interests_launch&utm_content=${segment}`;
    const template = getTemplateForSegment(segment, {
      firstName,
      ctaUrl,
      deadlineText,
    });

    const result = await sendEmailSafe({
      to: send.email,
      subject: template.subject,
      html: template.html,
      tags: [
        { name: "campaign", value: "interests_launch" },
        { name: "segment", value: segment },
      ],
    });

    if (result.success) {
      await supabase.from("email_sends").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_id: result.id || null,
      }).eq("id", send.id);
      sentCount++;
    } else {
      await supabase.from("email_sends").update({
        status: "failed",
        error_message: result.error,
      }).eq("id", send.id);
      failedCount++;
    }

    // Rate-limit delay
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  // Update campaign counters
  await supabase.rpc("increment_campaign_counters", {
    p_campaign_id: campaignId,
    p_sent: sentCount,
    p_failed: failedCount,
  });

  // Check remaining
  const { count } = await supabase
    .from("email_sends")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if (count && count > 0) {
    // Self-trigger next batch
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tamma.me";
    fetch(`${appUrl}/api/superadmin/email-campaigns/${campaignId}/process`, {
      method: "POST",
      headers: { "x-internal-secret": process.env.INTERNAL_SECRET || "" },
    }).catch(() => {});
  } else {
    await supabase
      .from("email_campaigns")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
  }

  return NextResponse.json({
    processed: pending.length,
    sent: sentCount,
    failed: failedCount,
    remaining: count || 0,
  });
}
