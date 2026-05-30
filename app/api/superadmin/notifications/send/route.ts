import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getNextNotifyDatetime } from "@/lib/notifications/smart-timing";
import { processNotificationQueue } from "@/lib/notifications/sender";
import {
  sendNotificationEmail,
  buildReengagementEmail,
  buildCustomNotificationEmail,
} from "@/lib/notifications/email-sender";

export const dynamic = "force-dynamic";

async function requireSuperadmin() {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return null;
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!user || !["superadmin", "admin"].includes(user.role)) return null;
  return { session, supabase };
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { supabase, session } = auth;

  const {
    echoIds,
    channels,
    pushTitle,
    pushBody,
    pushUrl,
    emailSubject,
    emailBody,
    scheduledAt,
    notificationType,
    campaignId,
    lang,
  } = await request.json();

  if (!echoIds || !Array.isArray(echoIds) || echoIds.length === 0) {
    return NextResponse.json({ error: "No recipients" }, { status: 400 });
  }
  if (!channels || channels.length === 0) {
    return NextResponse.json({ error: "No channels selected" }, { status: 400 });
  }

  let pushQueued = 0;
  let emailSent = 0;
  let emailFailed = 0;

  // Queue push notifications
  if (channels.includes("push")) {
    const entries = [];
    for (const echoId of echoIds) {
      let scheduledFor: string;
      if (scheduledAt === "smart") {
        const dt = await getNextNotifyDatetime(supabase, echoId);
        scheduledFor = dt.toISOString();
      } else if (scheduledAt === "now") {
        scheduledFor = new Date(Date.now() + 30_000).toISOString();
      } else {
        scheduledFor = scheduledAt;
      }

      entries.push({
        echo_id: echoId,
        type: notificationType === "custom" ? "manual" : notificationType || "manual",
        campaign_id: campaignId || null,
        scheduled_for: scheduledFor,
        status: "pending",
        payload: {
          title: pushTitle || "Tamtam",
          body: pushBody || "",
          url: pushUrl || "/rythmes",
          tag: `manual-${Date.now()}`,
          lang: lang || "fr",
        },
      });
    }

    const BATCH = 100;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const { error } = await supabase.from("notification_queue").insert(batch);
      if (!error) pushQueued += batch.length;
    }

    // Process immediately if sending now
    if (scheduledAt === "now") {
      processNotificationQueue(supabase).catch(() => {});
    }
  }

  // Send email notifications
  if (channels.includes("email") && emailSubject) {
    const { data: echos } = await supabase
      .from("users")
      .select("id, name, lang, created_at")
      .in("id", echoIds.slice(0, 500))
      .is("deleted_at", null);

    if (echos) {
      // Get emails via auth admin API (batched)
      const emailMap = new Map<string, string>();
      let page = 1;
      while (true) {
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ page, perPage: 500 });
        if (!authUsers || authUsers.length === 0) break;
        for (const u of authUsers) {
          if (u.email) emailMap.set(u.id, u.email);
        }
        if (authUsers.length < 500) break;
        page++;
      }

      for (const echo of echos) {
        const email = emailMap.get(echo.id);
        if (!email) continue;

        const echoLang = (lang === "both" ? (echo.lang || "fr") : (lang || "fr")) as "fr" | "en";

        let html: string;
        if (notificationType === "reengagement") {
          const daysSince = Math.floor(
            (Date.now() - new Date(echo.created_at).getTime()) / 86_400_000,
          );
          html = buildReengagementEmail(echo.name || "Echo", daysSince, echoLang);
        } else {
          html = buildCustomNotificationEmail(
            echo.name || "Echo",
            emailSubject,
            emailBody || "",
          );
        }

        const result = await sendNotificationEmail({
          to: email,
          subject: emailSubject,
          html,
        });

        if (result.success) emailSent++;
        else emailFailed++;
      }
    }
  }

  // Log admin action
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: session.user.id,
      action: "notification_manual_send",
      target_type: "notification",
      details: {
        channels,
        notificationType,
        recipientCount: echoIds.length,
        pushQueued,
        emailSent,
        emailFailed,
        scheduledAt,
      },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    pushQueued,
    emailSent,
    emailFailed,
  });
}
