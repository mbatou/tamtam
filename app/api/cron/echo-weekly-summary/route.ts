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
      stats.earnings += Math.floor(link.campaigns.cpc * 0.75);
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

  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers?.map((u) => [u.id, u.email]) || []);

  let sent = 0;
  for (const echo of echos || []) {
    if (recentSet.has(echo.id)) continue;
    const email = emailMap.get(echo.id);
    if (!email) continue;

    const stats = echoStats.get(echo.id);
    if (!stats || stats.validClicks === 0) continue;

    const campaignList = Array.from(stats.campaigns).slice(0, 5).join(", ");

    try {
      await sendEmail({
        to: email,
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
            <p style="margin-top: 20px; color: #888; font-size: 13px;">
              Tu reçois cet email car tu es Écho sur Tamtam.
            </p>
          </div>
        `,
      });

      await supabase.from("sent_emails").insert({
        user_id: echo.id,
        email_type: "echo_weekly_summary",
      });
      sent++;
    } catch { /* non-blocking */ }
  }

  // Also send push notifications to echos with push subscriptions
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", echoIds);

  if (subscriptions?.length && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpush = require("web-push");
      webpush.setVapidDetails(
        "mailto:support@tamma.me",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      for (const sub of subscriptions) {
        const stats = echoStats.get(sub.user_id);
        if (!stats || stats.validClicks === 0) continue;

        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: `${stats.earnings.toLocaleString()} FCFA gagnés cette semaine`,
              body: `${stats.validClicks} clics valides. Continue à partager !`,
              url: "/dashboard",
            })
          );
        } catch { /* subscription may be expired */ }
      }
    } catch { /* web-push not available */ }
  }

  return NextResponse.json({ sent });
}
