import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { broadcastWhatsApp, formatSenegalPhone } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: admin } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { message, audience, mediaUrl } = await request.json();

  if (!message || !audience) {
    return NextResponse.json({ error: "Message et audience requis" }, { status: 400 });
  }

  let recipients: { phone: string; name: string }[] = [];

  if (audience === "all_echos") {
    const { data } = await supabase
      .from("users")
      .select("phone, name")
      .eq("role", "echo")
      .not("phone", "is", null);
    recipients = (data || []).filter((r) => r.phone);
  } else if (audience === "all_brands") {
    const { data } = await supabase
      .from("users")
      .select("phone, name")
      .in("role", ["batteur", "brand"])
      .not("phone", "is", null);
    recipients = (data || []).filter((r) => r.phone);
  } else if (audience === "active_echos") {
    // Échos with clicks in last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentClicks } = await supabase
      .from("clicks")
      .select("tracked_links!inner(echo_id)")
      .gte("created_at", oneWeekAgo)
      .eq("is_valid", true);

    const activeEchoIdSet = new Set(
      (recentClicks || []).map(
        (c) => (c.tracked_links as unknown as { echo_id: string }).echo_id,
      ),
    );
    const activeEchoIds = Array.from(activeEchoIdSet);

    if (activeEchoIds.length) {
      const { data } = await supabase
        .from("users")
        .select("phone, name")
        .in("id", activeEchoIds)
        .not("phone", "is", null);
      recipients = (data || []).filter((r) => r.phone);
    }
  }

  if (!recipients.length) {
    return NextResponse.json({ totalRecipients: 0, sent: 0, failed: 0 });
  }

  const formattedRecipients = recipients.map((r) => ({
    phone: formatSenegalPhone(r.phone),
    body: message.replace(/\{name\}/g, r.name || ""),
    mediaUrl: mediaUrl || undefined,
  }));

  // Send in background — return immediately with recipient count
  const broadcastPromise = broadcastWhatsApp(formattedRecipients, 500);

  broadcastPromise.then((result) => {
    console.log(
      `WhatsApp broadcast (${audience}): ${result.sent} sent, ${result.failed} failed out of ${formattedRecipients.length}`,
    );
  });

  return NextResponse.json({
    totalRecipients: formattedRecipients.length,
    status: "sending",
  });
}
