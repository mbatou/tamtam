import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function generateInvitationEmail({ firstName, companyName, signupUrl }: { firstName: string; companyName?: string; signupUrl: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F0F1F;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="color:#D35400;font-size:28px;font-weight:bold;">Tamtam</span>
      <span style="color:#D35400;font-size:18px;letter-spacing:3px;"> ||||</span>
    </div>
    <div style="background:#1A1A2E;border-radius:16px;padding:32px;border:1px solid #2A2A3E;">
      <h1 style="color:#FFFFFF;font-size:22px;margin:0 0 8px;">Bonjour ${firstName}</h1>
      <p style="color:#AAAAAA;font-size:15px;line-height:1.7;margin:0 0 20px;">
        ${companyName ? `Vous avez inscrit <strong style="color:#FFFFFF;">${companyName}</strong> sur notre liste d'attente.` : "Vous vous \u00eates inscrit sur notre liste d'attente."}
        <br><br>
        <strong style="color:#D35400;">Les inscriptions sont maintenant ouvertes!</strong>
      </p>

      <div style="background:linear-gradient(135deg,#D35400,#F39C12);border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="color:#FFFFFF;font-size:16px;font-weight:bold;margin:0;">2,000 FCFA offerts \u00e0 l'inscription!</p>
        <p style="color:#FFD6B0;font-size:13px;margin:4px 0 0;">Offre limit\u00e9e \u2014 valable jusqu'au 1er avril 2026</p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${signupUrl}" style="background:#D35400;color:#FFFFFF;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
          Cr\u00e9er mon compte Batteur
        </a>
      </div>

      <div style="border-top:1px solid #2A2A3E;padding-top:20px;margin-top:20px;">
        <p style="color:#888888;font-size:13px;line-height:1.8;margin:0;">
          &#10003; <strong style="color:#CCCCCC;">550+ \u00c9chos</strong> pr\u00eats \u00e0 partager votre lien au S\u00e9n\u00e9gal<br>
          &#10003; Premi\u00e8re campagne d\u00e8s <strong style="color:#CCCCCC;">10 000 FCFA</strong><br>
          &#10003; R\u00e9sultats mesurables en <strong style="color:#CCCCCC;">24 heures</strong><br>
          &#10003; Vous ne payez que les <strong style="color:#CCCCCC;">clics v\u00e9rifi\u00e9s</strong>
        </p>
      </div>

      <div style="background:#0F0F1F;border-radius:8px;padding:16px;margin-top:20px;">
        <p style="color:#1ABC9C;font-size:13px;margin:0;line-height:1.6;">
          Facebook Ads au S\u00e9n\u00e9gal : 200-500 FCFA/clic<br>
          Tamtam : ~50-125 FCFA/clic v\u00e9rifi\u00e9 \u2014 jusqu'\u00e0 75% moins cher
        </p>
      </div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <p style="color:#666666;font-size:12px;line-height:1.6;">
        Tamtam \u2014 Le bouche-\u00e0-oreille digital au S\u00e9n\u00e9gal<br>
        <a href="https://www.tamma.me" style="color:#D35400;text-decoration:none;">tamma.me</a> &middot;
        <a href="mailto:support@tamma.me" style="color:#888888;text-decoration:none;">support@tamma.me</a>
      </p>
      <p style="color:#444444;font-size:11px;">Built by Lupandu</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const authClient = createClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: admin } = await supabase.from("users").select("role").eq("id", session.user.id).single();
  if (!admin || (admin.role !== "superadmin" && admin.role !== "admin")) {
    return NextResponse.json({ error: "Non autoris\u00e9" }, { status: 401 });
  }

  const { leadId } = await request.json();
  if (!leadId) return NextResponse.json({ error: "leadId requis" }, { status: 400 });

  const { data: lead } = await supabase
    .from("brand_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead || !lead.email) {
    return NextResponse.json({ error: "Lead invalide ou sans email" }, { status: 400 });
  }

  // Check not already invited in last 7 days
  const { data: recent } = await supabase
    .from("sent_emails")
    .select("id")
    .eq("user_id", leadId)
    .eq("email_type", "lead_invitation")
    .gte("sent_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json({ error: "D\u00e9j\u00e0 invit\u00e9 cette semaine" }, { status: 409 });
  }

  const firstName = lead.contact_name?.split(" ")[0] || lead.business_name || "Bonjour";

  await sendEmail({
    to: lead.email,
    subject: `${lead.business_name || firstName}, cr\u00e9ez votre compte Tamtam \u2014 2,000 FCFA offerts!`,
    html: generateInvitationEmail({
      firstName,
      companyName: lead.business_name,
      signupUrl: "https://www.tamma.me/signup/brand",
    }),
  });

  await supabase.from("brand_leads").update({
    status: "invited",
    invited_at: new Date().toISOString(),
    invitation_count: (lead.invitation_count || 0) + 1,
  }).eq("id", leadId);

  await supabase.from("sent_emails").insert({
    user_id: leadId,
    email_type: "lead_invitation",
  });

  return NextResponse.json({ success: true });
}
