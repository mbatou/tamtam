import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyUnsubscribe } from "@/lib/notifications/unsubscribe-token";
import {
  CATEGORY_LABELS,
  SUPPRESSIBLE_CATEGORIES,
  type EmailCategory,
  type EmailPrefs,
} from "@/lib/notifications/channel-policy";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe. No login required — the HMAC in the link is the proof
 * of ownership, which is the whole point: someone drowning in email must be
 * able to stop it from the email itself.
 *
 * Suppressible categories only. An unsubscribe link never appears on account
 * or payment mail, and this route refuses to opt anyone out of those even if
 * the category is passed by hand.
 */

function page(title: string, body: string, ok: boolean): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Tamtam</title></head>
<body style="margin:0;background:#F5F3EE;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:64px auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="width:40px;height:40px;border-radius:10px;background:${ok ? "#1ABC9C" : "#D35400"};margin-bottom:24px;"></div>
    <h1 style="margin:0 0 12px;font-size:22px;color:#0A0A1A;">${title}</h1>
    <p style="margin:0;color:#555;line-height:1.6;font-size:15px;">${body}</p>
    <p style="margin-top:32px;font-size:13px;color:#999;">
      Tamtam · <a href="https://www.tamma.me" style="color:#D35400;text-decoration:none;">tamma.me</a>
    </p>
  </div>
</body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get("u");
  const token = params.get("t");
  const rawCategory = params.get("c");

  if (!userId || !token) {
    return page("Lien invalide", "Ce lien de désabonnement est incomplet.", false);
  }

  let category: EmailCategory | undefined;
  if (rawCategory) {
    if (!SUPPRESSIBLE_CATEGORIES.includes(rawCategory as EmailCategory)) {
      return page(
        "Catégorie non désactivable",
        "Les emails de compte et de paiement ne peuvent pas être désactivés : ils sont la trace de ce qui arrive à votre compte et à votre argent.",
        false,
      );
    }
    category = rawCategory as EmailCategory;
  }

  if (!verifyUnsubscribe(userId, token, category)) {
    return page("Lien invalide", "Ce lien de désabonnement n'est pas valide ou a été modifié.", false);
  }

  const supabase = createServiceClient();

  if (category) {
    const { data: user } = await supabase
      .from("users")
      .select("email_prefs")
      .eq("id", userId)
      .single();

    const prefs: EmailPrefs = { ...((user?.email_prefs as EmailPrefs | null) || {}), [category]: false };

    const { error } = await supabase.from("users").update({ email_prefs: prefs }).eq("id", userId);
    if (error) {
      console.error("[unsubscribe] category update failed:", error.message);
      return page("Erreur", "Impossible d'enregistrer votre choix. Réessayez ou écrivez à support@tamma.me.", false);
    }

    return page(
      "C'est fait",
      `Vous ne recevrez plus les emails « ${CATEGORY_LABELS[category]} ». Les emails concernant votre compte et vos paiements continuent d'arriver.`,
      true,
    );
  }

  const { error } = await supabase
    .from("users")
    .update({ email_optout: true, email_optout_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[unsubscribe] global optout failed:", error.message);
    return page("Erreur", "Impossible d'enregistrer votre choix. Réessayez ou écrivez à support@tamma.me.", false);
  }

  return page(
    "Vous êtes désabonné",
    "Vous ne recevrez plus d'emails de campagnes, de résumés ni de conseils. Les emails concernant votre compte et vos paiements continuent d'arriver — ils sont la trace de votre argent.",
    true,
  );
}
