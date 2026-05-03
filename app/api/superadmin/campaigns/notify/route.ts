import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendNewCampaignNotification } from "@/lib/email";

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
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
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

  // Paginate auth users to build email map
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

  let emailSent = 0;
  let emailFailed = 0;
  let whatsappReady = 0;
  let unreachable = 0;
  const whatsappLinks: { name: string; phone: string; link: string }[] = [];
  const logs: { echo_id: string; channel: string; status: string; error_message?: string }[] = [];

  for (const echo of echos) {
    const email = emailMap.get(echo.id);
    const phone = echo.phone;

    // Try email first
    if (email && process.env.RESEND_API_KEY) {
      try {
        await sendNewCampaignNotification({
          to: email,
          echoName: echo.name,
          campaignTitle: campaign.title,
          cpc: campaign.cpc,
        });
        emailSent++;
        logs.push({ echo_id: echo.id, channel: "email", status: "sent" });
      } catch (err) {
        emailFailed++;
        logs.push({ echo_id: echo.id, channel: "email", status: "failed", error_message: err instanceof Error ? err.message : "unknown" });
      }
    }

    // Generate WhatsApp link for echos with phone (regardless of email status)
    if (phone) {
      const link = buildWhatsAppLink(phone, campaign.title, campaign.cpc, campaign.budget);
      if (link) {
        whatsappReady++;
        whatsappLinks.push({ name: echo.name, phone, link });
        logs.push({ echo_id: echo.id, channel: "whatsapp", status: "manual" });
      }
    }

    // Track unreachable (no email AND no phone)
    if (!email && !phone) {
      unreachable++;
      logs.push({ echo_id: echo.id, channel: "none", status: "failed", error_message: "no_contact_info" });
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
      admin_id: session.user.id,
      action: "campaign_notify_echos",
      target_type: "campaign",
      target_id: campaign_id,
      details: { emailSent, emailFailed, whatsappReady, unreachable, total: echos.length },
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({
    success: true,
    total: echos.length,
    emailSent,
    emailFailed,
    whatsappReady,
    unreachable,
    whatsappLinks,
  });
}
