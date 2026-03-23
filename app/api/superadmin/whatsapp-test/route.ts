import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendWhatsApp, formatSenegalPhone } from "@/lib/whatsapp";

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

  const { phone } = await request.json();
  if (!phone) {
    return NextResponse.json({ error: "Numéro requis" }, { status: 400 });
  }

  const success = await sendWhatsApp({
    to: formatSenegalPhone(phone),
    body: "🧪 Test Tamtam WhatsApp!\n\nSi tu reçois ce message, l'intégration WhatsApp fonctionne parfaitement.\n\n🥁 Tamtam — tamma.me",
  });

  return NextResponse.json({
    success,
    sid: success ? "sent" : null,
    error: success ? null : "Échec de l'envoi — vérifiez les credentials Twilio",
  });
}
