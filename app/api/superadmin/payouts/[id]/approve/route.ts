import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validatePayout } from "@/lib/payout-safety";
import { sendWhatsApp, formatSenegalPhone } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabaseAuth = createServiceClient();
  const { data: admin } = await supabaseAuth.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const validation = await validatePayout(params.id);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Balance already debited at request time — just mark as sent
  const { error } = await supabase
    .from("payouts")
    .update({ status: "sent", completed_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: "Failed to process payout" }, { status: 500 });
  }

  // WhatsApp notification to écho
  try {
    const { data: payout } = await supabase
      .from("payouts")
      .select("echo_id, amount, provider")
      .eq("id", params.id)
      .single();
    if (payout) {
      const { data: echo } = await supabase
        .from("users")
        .select("phone, balance")
        .eq("id", payout.echo_id)
        .single();
      if (echo?.phone) {
        sendWhatsApp({
          to: formatSenegalPhone(echo.phone),
          body: `💸 Retrait effectué!\n\n${payout.amount.toLocaleString()} FCFA envoyés sur ton ${payout.provider === "wave" ? "Wave" : "Orange Money"}\n\nSolde restant: ${(echo.balance || 0).toLocaleString()} FCFA\n\nContinue à partager pour gagner plus!\n👉 tamma.me/rythmes`,
        }).catch(() => {});
      }
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true });
}
