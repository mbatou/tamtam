import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { triggerNewCampaign } from "@/lib/notifications/engine";
import { processNotificationQueue } from "@/lib/notifications/sender";
import { sendSmsBatch } from "@/lib/sms/sms-service";

export const dynamic = "force-dynamic";

function formatPhone(phone: string): string | null {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  if (cleaned.startsWith("7") && cleaned.length === 9) cleaned = "+221" + cleaned;
  if (cleaned.startsWith("07") && cleaned.length === 10) cleaned = "+221" + cleaned.slice(1);
  if (cleaned.startsWith("221") && !cleaned.startsWith("+")) cleaned = "+" + cleaned;
  if (!cleaned.startsWith("+")) return null;
  return cleaned.replace("+", "");
}

function buildWhatsAppLink(phone: string, campaignTitle: string, cpc: number, budget: number): string {
  const formatted = formatPhone(phone);
  if (!formatted) return "";
  const msg = `🥁 Nouvelle campagne disponible sur Tamtam !\n\n*${campaignTitle}*\n\n💰 CPC : ${cpc} FCFA\n🎯 Budget : ${budget} FCFA\n\nConnecte-toi pour accepter 👉 https://tamma.me/dashboard`;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`;
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: admin } = await supabase.from("users").select("role").eq("id", authUser.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaign_id } = await request.json();
  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, cpc, budget, status")
    .eq("id", campaign_id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch all active echos with phone
  const { data: echos } = await supabase
    .from("users")
    .select("id, name, phone")
    .eq("role", "echo")
    .is("deleted_at", null);

  if (!echos?.length) {
    return NextResponse.json({ error: "No echos found" }, { status: 404 });
  }

  // `new_campaign` routes to push + SMS — this tool used to email every Écho
  // instead, which was a fourth copy of a message push, SMS and the in-app
  // feed already carry. The WhatsApp links below stay: they are a manual
  // outreach aid for a human, not an automated channel.
  const pushResult = await triggerNewCampaign(supabase, campaign_id)
    .then(async (queued) => {
      await processNotificationQueue(supabase);
      return queued;
    })
    .catch((err) => {
      console.error("[notify] push blast failed:", err);
      return { queued: 0, skipped: 0 };
    });

  const smsResult = await sendSmsBatch({
    type: "new_campaign",
    campaignId: campaign_id,
    segment: "all",
    vars: { cpc: campaign.cpc || 50 },
  }).catch((err) => {
    console.error("[notify] SMS blast failed:", err);
    return { sent: 0, failed: 0, skipped: 0, total: 0, details: [] };
  });

  let whatsappReady = 0;
  let unreachable = 0;
  const whatsappLinks: { name: string; phone: string; link: string }[] = [];
  const logs: { echo_id: string; channel: string; status: string; error_message?: string }[] = [];

  for (const echo of echos) {
    const phone = echo.phone;

    if (phone) {
      const link = buildWhatsAppLink(phone, campaign.title, campaign.cpc, campaign.budget);
      if (link) {
        whatsappReady++;
        whatsappLinks.push({ name: echo.name, phone, link });
        logs.push({ echo_id: echo.id, channel: "whatsapp", status: "manual" });
      }
    } else {
      unreachable++;
      logs.push({ echo_id: echo.id, channel: "none", status: "failed", error_message: "no_phone" });
    }
  }

  // Batch insert notification logs (non-blocking)
  if (logs.length > 0) {
    const logRows = logs.map((l) => ({
      campaign_id,
      echo_id: l.echo_id,
      channel: l.channel,
      status: l.status,
      error_message: l.error_message || null,
    }));
    // Insert in chunks to avoid payload size limits
    for (let i = 0; i < logRows.length; i += 500) {
      try {
        await supabase.from("notification_logs").upsert(
          logRows.slice(i, i + 500),
          { onConflict: "campaign_id,echo_id,channel" }
        );
      } catch { /* non-blocking — table may not exist yet */ }
    }
  }

  // Log admin action
  try {
    await supabase.from("admin_activity_log").insert({
      admin_id: authUser.id,
      action: "campaign_notify_echos",
      target_type: "campaign",
      target_id: campaign_id,
      details: {
        pushQueued: pushResult.queued,
        smsSent: smsResult.sent,
        whatsappReady,
        unreachable,
        total: echos.length,
      },
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({
    success: true,
    total: echos.length,
    pushQueued: pushResult.queued,
    pushSkipped: pushResult.skipped,
    smsSent: smsResult.sent,
    smsFailed: smsResult.failed,
    smsSkipped: smsResult.skipped,
    whatsappReady,
    unreachable,
    whatsappLinks,
  });
}
