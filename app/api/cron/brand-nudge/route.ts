import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find brands who signed up 3+ days ago, have 0 campaigns, and haven't been nudged
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: brands } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "batteur")
    .lte("created_at", threeDaysAgo);

  if (!brands?.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Filter out brands that already have campaigns
  const brandIds = brands.map((b) => b.id);
  const { data: campaignOwners } = await supabase
    .from("campaigns")
    .select("batteur_id")
    .in("batteur_id", brandIds);

  const ownersSet = new Set(campaignOwners?.map((c) => c.batteur_id) || []);

  // Filter out brands already nudged
  const { data: alreadySent } = await supabase
    .from("sent_emails")
    .select("user_id")
    .eq("email_type", "brand_nudge")
    .in("user_id", brandIds);

  const sentSet = new Set(alreadySent?.map((s) => s.user_id) || []);

  const toNudge = brands.filter((b) => !ownersSet.has(b.id) && !sentSet.has(b.id));
  if (!toNudge.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Get emails from auth
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers?.map((u) => [u.id, u.email]) || []);

  let sent = 0;
  for (const brand of toNudge) {
    const email = emailMap.get(brand.id);
    if (!email) continue;

    try {
      await sendEmail({
        to: email,
        subject: `${brand.name}, votre première campagne vous attend !`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #D35400;">Bonjour ${brand.name} !</h2>
            <p>Vous avez créé votre compte Tamtam mais n'avez pas encore lancé de campagne.</p>
            <p>Des centaines d'Échos sont prêts à partager vos liens. Lancez votre première campagne dès <strong>10 000 FCFA</strong> et obtenez vos premiers résultats en 24h.</p>
            <p style="margin-top: 20px;">
              <a href="https://www.tamma.me/admin/campaigns" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Créer ma campagne →</a>
            </p>
            <p style="margin-top: 20px; color: #888; font-size: 13px;">
              Besoin d'aide ? Répondez à cet email ou contactez-nous sur WhatsApp.
            </p>
          </div>
        `,
      });

      await supabase.from("sent_emails").insert({
        user_id: brand.id,
        email_type: "brand_nudge",
      });
      sent++;
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ sent });
}
