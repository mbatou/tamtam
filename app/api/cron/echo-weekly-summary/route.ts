import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendRoutedEmailBatch } from "@/lib/notifications/email-router";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import { verifyCronSecret } from "@/lib/api/cron";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get clicks from the past week grouped by echo
  const { data: clicks } = await supabase
    .from("clicks")
    .select("link_id, is_valid, created_at, tracked_links!inner(echo_id, campaign_id, campaigns!inner(title, cpc))")
    .gte("created_at", oneWeekAgo);

  if (!clicks?.length) {
    return NextResponse.json({ sent: 0 });
  }

  // Aggregate by echo
  const echoStats = new Map<string, { validClicks: number; earnings: number; campaigns: Set<string> }>();

  for (const click of clicks) {
    const link = click.tracked_links as unknown as { echo_id: string; campaign_id: string; campaigns: { title: string; cpc: number } };
    const echoId = link.echo_id;
    const stats = echoStats.get(echoId) || { validClicks: 0, earnings: 0, campaigns: new Set<string>() };
    if (click.is_valid) {
      stats.validClicks++;
      stats.earnings += Math.floor(link.campaigns.cpc * ECHO_SHARE_PERCENT / 100);
    }
    stats.campaigns.add(link.campaigns.title);
    echoStats.set(echoId, stats);
  }

  if (!echoStats.size) {
    return NextResponse.json({ sent: 0 });
  }

  // Check for recent summary emails
  const echoIds = Array.from(echoStats.keys());
  const { data: recentSent } = await supabase
    .from("sent_emails")
    .select("user_id")
    .eq("email_type", "echo_weekly_summary")
    .gte("created_at", new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString())
    .in("user_id", echoIds);

  const recentSet = new Set(recentSent?.map((s) => s.user_id) || []);

  // Get echo names
  const { data: echos } = await supabase
    .from("users")
    .select("id, name")
    .in("id", echoIds);

  // Address resolution, opt-out checks, the ledger write and the unsubscribe
  // footer all live in the router now. It also paginates properly — the old
  // `listUsers({ perPage: 1000 })` here silently dropped every Écho past #1000,
  // and the platform is at 1 505.
  const toSend = (echos || [])
    .filter((echo) => !recentSet.has(echo.id) && echoStats.get(echo.id)?.validClicks)
    .map((echo) => ({ echo, stats: echoStats.get(echo.id)! }));

  const totals = await sendRoutedEmailBatch(
    supabase,
    "echo_weekly_summary",
    toSend.map(({ echo, stats }) => {
      const campaignList = Array.from(stats.campaigns).slice(0, 5).join(", ");
      return {
        userId: echo.id,
        subject: `💰 Ton résumé hebdo — ${stats.earnings.toLocaleString()} FCFA gagnés`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #D35400;">Bravo ${echo.name} !</h2>
              <p>Voici ton résumé de la semaine sur Tamtam :</p>
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <table style="border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 16px 6px 0; color: #666;">Clics valides</td>
                    <td style="padding: 6px 0; font-weight: bold; font-size: 18px;">${stats.validClicks}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 16px 6px 0; color: #666;">Gains</td>
                    <td style="padding: 6px 0; font-weight: bold; font-size: 18px; color: #22c55e;">${stats.earnings.toLocaleString()} FCFA</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 16px 6px 0; color: #666;">Rythmes</td>
                    <td style="padding: 6px 0;">${campaignList}</td>
                  </tr>
                </table>
              </div>
              <p>Continue à partager pour augmenter tes gains !</p>
              <p style="margin-top: 20px;">
                <a href="https://www.tamma.me/dashboard" style="display: inline-block; padding: 12px 24px; background: #D35400; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir mon tableau de bord →</a>
              </p>
            </div>
          `,
      };
    }),
    { dedupeWithinHours: 6 * 24 },
  );

  // The duplicate push blast that used to live here is gone. A weekly recap is
  // a record, not a nudge — push added nothing the email did not say, and this
  // one initialised web-push by hand, so it bypassed notification_prefs, the
  // daily cap and the queue entirely. Engagement lives on push through the
  // notification engine (inactivity, share reminders); recaps live on email.

  return NextResponse.json({
    sent: totals.sent,
    suppressed: totals.suppressed,
    failed: totals.failed,
  });
}
