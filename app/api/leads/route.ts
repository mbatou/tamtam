import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { sendLeadNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit: max 3 submissions per IP per hour
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(`lead:${ip}`, 3, 3600000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessaie dans 1 heure." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { business_name, contact_name, email, whatsapp, message } = parsed.data;

  // Check for duplicate email (don't create duplicate leads)
  const { data: existing } = await supabaseAdmin
    .from("brand_leads")
    .select("id")
    .eq("email", email)
    .eq("status", "new")
    .limit(1);

  if (existing?.length) {
    // Still show success to the user (don't reveal duplicate)
    return NextResponse.json({ success: true });
  }

  // Save to database
  const { error: insertError } = await supabaseAdmin
    .from("brand_leads")
    .insert({ business_name, contact_name, email, whatsapp: whatsapp || null, message: message || null });

  if (insertError) {
    console.error("Lead insert error:", insertError);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  // Send notification email (non-blocking)
  try {
    await sendLeadNotification({ business_name, contact_name, email, whatsapp, message });
  } catch (e) {
    console.error("Lead notification email failed:", e);
  }

  return NextResponse.json({ success: true });
}
