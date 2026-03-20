import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifyCronSecret(authHeader: string | null): boolean {
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!authHeader || authHeader.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all brands with active or recently completed campaigns
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("batteur_id, title, status, spent, budget, cpc")
    .in("status", ["active", "paused", "completed"])
    .gte("created_at", oneWeekAgo);

  if (!campaigns?.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Group campaigns by brand
  const brandCampaigns = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    const existing = brandCampaigns.get(c.batteur_id) || [];
    existing.push(c);
    brandCampaigns.set(c.batteur_id, existing);
  }

  // Get brand names
  const brandIds = Array.from(brandCampaigns.keys());
  const { data: brands } = await supabase
    .from("users")
    .select("id, name")
    .in("id", brandIds);

  if (!brands?.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Check for recent summary emails (avoid double-send)
  const { data: recentSent } = await supabase
    .from("sent_emails")
    .select("user_id")
    .eq("email_type", "brand_weekly_summary")
    .gte("created_at", new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
    .in("user_id", brandIds);

  const recentSet = new Set(recentSent?.map((s) => s.user_id) || []);

  // Get auth emails
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers?.map((u) => [u.id, u.email]) || []);

  let sent = 0;
  for (const brand of brands) {
    if (recentSet.has(brand.id)) continue;
    const email = emailMap.get(brand.id);
    if (!email) continue;

    const myCampaigns = brandCampaigns.get(brand.id) || [];
    const totalSpent = myCampaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalBudget = myCampaigns.reduce((sum, c) => sum + c.budget, 0);
    const activeCampaigns = myCampaigns.filter((c) => c.status === "active").length;

    const campaignRows = myCampaigns
      .map((c) => {
        const statusLabel = c.status === "active" ? "🟢 Actif" : c.status === "paused" ? "⏸ Pause" : "✅ Terminé";
        const clicks = c.cpc > 0 ? Math.floor(c.spent / c.cpc) : 0;
        return `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${c.title}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${statusLabel}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${clicks} clics</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${c.spent.toLocaleString()} FCFA</td>
        </tr>`;
      })
      .join("");

    try {
      await sendEmail({
        to: email,
        subject: `📊 Résumé hebdo — ${activeCampaigns} campagne(s) active(s)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #D35400;">Bonjour ${brand.name} !</h2>
            <p>Voici le résumé de vos campagnes cette semaine :</p>
            <div style="background: #fef3e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #666;">Campagnes actives</td>
                  <td style="padding: 4px 0; font-weight: bold; text-align: right;">${activeCampaigns}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666;">Total dépensé</td>
                  <td style="padding: 4px 0; font-weight: bold; text-align: right;">${totalSpent.toLocaleString()} FCFA</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #666;">Budget restant</td>
                  <td style="padding: 4px 0; font-weight: bold; text-align: right;">${(totalBudget - totalSpent).toLocaleString()} FCFA</td>
                </tr>
              </table>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #666;">Campagne</th>
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #666;">Statut</th>
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #666;">Clics</th>
                  <th style="padding: 8px; text-align: left; font-size: 12px; color: #666;">Dépensé</th>
                </tr>
              </thead>
              <tbody>${campaignRows}</tbody>
            </table>
            <p style="margin-top: 20px;">
              <a href="https://www.tamma.me/admin/analytics" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir mes analytics →</a>
            </p>
            <p style="margin-top: 20px; color: #888; font-size: 13px;">
              Vous recevez cet email car vous avez des campagnes actives sur Tamtam.
            </p>
          </div>
        `,
      });

      await supabase.from("sent_emails").insert({
        user_id: brand.id,
        email_type: "brand_weekly_summary",
      });
      sent++;
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ sent });
}
